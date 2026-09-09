/** Existing native image decoder writes a new JPEG copy; the selected original is untouched. */
export async function sourceImageAsJpeg(uri: string): Promise<string> {
  const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
  const result = await manipulateAsync(uri, [], { compress: 0.94, format: SaveFormat.JPEG });
  return result.uri;
}
