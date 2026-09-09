import { create } from 'zustand';
import {
  apiRequest,
  configureSessionBridge,
  invalidateSessionRequests,
  type ApiError,
} from '@/api/client';
import { clearRefreshToken, getRefreshToken, saveRefreshToken } from './token-store';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  role: 'USER' | 'SUPPORT' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
};

type AuthSessionResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type PendingGoogleRegistrationResponse = {
  needsProfileCompletion: true;
  pendingToken: string;
  profile: PendingSocialProfile;
};

export type PendingSocialProfile = {
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export type GoogleSignInResult =
  | { kind: 'authenticated' }
  | { kind: 'profile_completion_required'; pendingToken: string; profile: PendingSocialProfile };

export type CompleteSocialRegistrationInput = {
  acceptedAge: boolean;
  acceptedAiDisclosure: boolean;
  acceptedImageRights: boolean;
  acceptedPrivacy: boolean;
  acceptedTerms: boolean;
  birthYear: number;
  firstName: string;
  lastName: string;
  pendingToken: string;
};

function requiresSocialProfileCompletion(
  input: AuthSessionResponse | PendingGoogleRegistrationResponse,
): input is PendingGoogleRegistrationResponse {
  return 'needsProfileCompletion' in input && input.needsProfileCompletion;
}

type AuthState = {
  state: 'booting' | 'anonymous' | 'authenticated';
  accessToken: string | null;
  user: AuthUser | null;
  bootstrap: () => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<GoogleSignInResult>;
  linkGoogleAccount: (idToken: string) => Promise<void>;
  completeSocialRegistration: (input: CompleteSocialRegistrationInput) => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (input: { accessToken: string; refreshToken?: string; user?: AuthUser }) => void;
  clearSession: () => void;
};

let bootstrapInFlight: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  state: 'booting',
  accessToken: null,
  user: null,
  async bootstrap() {
    if (bootstrapInFlight) return bootstrapInFlight;
    if (get().state !== 'booting') return;
    // React can mount the entry screen twice during development. Restore once
    // so duplicate bootstraps cannot replay a single-use refresh token.
    bootstrapInFlight = (async () => {
      try {
        const refreshToken = await getRefreshToken();
        if (get().state !== 'booting') return;
        if (!refreshToken) {
          set({ state: 'anonymous', accessToken: null, user: null });
          return;
        }
        const session = await apiRequest<AuthSessionResponse>(
          '/v1/auth/refresh',
          { method: 'POST', body: JSON.stringify({ refreshToken }) },
          { authenticated: false },
        );
        if (get().state !== 'booting') return;
        invalidateSessionRequests();
        await saveRefreshToken(session.refreshToken);
        if (get().state !== 'booting') return;
        set({ state: 'authenticated', accessToken: session.accessToken, user: session.user });
      } catch (error) {
        if (get().state !== 'booting') return;
        // Even inaccessible/failed SecureStore cleanup must leave the launch
        // gate; otherwise the app remains on a blank "booting" screen forever.
        invalidateSessionRequests();
        set({ state: 'anonymous', accessToken: null, user: null });
        // A cold launch during a temporary outage must not erase a valid
        // saved session. Only an explicit server rejection invalidates it.
        const status = (error as ApiError | null)?.status;
        if (status === 400 || status === 401 || status === 403)
          await clearRefreshToken().catch(() => undefined);
      }
    })().finally(() => {
      bootstrapInFlight = null;
    });
    return bootstrapInFlight;
  },
  async signIn(input) {
    const session = await apiRequest<AuthSessionResponse>(
      '/v1/auth/login',
      { method: 'POST', body: JSON.stringify(input) },
      { authenticated: false },
    );
    invalidateSessionRequests();
    await saveRefreshToken(session.refreshToken);
    set({ state: 'authenticated', accessToken: session.accessToken, user: session.user });
  },
  async signInWithGoogle(idToken) {
    const result = await apiRequest<AuthSessionResponse | PendingGoogleRegistrationResponse>(
      '/v1/auth/google',
      { method: 'POST', body: JSON.stringify({ idToken }) },
      { authenticated: false },
    );
    if (requiresSocialProfileCompletion(result)) {
      return {
        kind: 'profile_completion_required',
        pendingToken: result.pendingToken,
        profile: result.profile,
      };
    }

    invalidateSessionRequests();
    await saveRefreshToken(result.refreshToken);
    set({ state: 'authenticated', accessToken: result.accessToken, user: result.user });
    return { kind: 'authenticated' };
  },
  async completeSocialRegistration(input) {
    const session = await apiRequest<AuthSessionResponse>(
      '/v1/auth/social/complete',
      {
        method: 'POST',
        body: JSON.stringify({
          pendingToken: input.pendingToken,
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: `${input.birthYear}-01-01`,
          locale: 'tr-TR',
          consent: {
            termsAccepted: input.acceptedTerms,
            privacyAccepted: input.acceptedPrivacy,
            aiDisclosureAccepted: input.acceptedAiDisclosure,
            ageConfirmed: input.acceptedAge,
            ownImageOrPermissionConfirmed: input.acceptedImageRights,
          },
        }),
      },
      { authenticated: false },
    );
    invalidateSessionRequests();
    await saveRefreshToken(session.refreshToken);
    set({ state: 'authenticated', accessToken: session.accessToken, user: session.user });
  },
  async linkGoogleAccount(idToken) {
    if (get().state !== 'authenticated')
      throw new Error('Google hesabını bağlamak için önce giriş yapmalısın.');
    await apiRequest('/v1/auth/google/link', { method: 'POST', body: JSON.stringify({ idToken }) });
  },
  async signOut() {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await apiRequest('/v1/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      invalidateSessionRequests();
      set({ state: 'anonymous', accessToken: null, user: null });
      await clearRefreshToken();
      // The auth store must not eagerly import UI: Google button -> auth-ui ->
      // useReducedMotion -> appearance-store -> auth-store forms a launch cycle.
      await import('./google-sign-in')
        .then(({ signOutOfNativeGoogleIfAvailable }) => signOutOfNativeGoogleIfAvailable())
        .catch(() => undefined);
    }
  },
  setSession(input) {
    const user = input.user ?? get().user;
    if (user?.id !== get().user?.id) invalidateSessionRequests();
    set({ accessToken: input.accessToken, user, state: user ? 'authenticated' : get().state });
  },
  clearSession() {
    invalidateSessionRequests();
    set({ state: 'anonymous', accessToken: null, user: null });
  },
}));

configureSessionBridge({
  getAccessToken: () => useAuthStore.getState().accessToken,
  setSession: (session) => useAuthStore.getState().setSession(session),
  clearSession: () => useAuthStore.getState().clearSession(),
});
