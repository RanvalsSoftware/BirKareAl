import { useWindowDimensions } from 'react-native';

/**
 * The app is designed as a single readable column. On iPad (portrait or
 * landscape) the root layout centres that column instead of stretching
 * phone-sized cards across the whole display.
 */
export const APP_COLUMN_MAX_WIDTH = 760;

/** Width actually available to screens inside the centred app column. */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(width, APP_COLUMN_MAX_WIDTH);
}

/** True on tablet-class windows (iPad, large Android tablets). */
export function useIsWideWindow(): boolean {
  const { width } = useWindowDimensions();
  return width >= 768;
}
