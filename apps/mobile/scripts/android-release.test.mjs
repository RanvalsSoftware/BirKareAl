import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createRequire } from 'node:module';
import {
  certificateFingerprint,
  validateCredentials,
  parseUploadCredentials,
  verifyUploadKeyListing,
} from './android-release.mjs';

const require = createRequire(import.meta.url);
const { signingContents } = require('../plugins/with-android-release-signing.js');

test('rejects missing signing credentials without echoing private input', () => {
  assert.throws(
    () => validateCredentials({ password: 'private-sentinel' }),
    (error) => error.message.includes('incomplete') && !error.message.includes('private-sentinel'),
  );
});
test('rejects the Android debug alias', () => {
  assert.throws(
    () =>
      validateCredentials({
        android: {
          keystore: {
            keystorePath: 'example.jks',
            keystorePassword: 'test-only',
            keyAlias: 'androiddebugkey',
            keyPassword: 'test-only',
          },
        },
      }),
    /Debug signing is forbidden/,
  );
});
test('accepts a dedicated upload key without changing it', () => {
  const keystore = {
    keystorePath: 'upload.jks',
    keystorePassword: 'test-only',
    keyAlias: 'upload',
    keyPassword: 'test-only',
  };
  assert.equal(validateCredentials({ android: { keystore } }), keystore);
});
test('parses a complete certificate fingerprint and rejects unsigned output', () => {
  const sha256 = Array(32).fill('AB').join(':');
  assert.equal(certificateFingerprint(`Certificate fingerprints:\n SHA256: ${sha256}\n`), sha256);
  assert.throws(() => certificateFingerprint('Not a signed jar file'), /Cannot verify/);
  assert.throws(() => certificateFingerprint('SHA256: AB:CD'), /Cannot verify/);
});
test('malformed credential JSON cannot leak a password through SyntaxError', () => {
  assert.throws(
    () => parseUploadCredentials('{"password":private-sentinel}'),
    (error) => !error.message.includes('private-sentinel') && error.message.includes('invalid'),
  );
});
test('rejects a renamed debug certificate and public-only certificate entry', () => {
  const sha256 = Array(32).fill('AB').join(':');
  const listing = `Entry type: PrivateKeyEntry\nOwner: CN=BirKare AI Android Upload\nSHA256: ${sha256}`;
  assert.equal(verifyUploadKeyListing(listing), sha256);
  assert.throws(
    () =>
      verifyUploadKeyListing(
        listing.replace('CN=BirKare AI Android Upload', 'CN=Android Debug, O=Android, C=US'),
      ),
    /non-debug/,
  );
  assert.throws(
    () => verifyUploadKeyListing(listing.replace('PrivateKeyEntry', 'trustedCertEntry')),
    /non-debug/,
  );
});
test('signing prebuild plugin is idempotent and preserves other native content', () => {
  const source = 'android { /* existing user native config */ }\n';
  const first = signingContents(source);
  assert.equal(signingContents(first), first);
  assert.ok(first.startsWith(source));
  assert.ok(
    first.includes('android.buildTypes.release.signingConfig = android.signingConfigs.release'),
  );
  assert.ok(first.includes('debug signing is forbidden'));
  assert.ok(first.includes('System.getenv("EAS_BUILD") != "true"'));
});
test('an incomplete generated native block fails instead of deleting unrelated contents', () => {
  assert.throws(
    () => signingContents('// @generated begin birkare-release-signing\nother config'),
    /Incomplete/,
  );
});
