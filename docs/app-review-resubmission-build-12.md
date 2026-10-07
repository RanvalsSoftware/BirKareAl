# App Review resubmission working draft — BirKare Studio 1.0 (12)

This package is for the App Store Connect submission that replaces rejected build 11. Do not submit it until the TestFlight checklist at the end of this document has been completed on the production backend.

> **Status: pending verification.** This document is not evidence that a test passed or that a screenshot was captured. Paste the Review Notes below only after every applicable checklist item is complete for the exact binary attached to the submission. Remove every bracketed pending line before sending it to Apple.

## Draft App Review Notes (paste only after the release gate passes)

Hello App Review,

Thank you for the additional guidance regarding Guideline 4.3(b). We substantially redesigned the product and its first-run experience for build 1.0 (12).

BirKare Studio is now a focused product and catalog image workspace for small sellers and boutique businesses. It is no longer presented as a general AI photo/filter app. The primary workflow is:

1. Create a named product project.
2. Add a product source photo and select its product category.
3. Choose an intended commercial use: marketplace catalog, product page, social ad, or web hero.
4. Choose a product scene and channel format.
5. Select quality and 1, 2, or 4 real output alternatives.
6. Review a server-confirmed credit quote before generation.
7. Manage real completed outputs and revisions in the Product Catalog.

Key changes implemented since build 11 are listed below. Claims marked pending must be verified in the exact TestFlight build before they are included in App Store Connect:

- Replaced the previous consumer-photo onboarding with a three-step product workflow.
- Rebuilt the home screen as a merchant/product dashboard.
- Added named product projects and commercial-use planning.
- Added 1/2/4-output generation using the server quote and generation APIs. **[Pending: verify all counts with the production AI provider.]**
- Rebuilt Projects as a responsive Product Catalog while preserving existing user history.
- Added an iPad two-pane product workspace and responsive catalog grids. **[Pending: verify portrait, landscape, Split View, and Dynamic Type on the submitted binary.]**
- Reframed result editing around product-safe revisions such as preserving labels, softening shadows, cleaning backgrounds, and leaving copy space.
- A completed result is rendered only from a real server output; local/sample result fallback was removed. **[Pending: confirm the App Store build also contains no route to legacy demo portraits or consumer-photo tools.]**
- Updated purchase copy to describe credits without promising unlimited generation. **[Pending: verify every submitted product, localized price, restore action, and entitlement in StoreKit sandbox.]**
- Updated the app name, permission text, and store-metadata drafts to match the product-studio concept. **[Pending: finish enabled-locale QA and capture screenshots from this exact TestFlight build.]**

### Review path

Use the tested review account supplied in the App Review Information section. Before submission, confirm that it can sign in on the review build and has at least 40 credits.

1. Sign in.
2. On **Studio**, tap **New product shoot**.
3. Enter a product name, choose the supplied product source image, and select a category.
4. Choose an intended use, scene, output format, quality, and 2 alternatives.
5. Confirm image rights and tap **Generate**.
6. Open **Catalog** to see the named product project and its completed output.
7. Open the project to compare alternatives, request a product-safe revision, save, or share.

### Purchases and account controls

- **Credits** tab: credit packs, Pro plans, restore purchases, and subscription management.
- **Account → Settings**: support, legal documents, privacy information, and account deletion.
- Store product identifiers are configured in App Store Connect/RevenueCat and are returned with live localized prices. AI generation always shows the server-confirmed credit cost before the user starts it.

### Image and privacy behavior

- The user explicitly selects each product image and confirms usage rights before upload.
- Creating an account does not require consent to process face data. If a user later selects a face-processing feature, the app requests the separate explicit consent immediately before that feature can process the image.
- Images are processed only for the user-requested generation, moderation, storage, and support functions described in the privacy notice.
- The app does not access Face ID or TrueDepth data and does not create a biometric face template, embedding, or face-recognition database.
- The app does not present a locally composited or demo image as a completed AI result.

**[Pending before submission: test the exact build on iPhone and the 11-inch iPad class in portrait and landscape, then replace this line with a factual device-test statement.]** Please contact us through App Review messages if any additional information is needed.

## Reply to the current Resolution Center message

Hello,

Thank you for clarifying the considerations under Guideline 4.3. We understood that a metadata or visual reskin would not be sufficient, so we did not resubmit the previous experience.

We rebuilt the app around a distinct small-seller product workflow: named product projects, product category and commercial-use planning, product-specific scenes, four channel formats, server-priced 1/2/4 alternatives, a product catalog with version history, and product-safe revision/export tools. We also replaced the old onboarding and removed local/demo result fallbacks. The iPad experience now uses a responsive workspace instead of a stretched phone layout.

We are completing TestFlight testing of build 1.0 (12) and will resubmit only after the production generation and purchase flows have been verified. The new screenshots, description, and Review Notes will match this product-studio experience.

Best regards,
BirKare Studio Team

## Screenshot sequence

Capture every screenshot from build 12 with one consistent, rights-cleared product and real server data. Do not use the previous football, celebrity, portrait, filter, or demo assets.

1. Merchant dashboard — “One product photo, multiple sales-ready alternatives.”
2. Product setup — product name, source-photo checklist, and product category.
3. Shoot planning — intended use and product scene.
4. Output planning — format, quality, and 1/2/4 alternatives with credit quote.
5. Real results — multiple server outputs for the same product.
6. Product Catalog — named projects and version history.
7. iPad landscape — two-pane source and settings workspace.
8. Credits — live products and clear non-unlimited billing language.

Required device sets: current 6.9-inch iPhone size and 13-inch iPad size. Also visually verify the 11-inch iPad Air class used in the rejection.

## TestFlight gate before submission

- [ ] Production build identifies itself as `1.0 (12)` and `BirKare Studio`.
- [ ] Production/staging backend refuses `AI_PROVIDER=fake`; production generation is enabled with the real provider.
- [ ] Fresh install shows only the product-focused onboarding, source-image rights acknowledgment, and sign-in.
- [ ] Account creation succeeds without face-data consent; each retained face-processing feature requests separate just-in-time explicit consent before processing.
- [ ] The submitted App Store build has no customer route to legacy Explore, portrait demos, filters, trends, beauty, gender-change, or generic create tools.
- [ ] Login, registration, password/reset e-mails, and support e-mails consistently identify the product as `BirKare Studio`.
- [ ] Reviewer account can sign in and has at least 40 credits.
- [ ] Product photo upload, quote, 1/2/4 alternatives, queue, completion, and real-result display work end to end.
- [ ] No source image, tint, or placeholder is displayed as a completed AI result after an error.
- [ ] Named product appears in Catalog; alternative selection and new revision persist.
- [ ] Save, share, report, and compare use real server assets.
- [ ] Credit packs, every submitted Pro product, restore, and entitlement sync work in StoreKit sandbox.
- [ ] Account deletion, support, privacy, and terms links work.
- [ ] iPhone plus iPad 11-inch portrait, landscape, Dynamic Type, and Split View have been checked.
- [ ] Turkish and English receive a full device QA; German, Spanish, and Arabic receive localization/RTL review before their store listings are enabled.
- [ ] App Store screenshots were captured from this exact TestFlight build and contain no unlicensed people, logos, trademarks, or demo UI.
- [ ] Review credentials and any special access instructions were added only in App Store Connect, never committed to the repository.
