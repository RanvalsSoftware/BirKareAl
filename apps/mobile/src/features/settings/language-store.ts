/** Türkçe-only compatibility helper. A language picker is intentionally not exposed yet. */
export function useCopy() {
  return (turkish: string, _english: string) => turkish;
}
