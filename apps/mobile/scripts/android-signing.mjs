import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseUploadCredentials, verifyUploadKeyListing } from './android-release.mjs';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const privateRoot = resolve(mobileRoot, '../../.local-credentials/android');
const credentialsFile = resolve(privateRoot, 'credentials.json');
const keystoreFile = resolve(privateRoot, 'upload-keystore.jks');
const certificateFile = resolve(privateRoot, 'upload-certificate.pem');
const action = process.argv[2];

function keytool(args, password) {
  const result = spawnSync('keytool', ['-J-Duser.language=en', ...args], {
    env: { ...process.env, BIRKARE_KEYTOOL_PASSWORD: password },
    encoding: 'utf8',
  });
  if (result.error || result.status !== 0)
    throw new Error(
      'keytool işlemi tamamlanamadı. Java kurulumunu ve özel kimlik dosyalarını kontrol edin; hiçbir anahtarın üzerine yazılmadı.',
    );
  return result.stdout;
}

try {
  if (!['create', 'fingerprint'].includes(action))
    throw new Error('Kullanım: node scripts/android-signing.mjs create | fingerprint');
  if (action === 'create') {
    // Upload keys must never be silently replaced: Play updates require continuity.
    if (existsSync(credentialsFile) || existsSync(keystoreFile))
      throw new Error(
        'Upload anahtarı veya kimlik dosyası zaten var. Üzerine yazılmadı. fingerprint komutunu kullanın.',
      );
    mkdirSync(privateRoot, { recursive: true, mode: 0o700 });
    chmodSync(privateRoot, 0o700);
    const password = randomBytes(36).toString('base64url');
    const alias = 'birkare-upload';
    keytool(
      [
        '-genkeypair',
        '-noprompt',
        '-keystore',
        keystoreFile,
        '-storetype',
        'JKS',
        '-alias',
        alias,
        '-keyalg',
        'RSA',
        '-keysize',
        '3072',
        '-validity',
        '10000',
        '-dname',
        'CN=BirKare AI Android Upload',
        '-storepass:env',
        'BIRKARE_KEYTOOL_PASSWORD',
        '-keypass:env',
        'BIRKARE_KEYTOOL_PASSWORD',
      ],
      password,
    );
    chmodSync(keystoreFile, 0o600);
    // Same schema as EAS local credentials; paths resolve from apps/mobile.
    writeFileSync(
      credentialsFile,
      JSON.stringify(
        {
          android: {
            keystore: {
              keystorePath: '../../.local-credentials/android/upload-keystore.jks',
              keystorePassword: password,
              keyAlias: alias,
              keyPassword: password,
            },
          },
        },
        null,
        2,
      ) + '\n',
      { mode: 0o600, flag: 'wx' },
    );
    keytool(
      [
        '-exportcert',
        '-rfc',
        '-keystore',
        keystoreFile,
        '-alias',
        alias,
        '-storepass:env',
        'BIRKARE_KEYTOOL_PASSWORD',
        '-file',
        certificateFile,
      ],
      password,
    );
    console.log('Yeni upload anahtarı oluşturuldu; özel anahtar ve şifre ekrana yazılmadı.');
    console.log(`Özel yedek dizini: ${privateRoot}`);
    console.log(`Paylaşılabilir sertifika: ${certificateFile}`);
  }
  const credentials = parseUploadCredentials(readFileSync(credentialsFile, 'utf8'));
  const listing = keytool(
    [
      '-list',
      '-v',
      '-keystore',
      resolve(mobileRoot, credentials.keystorePath),
      '-alias',
      credentials.keyAlias,
      '-storepass:env',
      'BIRKARE_KEYTOOL_PASSWORD',
    ],
    credentials.keystorePassword,
  );
  verifyUploadKeyListing(listing);
  for (const label of ['SHA1', 'SHA256']) {
    const fingerprint = listing.match(new RegExp(`\\b${label}: ([A-F0-9:]+)`))?.[1];
    if (!fingerprint) throw new Error('Sertifika parmak izi doğrulanamadı.');
    console.log(`${label}: ${fingerprint}`);
  }
  console.log('Bu upload sertifikasıdır; Google Play app-signing sertifikası farklı olabilir.');
} catch (error) {
  // Never dump a keytool command, JSON credentials or process environment.
  console.error(error instanceof Error ? error.message : 'İmzalama hazırlığı başarısız.');
  process.exitCode = 1;
}
