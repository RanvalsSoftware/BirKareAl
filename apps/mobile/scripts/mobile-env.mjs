import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { parseEnv } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const {
  PUBLIC_MOBILE_KEYS,
  assertKnownPublicKeys,
  resolvePublicMobileConfig,
} = require('../config/public-env.cjs');
const mobileDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Intentionally an allowlist, not a server-secret denylist. Future backend
// variables are excluded by default, even if inherited from the invoking shell.
const TOOLING_ENV_KEYS = new Set([
  'PATH',
  'HOME',
  'USER',
  'LOGNAME',
  'SHELL',
  'TMPDIR',
  'TMP',
  'TEMP',
  'TERM',
  'COLORTERM',
  'NO_COLOR',
  'FORCE_COLOR',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'CI',
  'NODE_ENV',
  'NODE_OPTIONS',
  'NODE_EXTRA_CA_CERTS',
  'SSL_CERT_FILE',
  'JAVA_HOME',
  'JAVA_OPTS',
  'ANDROID_HOME',
  'ANDROID_SDK_ROOT',
  'ANDROID_NDK_HOME',
  'ANDROID_NDK_ROOT',
  'GRADLE_USER_HOME',
  'GRADLE_OPTS',
  'COREPACK_HOME',
  'COREPACK_ENABLE_PROJECT_SPEC',
  'PNPM_HOME',
  'XDG_CACHE_HOME',
  'npm_config_cache',
  'npm_config_registry',
  'npm_config_user_agent',
  'npm_execpath',
  'npm_node_execpath',
  'EXPO_TOKEN',
  'EXPO_OFFLINE',
  'EXPO_DEBUG',
  'EXPO_USE_LOCAL_CLI',
  'EAS_BUILD',
  'EAS_BUILD_PROFILE',
  'EAS_BUILD_PLATFORM',
  'EAS_BUILD_RUNNER',
  'EAS_BUILD_ID',
  'EAS_ENVIRONMENT',
  'BIRKARE_RELEASE_BUILD',
  'BIRKARE_ANDROID_RELEASE',
  // Signing credentials are available to the native build only; app.config.ts
  // never includes these unprefixed values in its public extra config.
  'BIRKARE_ANDROID_KEYSTORE_PATH',
  'BIRKARE_ANDROID_KEY_ALIAS',
  'BIRKARE_ANDROID_KEYSTORE_PASSWORD',
  'BIRKARE_ANDROID_KEY_PASSWORD',
]);
const LEGACY_GOOGLE_IDS = Object.freeze({
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'GOOGLE_WEB_CLIENT_ID',
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'GOOGLE_IOS_CLIENT_ID',
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: 'GOOGLE_ANDROID_CLIENT_ID',
});

/**
 * A central dotenv is parsed as data; none of it is assigned to process.env.
 * Only public config plus explicitly permitted build tools reaches the child.
 * @param {Record<string, string | undefined>} source
 * @param {Record<string, string | undefined>} inherited
 * @param {{appEnv?: string, release?: boolean}} [options]
 */
export function buildMobileEnvironment(source, inherited, options = {}) {
  assertKnownPublicKeys(source);
  assertKnownPublicKeys(inherited);
  const child = {};
  for (const key of TOOLING_ENV_KEYS) {
    if (inherited[key] !== undefined) child[key] = inherited[key];
  }
  for (const key of PUBLIC_MOBILE_KEYS) {
    const value = source[key] ?? inherited[key];
    if (value !== undefined) child[key] = value;
  }
  for (const [publicKey, legacyKey] of Object.entries(LEGACY_GOOGLE_IDS)) {
    if (!child[publicKey]?.trim()) {
      const value = source[legacyKey]?.trim() || inherited[legacyKey]?.trim();
      if (value) child[publicKey] = value;
    }
  }
  if (options.appEnv) child.EXPO_PUBLIC_APP_ENV = options.appEnv;
  if (options.release) child.BIRKARE_RELEASE_BUILD = '1';
  // Expo must not reload a second app-local .env and undo central selection.
  child.EXPO_NO_DOTENV = '1';
  const config = resolvePublicMobileConfig(child, { release: options.release });
  child.EXPO_PUBLIC_APP_ENV = config.appEnv;
  child.EXPO_PUBLIC_API_BASE_URL = config.apiBaseUrl;
  child.EXPO_PUBLIC_SUPPORT_EMAIL = config.supportEmail;
  return child;
}

/** @param {string[]} args */
export function parseArguments(args) {
  const separator = args.indexOf('--');
  const flags = separator === -1 ? args : args.slice(0, separator);
  const command = separator === -1 ? [] : args.slice(separator + 1);
  let envFile;
  let appEnv;
  let release = false;
  let check = false;
  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === '--release') release = true;
    else if (flag === '--check') check = true;
    else if (flag === '--env-file' || flag === '--app-env') {
      const value = flags[++index];
      if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
      if (flag === '--env-file') envFile = value;
      else appEnv = value;
    } else {
      throw new Error(
        'Supported options: --env-file <path> --app-env <environment> --release --check -- <command>',
      );
    }
  }
  if (!envFile) throw new Error('--env-file is required; no dotenv is loaded implicitly.');
  if (!check && !command.length) throw new Error('Provide -- <command> or use --check.');
  if (check && command.length) throw new Error('--check does not accept a command.');
  return { envFile, appEnv, release, check, command };
}

/** @param {string[]} args */
export async function main(args) {
  const options = parseArguments(args);
  let source;
  try {
    source = parseEnv(readFileSync(resolve(options.envFile), 'utf8'));
  } catch {
    throw new Error(
      'Cannot read the explicit --env-file; check that the file exists and is readable.',
    );
  }
  const env = buildMobileEnvironment(source, process.env, options);
  if (options.check) {
    console.log(
      'Mobile environment validated. Only allowlisted public config and build tooling are forwarded; no values printed.',
    );
    return 0;
  }
  // No shell: arguments are passed literally, with a predictable mobile cwd.
  const child = spawn(options.command[0], options.command.slice(1), {
    cwd: mobileDirectory,
    env,
    stdio: 'inherit',
    shell: false,
  });
  return await new Promise((resolveExit, reject) => {
    child.once('error', () =>
      reject(
        new Error('Unable to start the mobile command; check the executable and tooling PATH.'),
      ),
    );
    child.once('exit', (code, signal) => resolveExit(code ?? (signal ? 1 : 0)));
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Mobile environment validation failed.');
    process.exitCode = 1;
  }
}
