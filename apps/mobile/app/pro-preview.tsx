import { Redirect } from 'expo-router';

/** Design-preview paywalls are never part of the customer-facing app graph. */
export default function ProPreviewRedirect() {
  return <Redirect href="/pro" />;
}
