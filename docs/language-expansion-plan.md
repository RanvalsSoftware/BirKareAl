# BirKare AI — German, Spanish and Arabic rollout plan

## Scope and locale choices

The release target is five application languages:

| Product language | Runtime code | App Store localization | Google Play localization | Direction | Current state |
| ---------------- | ------------ | ---------------------- | ------------------------ | --------- | ------------- |
| Turkish          | `tr`         | Turkish                | `tr-TR`                  | LTR       | Active        |
| English          | `en`         | English (U.S.)         | `en-US`                  | LTR       | Active        |
| German           | `de`         | German                 | `de-DE`                  | LTR       | Active        |
| Spanish          | `es`         | Spanish (Spain)        | `es-ES`                  | LTR       | Active        |
| Arabic           | `ar`         | Arabic                 | `ar`                     | RTL       | Active        |

Spanish (Spain) is the first Spanish locale so the same reviewed copy can be used consistently in both stores. Spanish (Mexico) / Latin America is a separate localization and should be added later only with regionally reviewed copy.

Store country is not used as the runtime language. Explicit in-app choice wins; otherwise the ordered OS per-app/device language list is used. Unsupported languages fall back to English.

## What is prepared in the repository

- German, Spanish and Arabic native camera/photo permission strings.
- German, Spanish and Arabic named language/error/plural messages.
- App Store and Google Play metadata drafts within platform character limits.
- Complete runtime dictionaries containing all 1,538 developer-owned dynamic/static copy entries per language.
- Scripts that refresh kits without discarding completed translations, validate key and placeholder integrity, and import only complete reviewed kits.
- A store metadata validator covering all five listings.

All five languages are exposed in `supportedLocales`, locale resolution, i18next resources and the
in-app picker. German, Spanish and Arabic were machine translated, passed key/placeholder validation,
and still require native-speaker editorial review before final store marketing claims are published.

## Activation gates

### Gate 1 — copy review

Run `pnpm prepare:language-kits`, then have a native-speaking reviewer fill only the `translation` value in:

- `docs/translations/de-DE.copy.json`;
- `docs/translations/es-ES.copy.json`;
- `docs/translations/ar.copy.json`.

The reviewer must preserve keys, URLs, product identifiers and all `{{placeholders}}`. Marketing and legal wording needs business/legal approval; language review alone is not legal approval.

After review:

```bash
pnpm validate:language-kits
pnpm import:language-kits
```

### Gate 2 — runtime activation commit

Completed: runtime selection, locale formatting, i18next resources, native supported locales,
backend `Accept-Language`, transactional e-mail localization and regression tests are active. These
native locale declarations require a new iOS/Android binary.

### Gate 3 — Arabic RTL QA

Arabic activation requires more than translated text:

- cold launch with the device/app language set to Arabic;
- in-app switch into and out of Arabic, including the required app reload if native layout direction changes;
- navigation/back arrows, horizontal lists, sliders and before/after comparisons;
- mixed Arabic and Latin text, e-mail fields, URLs, numbers, credit balances and store prices;
- truncation on small phones and large accessibility fonts;
- TalkBack/VoiceOver order and labels;
- camera/photo permission dialogs, share sheet and system settings.

Do not use `scaleX: -1` on images or mirror user photos. Directional icons and navigation motion may mirror; generated/source images must not.

### Gate 4 — release candidate

Build a fresh IPA/AAB, test all five system languages and all five explicit picker choices, then capture localized screenshots. Verify Google/Apple login, registration, password reset, purchases, generation, result reporting, sharing and account deletion in each language.

## Store delivery

Store listing files:

- `docs/store-metadata.tr.json`
- `docs/store-metadata.en-US.json`
- `docs/store-metadata.de-DE.json`
- `docs/store-metadata.es-ES.json`
- `docs/store-metadata.ar.json`

Run `pnpm validate:store-localizations` before copying fields into either console. Store metadata may be added before the new binary, but do not publish a listing that claims the installed app supports a language until the release binary containing that language is approved and available.

Each localization needs its own real screenshots. Reusing Turkish screenshots on the German, Spanish or Arabic listing is not a complete localization.

The current privacy-policy URL is Turkish. Publish reviewed German, Spanish, Arabic and English privacy-policy pages, then replace the URL in each locale's App Store and Google Play fields before submission.
