import { Redirect } from 'expo-router';

/**
 * App Store build 12 is intentionally focused on the product/catalog workflow.
 * The previous implementation is preserved under src/features/legacy/routes.
 */
export default function LegacyRouteRedirect() {
  return <Redirect href="/studio" />;
}
