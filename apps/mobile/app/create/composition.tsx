import { Redirect } from 'expo-router';

/** Framing controls are now part of the unified editor. */
export default function CompositionScreen() {
  return <Redirect href="/create/settings" />;
}
