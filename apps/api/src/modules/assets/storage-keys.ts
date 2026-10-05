/** Both keys can exist if upload promotion or pending-object cleanup failed. */
export function assetStorageKeys(key: string): string[] {
  const match = /^(.*\/)(pending|original)\.(jpg|png|webp)$/u.exec(key);
  if (!match) return [key];
  return [`${match[1]}pending.${match[3]}`, `${match[1]}original.${match[3]}`];
}
