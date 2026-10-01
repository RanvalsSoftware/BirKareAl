# BirKare application translation handoff

The source catalogue contains developer-owned application copy. Generate or refresh the three reviewer kits with:

```bash
pnpm prepare:language-kits
```

This creates:

- `de-DE.copy.json` for German;
- `es-ES.copy.json` for Spanish (Spain);
- `ar.copy.json` for Arabic.

Only edit each entry's `translation` value. Never edit `key` or `source`, and preserve every `{{placeholder}}` exactly. The preparation command keeps existing translations when the source catalogue is refreshed.

After translation or native-speaker edits, run:

```bash
pnpm validate:language-kits
pnpm import:language-kits
```

The import command refuses to create runtime dictionaries if any value is empty, any source key is missing, or an interpolation placeholder changed. It writes `copy-de.json`, `copy-es.json` and `copy-ar.json` under the mobile i18n locale directory. These dictionaries are active in the runtime. Current machine translations must still receive native-speaker editorial and device QA before final store publication.

Store metadata and native permission strings are separate because their limits and review surfaces differ. They are already staged in `docs/store-metadata.*.json` and `apps/mobile/locales/*.json`.

Arabic requires additional device review: cold launch in RTL, navigation direction, back arrows, mixed Arabic/Latin text, e-mail fields, numbers, prices, image comparisons and share sheets. Do not activate Arabic based only on JSON validation.
