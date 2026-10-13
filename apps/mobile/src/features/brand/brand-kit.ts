import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

import { useAuthStore } from '@/features/auth/auth-store';

/** The seller's identity as it appears on exported catalogs and shared listings. */
export type BrandKit = {
  shopName: string;
  tagline: string;
  phone: string;
  instagram: string;
  website: string;
  accent: string;
  /** File name inside the app's documents directory. */
  logoFile: string | null;
};

export const BRAND_ACCENTS = [
  '#B8860B',
  '#1F2937',
  '#0F766E',
  '#B91C1C',
  '#1D4ED8',
  '#7C3AED',
] as const;

const EMPTY: BrandKit = {
  shopName: '',
  tagline: '',
  phone: '',
  instagram: '',
  website: '',
  accent: BRAND_ACCENTS[0],
  logoFile: null,
};

let owner: string | null = null;
let snapshot: BrandKit = EMPTY;
const listeners = new Set<() => void>();

function kitFile(userId: string): File {
  return new File(Paths.document, `brand-kit-${userId}.json`);
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function parse(raw: string): BrandKit {
  const value = JSON.parse(raw) as Record<string, unknown>;
  const accent = BRAND_ACCENTS.find((item) => item === value.accent) ?? EMPTY.accent;
  return {
    shopName: text(value.shopName, 60),
    tagline: text(value.tagline, 90),
    phone: text(value.phone, 30),
    instagram: text(value.instagram, 40),
    website: text(value.website, 80),
    accent,
    logoFile:
      typeof value.logoFile === 'string' && /^brand-logo-[\w.-]+$/.test(value.logoFile)
        ? value.logoFile
        : null,
  };
}

function load(userId: string | null) {
  owner = userId;
  snapshot = EMPTY;
  if (!userId) return;
  try {
    const file = kitFile(userId);
    if (file.exists) snapshot = parse(file.textSync());
  } catch {
    // A missing or damaged file simply means no brand kit yet.
  }
}

/** The brand kit is stored on this device, separately for each account. */
export function saveBrandKit(userId: string, kit: BrandKit): void {
  const file = kitFile(userId);
  if (!file.exists) file.create();
  file.write(JSON.stringify(kit));
  owner = userId;
  snapshot = kit;
  listeners.forEach((listener) => listener());
}

/** Copies a picked image into the app's documents and returns its stored file name. */
export function importBrandLogo(userId: string, sourceUri: string, previous: string | null): string {
  const extension = /\.(png|jpe?g|webp|heic)(?:$|\?)/i.exec(sourceUri)?.[1]?.toLowerCase() ?? 'jpg';
  const name = `brand-logo-${userId}-${Date.now()}.${extension}`;
  new File(sourceUri).copy(new File(Paths.document, name));
  removeBrandLogo(previous);
  return name;
}

export function removeBrandLogo(logoFile: string | null): void {
  if (!logoFile) return;
  try {
    const file = new File(Paths.document, logoFile);
    if (file.exists) file.delete();
  } catch {
    // Nothing to clean up.
  }
}

/** Removes the kit and its logo from this device, for example when the account is deleted. */
export function deleteBrandKit(userId: string): void {
  try {
    const file = kitFile(userId);
    if (file.exists) {
      removeBrandLogo(parse(file.textSync()).logoFile);
      file.delete();
    }
  } catch {
    // Nothing stored, or already gone.
  }
  if (owner === userId) {
    snapshot = EMPTY;
    listeners.forEach((listener) => listener());
  }
}

export function brandLogoUri(kit: BrandKit): string | null {
  if (!kit.logoFile) return null;
  try {
    const file = new File(Paths.document, kit.logoFile);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/** Contact details in the order they are printed, skipping empty ones. */
export function brandContactLines(kit: BrandKit): string[] {
  const instagram = kit.instagram.trim().replace(/^@+/, '');
  return [kit.phone.trim(), instagram ? `@${instagram}` : '', kit.website.trim()].filter(Boolean);
}

/** One line to sign shared listing text with, or null when no shop name is set. */
export function brandSignature(kit: BrandKit): string | null {
  const name = kit.shopName.trim();
  if (!name) return null;
  return [name, ...brandContactLines(kit)].join(' · ');
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBrandKit(): BrandKit {
  const userId = useAuthStore((store) => store.user?.id ?? null);
  if (owner !== userId) load(userId);
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );
}
