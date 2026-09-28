# Trend quality v10

## Scope

Ten previously inconsistent trends now use a source-first photographic prompt contract and the same style artwork that their mobile cards display. Editorial Cover keeps its prior prompt byte-for-byte for supported strengths. Background replacement, ordinary filters, studio workflows, sharing UI, subscriptions and price tables are not changed.

The server copies of the artwork live under `packages/ai/assets/trends`. The Dockerfiles already copy `packages`, so these references are available without a new image-download service, client-controlled URLs, public image links, extra native SDKs or a database migration. Their bytes must match the mobile artwork; a regression test enforces this.

## Input roles and priorities

The first image is the primary user identity, the optional second person is a separate identity, and the server-controlled style reference is appended last. The style reference supplies scene/material/light direction, not the model's face, body or person count. An optional user reference remains distinct from both identities and the style artwork.

Source-supported identity and anatomy outrank catalogue poses. Wider framing means additional environment rather than fabricated limbs. The two-person prompts no longer contain conflicting solo-only instructions. Background overrides can replace the default location without changing identity or forcing a new neck/shoulder pose. Neon Night uses a modern digital finish, distinct from the 80s/90s analog presets.

## Output review and bounded repair

Standard and HD guarded trends undergo a separate multimodal quality review before output assets are published. The reviewer receives the actual source/reference/candidate images and a structured response contract. Confirmed material defects are restricted to head crop, anatomy, observable identity drift, wrong person count, plastic skin and missing/wrong style. The reviewer must not identify people or treat natural source asymmetry, source head tilt or valid analog texture as a defect.

PASS publishes the output. RETRY authorizes at most one additional render request, for only the rejected output subset, from the original source photos and with the same model, quality, dimensions and intensity. A second failed review rejects the result. UNSURE, malformed/refused responses, missing references, network failures and provider errors do not authorize an extra render.

Cancellation/deletion is rechecked before review, after review and before a repair render. The existing worker's `startedAt` guard prevents a queue redelivery from restarting paid generation after an interrupted attempt. Failed quality checks use the existing refund/finalization path; rejected candidates are not saved as READY output assets.

Preview remains one render with the true style reference and has no extra quality-review or repair call. Editorial and all nontrend flows retain their existing provider path.

## Credits and operating cost

The user's quoted credit amount is unchanged. Repair stays inside the existing generation and its single reservation; there is no second reservation or second user charge. Two-person pricing remains the existing +1 credit per output. Existing refund logic releases the reservation if final quality is rejected.

This does not make the extra API work free to the operator. Added style input can increase input usage, Standard/HD review adds text/vision usage, and a confirmed-defect repair can add one image-render request. The worst case is two render requests and two review requests per job, not an unbounded loop. Successful completion logs aggregate render attempts, repaired-image count, separate reviewer usage and safe request IDs without source photos or raw prompts. Rendering usage is aggregated in the existing provider usage field. The new review may add latency; production cost and rejection rates require monitoring.

## Validation and limits

Automated tests use synthetic fixtures and mocked provider transports; they verify actual request roles/bytes, prompt invariants, strict review parsing, repair bounds, unchanged model/quality, cancellation, one credit settlement and refund replay safety. They do not prove that every real-world face or generated pose is flawless. The reviewer is a model and can miss a defect or reject an acceptable image. Real visual validation remains necessary on representative source photos.

No live database reset, production credential access or production deployment is part of this code change. API and worker builds must use the same reviewed source revision for the new pipeline to execute in production. Existing `OPENAI_TEXT_MODEL` must support image input and strict JSON-schema output; the default is `gpt-4.1-mini`. A reviewer configuration failure is reported as unavailable, not as a passed review or a reason to regenerate.

## Official design references

- https://openai.com/tr-TR/index/introducing-4o-image-generation/ — historical introduction and limitations; not an instruction to switch the configured production image model.
- https://developers.openai.com/api/docs/guides/image-prompting — explicit invariants, edit scope, reference roles and targeted iterations.
- https://developers.openai.com/api/docs/guides/image-generation — image editing and output controls.
- https://developers.openai.com/api/docs/guides/structured-outputs — bounded, schema-validated reviewer responses.
