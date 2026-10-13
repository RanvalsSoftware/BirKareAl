import { requireOptionalNativeModule } from 'expo';

type SubjectLiftModule = {
  /** Resolves a file URI of a transparent PNG, or null when no subject is found. */
  liftSubject(uri: string): Promise<string | null>;
};

const nativeModule = requireOptionalNativeModule<SubjectLiftModule>('BirKareSubjectLift');

/**
 * Separates the product from its background on the device, without a network
 * call or credits. Returns null wherever the system cannot do it (older OS
 * versions, Android, the simulator), and callers fall back to the raw photo.
 */
export async function liftProductSubject(uri: string): Promise<string | null> {
  if (!nativeModule) return null;
  try {
    return (await nativeModule.liftSubject(uri)) ?? null;
  } catch {
    return null;
  }
}
