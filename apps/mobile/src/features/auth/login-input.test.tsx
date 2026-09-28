import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signInWithApple: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

vi.mock('@/features/auth/auth-store', () => ({
  useAuthStore: (selector: (state: typeof mocks) => unknown) => selector(mocks),
}));
vi.mock('@/features/auth/apple-sign-in', () => ({ AppleSignInButton: 'AppleSignInButton' }));
vi.mock('@/features/auth/google-sign-in', () => ({ GoogleSignInButton: 'GoogleSignInButton' }));
vi.mock('@/features/auth/deletion-recovery-handoff', () => ({
  consumeDeletionRecoveryHandoff: () => null,
  recoveryUntilFromError: () => null,
}));
vi.mock('@/features/auth/social-registration', () => ({ setPendingSocialRegistration: vi.fn() }));
vi.mock('@/features/auth/AuthSuccessNotice', () => ({
  AuthSuccessNotice: 'AuthSuccessNotice',
}));
vi.mock('@/features/auth/use-auth-notice', () => ({
  useRouteAuthNotice: () => ({ visible: false, dismiss: vi.fn() }),
}));
vi.mock('@/features/create/createFlow', () => ({
  consumePendingOnboardingCreateDraft: () => null,
}));
vi.mock('@/features/settings/language-store', () => ({
  useCopy: () => (turkish: string) => turkish,
}));
vi.mock('@/features/auth/auth-ui', () => ({
  AuthBrandBar: 'AuthBrandBar',
  AuthFormCard: 'AuthFormCard',
  AuthHero: 'AuthHero',
  AuthLayout: 'AuthLayout',
  AuthLink: 'AuthLink',
  AuthNote: 'AuthNote',
  AuthTitle: 'AuthTitle',
  Divider: 'Divider',
  GradientAuthButton: 'GradientAuthButton',
  authColors: {
    muted: '#747474',
    secondary: '#B2B2B2',
    text: '#FFFFFF',
    yellow: '#FFC400',
  },
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
vi.mock('expo-blur', () => ({ BlurView: 'BlurView' }));
vi.mock('expo-router', async () => {
  const React = await import('react');
  return {
    router: {
      canGoBack: () => false,
      push: vi.fn(),
      replace: vi.fn(),
      setParams: vi.fn(),
    },
    useFocusEffect(callback: () => void | (() => void)) {
      React.useEffect(callback, [callback]);
    },
    useLocalSearchParams: () => ({}),
  };
});
vi.mock('react-native', () => ({
  Keyboard: { dismiss: vi.fn() },
  Modal: 'Modal',
  Pressable: 'Pressable',
  StyleSheet: { absoluteFill: {}, create: (value: unknown) => value },
  Text: 'Text',
  TextInput: 'TextInput',
  View: 'View',
}));

import LoginScreen from '../../../app/(auth)/login';

let screen: ReactTestRenderer | undefined;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
});

afterEach(async () => {
  if (screen) await act(async () => screen!.unmount());
  screen = undefined;
});

describe('login native text inputs', () => {
  it('keeps manually typed e-mail and password values under form rerenders', async () => {
    await act(async () => {
      screen = create(<LoginScreen />);
    });

    const fields = () => screen!.root.findAllByType('TextInput' as never);
    expect(fields()).toHaveLength(2);

    await act(async () => fields()[0]!.props.onChangeText('uye@example.com'));
    await act(async () => fields()[1]!.props.onChangeText('Guvenli-sifre-2026'));

    expect(fields()[0]!.props.value).toBe('uye@example.com');
    expect(fields()[1]!.props.value).toBe('Guvenli-sifre-2026');
    expect(fields()[0]!.props.rejectResponderTermination).toBe(false);
    expect(fields()[1]!.props.rejectResponderTermination).toBe(false);
  });
});
