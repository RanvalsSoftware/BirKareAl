import { Redirect } from 'expo-router';

/** Filters now live directly below the source photo in the single editor. */
export default function StyleScreen() {
  return <Redirect href="/create/settings" />;
}
