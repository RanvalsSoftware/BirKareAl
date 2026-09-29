# Google Android: EAS and Play on one backend

## Compatibility fix

`GOOGLE_ANDROID_CLIENT_ID` now accepts either the existing single OAuth client ID or a comma-separated list of explicitly trusted Android OAuth client IDs. It is a backend setting, not a fingerprint and not a mobile SDK setting. The existing configuration schema and Compose interpolation already pass this string through; no new environment variable, Compose key, database migration or mobile native dependency is required.

Single-ID installations behave as before. An unset value does not implicitly trust any Android client. Entries are trimmed, deduplicated and compared exactly. Invalid entries, empty list elements, wildcards, fingerprints, more than six entries or more than 512 characters fail closed at service construction. No trust is inferred from a shared Google Cloud project-number prefix.

Signature (RS256/JWKS), issuer, audience, token age, expiration, subject and verified-email checks remain unchanged. The `azp` check is not removed: an EAS or Play authorized presenter must match an explicitly configured ID. Tokens with multiple audiences still require a valid authorized presenter. Native audience compatibility is preserved for configured client IDs.

This addresses the case where Google account selection succeeds but the backend rejects an EAS token because only the Play Android client was allowed. It does not diagnose a native `DEVELOPER_ERROR`, wrong installed APK certificate, wrong API URL, network failure or account-linking requirement. No actual failing token was available during this change, so the reported login failure's root cause is not yet confirmed.

## Operator-supplied client mapping (29 September 2026)

- EAS/APK (`Android client 1`): `197394599682-0nmn4oppa3v23p9dv4ovdneh4fpq2sbv.apps.googleusercontent.com`.
- Play (`BirKare AI Android Play`): `197394599682-cubvb4e2ajh6621djsrkv3dhbgo6j15p.apps.googleusercontent.com`.
- Web ID remains `197394599682-a7897p3rt9i9ocgbmou6pbf1p3hjrepv.apps.googleusercontent.com`.
- iOS ID remains `197394599682-vnlj6rrm6iq3nshtnikohohiq0q9gpa2.apps.googleusercontent.com`.

These are public client identifiers, not secrets. Trust only clients intentionally authorized for this backend. A production deployment that should not accept development builds can keep only the Play value.

## Deployment

Build and deploy the updated API code BEFORE relying on the list. Older API images treat the full comma-separated string as one ID and will not recognize either Android presenter.

In Portainer Environment variables, update the EXISTING key once:

```env
GOOGLE_ANDROID_CLIENT_ID=197394599682-cubvb4e2ajh6621djsrkv3dhbgo6j15p.apps.googleusercontent.com,197394599682-0nmn4oppa3v23p9dv4ovdneh4fpq2sbv.apps.googleusercontent.com
```

Keep the existing Compose interpolation:

```yaml
GOOGLE_ANDROID_CLIENT_ID: ${GOOGLE_ANDROID_CLIENT_ID:-}
```

No other OAuth, storage, SMTP, subscription or database values need changing for this fix. Updating an environment value alone does not update code inside an old image. If the stack uses one IMAGE_TAG for API and worker, publish both images under the chosen release tag before updating that tag. Worker behavior itself is unchanged by this authentication fix.

Do NOT copy the backend comma-separated list into `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`. Mobile build diagnostics expect ONE Android client for the relevant build. Android native `GoogleSignin.configure()` must continue using the Web client ID. Do not put backend environment files in the mobile build.

After deployment, re-run the in-container three-client environment check and attempt Google login from the EAS APK and from the Play-installed app. Record only the safe error code and request ID if it fails; do not share ID tokens, passwords, keystores or service-account keys. A new mobile build is not required solely for this backend verifier change.

## Validation

Regression tests use locally signed synthetic ID tokens and a local JWKS (no live Google credentials). They cover both Android presenters against the Web audience, iOS compatibility, optional/single/duplicate settings, shared config parsing, unknown same-project clients, foreign audiences, invalid signatures, missing multi-audience azp, expiry, issuer, email verification and malformed lists. Live Google sign-in and Portainer deployment remain operator checks.

## Official references

- https://developers.google.com/identity/sign-in/android/backend-auth
- https://developers.google.com/identity/openid-connect/openid-connect
