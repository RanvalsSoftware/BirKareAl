import { Redirect } from 'expo-router';

/** The shoot is planned on a single workspace screen; older links land there. */
export default function StudioIndexRedirect() {
  return <Redirect href={'/studio/product' as never} />;
}
