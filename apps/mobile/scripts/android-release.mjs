import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildMobileEnvironment } from './mobile-env.mjs';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const privateRoot = resolve(mobileRoot, '../../.local-credentials/android');

export function validateCredentials(value) {
  const key = value?.android?.keystore;
  if (
    !key ||
    ['keystorePath', 'keystorePassword', 'keyAlias', 'keyPassword'].some(
      (field) => typeof key[field] !== 'string' || !key[field].trim(),
    )
  )
    throw new Error('Upload credentials are incomplete; no credential values were printed.');
  if (key.keyAlias.toLowerCase() === 'androiddebugkey')
    throw new Error('Debug signing is forbidden for a BirKare release.');
  return key;
}

export function certificateFingerprint(output) {
  const fingerprint = output.match(/\bSHA256: ([A-F0-9:]+)/)?.[1];
  if (!fingerprint || fingerprint.split(':').length !== 32)
    throw new Error('Cannot verify the upload certificate SHA-256.');
  return fingerprint;
}

export function parseUploadCredentials(contents) {
  try {
    return validateCredentials(JSON.parse(contents));
  } catch {
    // JSON SyntaxError can quote the offending input, including a password.
    throw new Error('Private upload credentials are invalid; no values were printed.');
  }
}

export function verifyUploadKeyListing(listing) {
  if (
    !/Entry type: PrivateKeyEntry/.test(listing) ||
    /Owner:.*\bCN=Android Debug(?:,|$)/im.test(listing)
  )
    throw new Error('A private, non-debug upload key is required.');
  return certificateFingerprint(listing);
}

async function run(command, args, env, { cwd = mobileRoot, capture = false } = {}) {
  const child = spawn(command, args, {
    cwd,
    env,
    shell: false,
    stdio: capture ? 'pipe' : 'inherit',
  });
  let output = '';
  if (capture)
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
  // Captured output may involve signing tools. Never echo their stderr on failure.
  if (capture) child.stderr.resume();
  return await new Promise((accept, reject) => {
    child.once('error', () =>
      reject(
        new Error(
          'Cannot start a required Android build tool. Check Java, Android SDK and dependencies.',
        ),
      ),
    );
    child.once('exit', (code) =>
      code === 0
        ? accept(output)
        : reject(new Error('Android build/verification command failed; no release was delivered.')),
    );
  });
}

export async function main(args) {
  if (args.some((arg) => arg !== '--check'))
    throw new Error('Usage: node scripts/android-release.mjs [--check]');
  // Also sanitize direct invocation; backend secrets must not reach Metro/Gradle.
  const env = buildMobileEnvironment({}, process.env, { release: true });
  env.BIRKARE_ANDROID_RELEASE = '1';
  // This is a local runner. An inherited EAS flag must not disable our signing guard.
  delete env.EAS_BUILD;
  for (const name of [
    'BIRKARE_ANDROID_KEYSTORE_PATH',
    'BIRKARE_ANDROID_KEY_ALIAS',
    'BIRKARE_ANDROID_KEYSTORE_PASSWORD',
    'BIRKARE_ANDROID_KEY_PASSWORD',
  ])
    delete env[name];
  let key;
  try {
    key = parseUploadCredentials(readFileSync(resolve(privateRoot, 'credentials.json'), 'utf8'));
  } catch {
    throw new Error(
      'Cannot read private upload credentials. Run android-signing.mjs create only for a confirmed first upload.',
    );
  }
  const keystorePath = resolve(mobileRoot, key.keystorePath);
  if (!existsSync(keystorePath))
    throw new Error('Upload keystore file is missing. Restore the original private backup.');
  const nativeEnv = {
    ...env,
    BIRKARE_ANDROID_KEYSTORE_PATH: keystorePath,
    BIRKARE_ANDROID_KEY_ALIAS: key.keyAlias,
    BIRKARE_ANDROID_KEYSTORE_PASSWORD: key.keystorePassword,
    BIRKARE_ANDROID_KEY_PASSWORD: key.keyPassword,
  };
  const tool = (name) => (env.JAVA_HOME ? resolve(env.JAVA_HOME, 'bin', name) : name);
  const expectedFingerprint = verifyUploadKeyListing(
    await run(
      tool('keytool'),
      [
        '-J-Duser.language=en',
        '-list',
        '-v',
        '-keystore',
        keystorePath,
        '-alias',
        key.keyAlias,
        '-storepass:env',
        'BIRKARE_ANDROID_KEYSTORE_PASSWORD',
      ],
      nativeEnv,
      { capture: true },
    ),
  );
  console.log('Release environment and non-debug upload key validated. No secret values printed.');
  if (args.includes('--check')) return;

  const expo = resolve(mobileRoot, 'node_modules/expo/bin/cli');
  // No clean: preserve existing native modifications. Signing plugin is idempotent.
  // Signing secrets are intentionally NOT provided to the prebuild/config phase.
  await run(
    process.execPath,
    [
      expo,
      'prebuild',
      '--platform',
      'android',
      '--no-install',
      '--no-clean',
      '--skip-dependency-update',
      'react,react-native',
    ],
    env,
  );
  await run(
    resolve(mobileRoot, 'android/gradlew'),
    [':app:bundleRelease', '--no-daemon', '--console=plain'],
    nativeEnv,
    { cwd: resolve(mobileRoot, 'android') },
  );
  const bundle = resolve(mobileRoot, 'android/app/build/outputs/bundle/release/app-release.aab');
  if (!existsSync(bundle)) throw new Error('Gradle did not produce the expected AAB.');
  const verification = await run(
    tool('jarsigner'),
    ['-J-Duser.language=en', '-verify', bundle],
    env,
    { capture: true },
  );
  if (!verification.includes('jar verified.') || /unsigned entries/i.test(verification))
    throw new Error('The AAB signature could not be verified completely.');
  const actualFingerprint = certificateFingerprint(
    await run(tool('keytool'), ['-J-Duser.language=en', '-printcert', '-jarfile', bundle], env, {
      capture: true,
    }),
  );
  if (actualFingerprint !== expectedFingerprint)
    throw new Error('AAB signer does not match the private upload key. Do not upload.');
  const output = resolve(
    mobileRoot,
    '../../artifacts/android',
    new Date().toISOString().replaceAll(':', '-'),
  );
  mkdirSync(output, { recursive: true });
  const artifact = resolve(output, 'birkare-release.aab');
  copyFileSync(bundle, artifact);
  const sha256 = createHash('sha256').update(readFileSync(artifact)).digest('hex');
  writeFileSync(
    resolve(output, 'release.json'),
    JSON.stringify(
      {
        artifact: 'birkare-release.aab',
        sha256,
        uploadCertificateSha256: actualFingerprint,
        appEnv: env.EXPO_PUBLIC_APP_ENV,
        apiBaseUrl: env.EXPO_PUBLIC_API_BASE_URL,
        signed: true,
        uploaded: false,
        nextCheck:
          'Verify package, versionCode and target SDK from the AAB manifest in Play Console/bundletool before distributing.',
      },
      null,
      2,
    ) + '\n',
    { flag: 'wx' },
  );
  console.log(`Verified signed AAB: ${artifact}`);
  console.log(`SHA-256: ${sha256}`);
  console.log('No Play upload or distribution was performed.');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Android release preparation failed.');
    process.exitCode = 1;
  }
}
