# BirKare AI — five-language update

## Branch boundary

Implementation branch: `feature7langague_update`.
Source branch: `feat/human-photorealism-source-fidelity`.
Branch-point commit: `8427c463384d74d02e298e9ffe38f4bb4f1a89e5`.
The source branch is not advanced or merged by this work. All language commits are isolated on the requested feature branch.

## Implemented behavior

The app follows an explicit local `system | tr | en | de | es | ar` preference. System mode selects the first supported language in the OS-provided ordered locale list, otherwise English. It does not request location permission, inspect an IP address or infer language from the store country. Explicit user choices override system changes and persist locally. Native storage uses SecureStore; the web implementation uses localStorage. Storage failure does not hold the app indefinitely behind initialization: reads are bounded and the UI can report a failed preference save.

The shared `expo-localization`, `i18next` and `react-i18next` integration resolves language before exposing the first app screens. App foreground events refresh system locales. Language switching changes the presentation without keying/remounting the navigator or clearing forms, image selections, sessions or generation jobs.

Settings includes a language page with Use device language, Turkish, English, German, Spanish and Arabic. A compact picker is available from the login surface. The language route is shared rather than duplicating route trees.

## Translation coverage and stable contracts

More than 1,400 bundled developer-owned copy entries cover app screens, onboarding, catalogs, generation settings and results, sharing, paywall, settings, support and the existing in-app legal text. Named keys and a compatibility dictionary coexist so existing `useCopy` callers can migrate without breaking the application. All bundles ship with the app; rendering translated text makes no external translation or paid AI request.

Legacy labels that double as selection tokens are translated only at explicit presentation boundaries. Catalog, scene, filter, trend, product and entitlement identifiers remain unchanged. The UI does not translate user-created project names, chat content, uploaded photos or free-form generation instructions. Language changes must not submit another generation, alter the selected model or change credit prices. Store-localized purchase price strings remain authoritative; UI language is not a currency conversion rule.

Date and number formatting uses the resolved locale. Credit/image count messages support singular and plural English forms. Catalog text getters and the Studio catalog memo are refreshed when the language changes. Validation messages are resolved when parsing rather than cached in the language active at module import.

The old `generations/[id]` intermediate page now redirects with the actual generation ID instead of sending every ID to a fixed demo result. Existing deep-link paths are retained.

## API errors and transactional mail

Mobile requests, including refresh requests, carry the resolved `Accept-Language`. Known protocol error codes have English presentation mappings, while unknown errors use a safe generic message. The error code, details and request ID are retained; provider secrets or arbitrary payload text are never interpreted as translation keys. Network errors resolve their language when the failure occurs.

Registration sends the resolved locale instead of a fixed Turkish locale. The API parses a bounded weighted language header for presentation only. Verification, resend, password-reset and deletion-link mail choose the supported request language, falling back to the account locale and the existing Turkish template. This preference never grants authorization or overwrites an account's stored locale just because a request header changed.

Mail localization reuses the original validated recipients, URLs, tokens and expiry rules. SMTP transport, token single-use checks, Google/Apple verification, account recovery and anti-enumeration protections remain intact.

## Native configuration and deployment boundary

The app config declares all five supported locales, enables RTL support and includes localized iOS permission resources. The dependency lockfile includes the localization dependencies. These native additions require a new Android/iOS binary; an existing binary cannot gain the new native locale declarations solely through a JavaScript update. The feature still needs a release build and real-device validation before store publication.

API deployment is required for the localized email behavior. No database migration, database reset, credential change, subscription product change or production deployment is part of this implementation. Existing environment secrets stay in their current authorized deployment environments. This change does not upload an AAB/IPA or edit App Store/Play Store listings, external website text or store screenshots.

Storefront country is deliberately not an application-language input. App Store Connect and Google Play listing localizations control the product page, while the installed app follows its explicit preference or the OS per-app/device language list. The Turkish and English store copy sources, console mapping and release test matrix are documented in [store-localization.md](store-localization.md).

German, Spanish (Spain) and Arabic are active runtime languages with complete validated dictionaries,
native permission copy, localized transactional e-mail and store metadata drafts. Their current copy is
machine translated and still needs native-speaker editorial review plus Arabic RTL device QA before
final store publication. See [language-expansion-plan.md](language-expansion-plan.md).

In-app legal draft warnings remain visible. Translation of the current draft is not legal approval or a claim that those documents are ready for publication. Text embedded in image assets and third-party/OS surfaces needs separate visual review; user photos are deliberately not rewritten.

## Validation

The persistent Language validation workflow is read-only. It installs with the frozen lockfile, generates the Prisma client, typechecks the mobile/API workspaces, runs the full mobile test suite and runs backend language/authentication/mail/billing/generation regression tests.

Tests cover ordered device-language selection, unsupported-language fallback, manual override, preference hydration/write failure, live catalog updates, dynamic form messages, dictionary key/interpolation coverage, preservation of source photos and flow values, code-based error presentation, exact mail token/link preservation, both Android Google clients and the existing generation credit/refund contracts.

One-time branch-scoped source-conversion jobs were used during implementation and their write-enabled workflow definitions have been removed. The retained audit/migration scripts are development tooling, not startup hooks or database migrations. Normal validation never commits changes.

Automated tests use synthetic fixtures and mocked native/provider interfaces. They are not real-device visual tests, live Google sign-in, real purchases, live email delivery or App Store/Play approval. Small screens, large text, fresh installs in all five languages, device-language changes, Arabic RTL, existing-account login and a complete generation/share flow must still be checked in the native release candidate.
