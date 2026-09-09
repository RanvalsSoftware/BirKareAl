#!/usr/bin/env node
/**
 * Read-only, pre-push audit of LOCAL Docker images. Does not log secret values.
 * Scans config/history and uncompressed regular-file contents in EVERY saved
 * layer, including files deleted by later layers. Nested archives, encrypted
 * content and unknown/encoded credentials are outside this audit's coverage.
 * Usage: node scripts/audit-release-images.mjs IMAGE [IMAGE ...]
 */
import { spawn, execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const secretKeys = new Set([
  'OPENAI_API_KEY',
  'JWT_ACCESS_SECRET',
  'PASSWORD_PEPPER',
  'DB_PASSWORD',
  'REDIS_PASSWORD',
  'R2_SECRET_ACCESS_KEY',
]);
const secretSources = ['.env', '.local-credentials/deployment/portainer.env'];
const knownPlaceholder =
  /^(?:\.{3}|<[^>]+>|\$\{[^}]+\}|(?:change|replace)[-_ ]?me(?:[-_ ].*)?|(?:your|example|placeholder)[-_ ].*|(?:development|dev|local|test)[-_ ].*(?:secret|password|pepper|key).*)$/i;

export function parseKnownSecrets(source) {
  const entries = [];
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || !secretKeys.has(match[1])) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    if (value.length >= 12 && !knownPlaceholder.test(value))
      entries.push({ name: match[1], value });
  }
  return entries;
}

export function createSecretScanner(entries) {
  const needles = entries.flatMap(({ name, value }) =>
    [...new Set([value, encodeURIComponent(value), JSON.stringify(value).slice(1, -1)])].map(
      (text) => ({
        name,
        bytes: Buffer.from(text),
      }),
    ),
  );
  const overlap = Math.max(0, ...needles.map(({ bytes }) => bytes.length - 1));
  let tail = Buffer.alloc(0);
  const found = new Set();
  return {
    found,
    push(chunk) {
      const bytes = tail.length ? Buffer.concat([tail, chunk]) : chunk;
      for (const needle of needles) if (bytes.includes(needle.bytes)) found.add(needle.name);
      tail = overlap
        ? Buffer.from(bytes.subarray(Math.max(0, bytes.length - overlap)))
        : Buffer.alloc(0);
    },
  };
}

export function forbiddenFileKind(path, workingDir = '/srv/app') {
  const normalized = path.replace(/^\.\//, '').replace(/^\//, '');
  const basename = normalized.split('/').at(-1) ?? '';
  if (/(^|\/)\.local-credentials(?:\/|$)/.test(normalized)) return 'credential-directory';
  if (/\.(?:jks|keystore|p12|pfx)$/i.test(basename)) return 'keystore';
  if (/^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)(?:$|\.)/.test(basename) && !basename.endsWith('.pub'))
    return 'ssh-private-key';
  const appRoot = workingDir.replace(/^\/+|\/+$/g, '');
  const applicationFile =
    appRoot && normalized.startsWith(`${appRoot}/`) && !normalized.includes('/node_modules/');
  if (!applicationFile) return null;
  if (
    /(?:^\.env(?:\.|$)|\.env(?:\.|$))/.test(basename) &&
    !/\.(?:example|sample|template)$/.test(basename)
  )
    return 'application-env-file';
  if (basename === 'credentials.json') return 'application-credentials';
  if (/\.(?:key|pem)$/i.test(basename)) return 'application-key-file';
  return null;
}

export function configuredSecretNames(environment) {
  return environment.flatMap((entry) => {
    const split = entry.indexOf('=');
    if (split < 0) return [];
    const name = entry.slice(0, split);
    const value = entry.slice(split + 1);
    const secretName =
      secretKeys.has(name) ||
      /(?:SECRET|PASSWORD|TOKEN|API_KEY|PRIVATE_KEY|DATABASE_URL|REDIS_URL)$/.test(name);
    return secretName && value && !knownPlaceholder.test(value) ? [name] : [];
  });
}

async function captured(command, args) {
  try {
    const result = await execFileAsync(command, args, {
      encoding: 'buffer',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 300_000,
    });
    return result.stdout;
  } catch {
    // Never propagate command output: Docker history/config may contain secrets.
    throw new Error('COMMAND_FAILED');
  }
}

async function streamed(command, args, consume, outputPath) {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.resume();
  const timeout = setTimeout(() => child.kill('SIGKILL'), 300_000);
  const exited = new Promise((accept, reject) => {
    child.once('error', () => reject(new Error('COMMAND_FAILED')));
    child.once('close', (code) => (code === 0 ? accept() : reject(new Error('COMMAND_FAILED'))));
  });
  try {
    if (outputPath) {
      await Promise.all([
        pipeline(child.stdout, createWriteStream(outputPath, { mode: 0o600, flags: 'wx' })),
        exited,
      ]);
    } else {
      child.stdout.on('data', consume);
      await exited;
    }
  } finally {
    clearTimeout(timeout);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}

async function loadSecrets() {
  const entries = [];
  let filesRead = 0;
  for (const relative of secretSources) {
    try {
      entries.push(...parseKnownSecrets(await readFile(join(repository, relative), 'utf8')));
      filesRead += 1;
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('SECRET_SOURCE_UNREADABLE');
    }
  }
  return { entries, filesRead };
}

async function auditImage(image, entries) {
  let stage = 'inspect';
  let temporary;
  const failures = new Set();
  const foundSecrets = new Set();
  const forbiddenFiles = new Map();
  let layerCount = 0;
  const absorb = (scanner) => scanner.found.forEach((name) => foundSecrets.add(name));
  try {
    const inspection = await captured('docker', ['image', 'inspect', image]);
    const [metadata] = JSON.parse(inspection.toString('utf8'));
    if (metadata.Os !== 'linux' || metadata.Architecture !== 'amd64')
      failures.add('PLATFORM_NOT_LINUX_AMD64');
    if (metadata.Config?.User?.split(':')[0] !== 'node') failures.add('RUNTIME_USER_NOT_NODE');
    const envSecrets = configuredSecretNames(metadata.Config?.Env ?? []);
    envSecrets.forEach((name) => foundSecrets.add(name));
    if (envSecrets.length) failures.add('SECRET_ENV_DEFAULT');
    const configScanner = createSecretScanner(entries);
    configScanner.push(inspection);
    absorb(configScanner);
    stage = 'history';
    const history = await captured('docker', [
      'history',
      '--no-trunc',
      '--format',
      '{{json .}}',
      metadata.Id,
    ]);
    const historyScanner = createSecretScanner(entries);
    historyScanner.push(history);
    absorb(historyScanner);
    temporary = await mkdtemp(join(tmpdir(), 'birkare-image-audit-'));
    const archive = join(temporary, 'image.tar');
    stage = 'save';
    // Pin the inspected image ID so a concurrent tag update cannot change the audit target.
    await captured('docker', ['image', 'save', '--output', archive, metadata.Id]);
    stage = 'manifest';
    const manifest = JSON.parse(
      (await captured('tar', ['-xOf', archive, 'manifest.json'])).toString('utf8'),
    );
    if (!Array.isArray(manifest) || manifest.length !== 1 || !Array.isArray(manifest[0].Layers))
      throw new Error('INVALID_ARCHIVE_MANIFEST');
    for (const [index, layer] of manifest[0].Layers.entries()) {
      if (
        typeof layer !== 'string' ||
        layer.startsWith('/') ||
        layer.split('/').includes('..') ||
        layer.includes('\0')
      )
        throw new Error('INVALID_LAYER_PATH');
      stage = 'layer-export';
      const layerPath = join(temporary, `layer-${index}.tar`);
      await streamed('tar', ['-xOf', archive, layer], null, layerPath);
      stage = 'layer-list';
      const names = await captured('tar', ['-tf', layerPath]);
      for (const name of names.toString('utf8').split('\n')) {
        // Runtime WORKDIR is apps/api or apps/worker; audit the ENTIRE workspace,
        // including shared packages and sibling apps, not only that subdirectory.
        const kind = forbiddenFileKind(name, '/srv/app');
        if (kind) forbiddenFiles.set(kind, (forbiddenFiles.get(kind) ?? 0) + 1);
      }
      const scanner = createSecretScanner(entries);
      scanner.push(names);
      // -O streams regular-file contents to stdout without extracting paths to disk.
      stage = 'layer-contents';
      await streamed('tar', ['-xOf', layerPath], (chunk) => scanner.push(chunk));
      absorb(scanner);
      layerCount += 1;
      await rm(layerPath);
    }
    if (foundSecrets.size) failures.add('SECRET_VALUE_OR_ENV_FOUND');
    if (forbiddenFiles.size) failures.add('FORBIDDEN_FILE_FOUND');
    console.log(
      JSON.stringify({
        image,
        imageId: metadata.Id,
        result: failures.size ? 'FAIL' : 'PASS',
        checkedLayers: layerCount,
        platform: `${metadata.Os}/${metadata.Architecture}`,
        runtimeUserIsNode: metadata.Config?.User?.split(':')[0] === 'node',
        failureCodes: [...failures].sort(),
        secretFieldNames: [...foundSecrets].sort(),
        forbiddenFileCounts: Object.fromEntries(forbiddenFiles),
      }),
    );
    return failures.size === 0;
  } catch {
    console.log(
      JSON.stringify({
        image,
        result: 'ERROR',
        stage,
        checkedLayers: layerCount,
        code: 'AUDIT_INCOMPLETE',
      }),
    );
    return false;
  } finally {
    // Only this invocation's generated Docker archives are removed.
    if (temporary?.startsWith(`${resolve(tmpdir())}${sep}birkare-image-audit-`))
      await rm(temporary, { recursive: true, force: true });
  }
}

async function main() {
  const images = process.argv.slice(2);
  if (!images.length || images.some((image) => !/^[A-Za-z0-9][A-Za-z0-9._/:@-]*$/.test(image))) {
    console.error('Usage: node scripts/audit-release-images.mjs IMAGE [IMAGE ...]');
    process.exitCode = 2;
    return;
  }
  try {
    const { entries, filesRead } = await loadSecrets();
    console.log(
      JSON.stringify({
        audit: 'local-image-pre-push',
        secretSourceFilesRead: filesRead,
        comparedSecretCount: entries.length,
        comparedSecretFieldNames: [...new Set(entries.map(({ name }) => name))].sort(),
        coverage:
          'config, history, every layer regular-file contents; no nested archives or unknown credentials',
      }),
    );
    if (!filesRead || !entries.length) {
      console.error(JSON.stringify({ result: 'ERROR', code: 'NO_KNOWN_LOCAL_SECRETS_TO_COMPARE' }));
      process.exitCode = 1;
      return;
    }
    for (const image of images) if (!(await auditImage(image, entries))) process.exitCode = 1;
  } catch {
    console.error(JSON.stringify({ result: 'ERROR', code: 'AUDIT_SETUP_FAILED' }));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await main();
