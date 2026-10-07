import { Redirect } from 'expo-router';

/** Legacy deep links now join the single product-focused onboarding path. */
export default function LegacyGalleryRedirect() {
  return <Redirect href="/" />;
}
