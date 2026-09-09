import type { ElementType } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SocialCompleteScreen from '../../../app/(auth)/social-complete';

const mocks = vi.hoisted(() => ({
  complete: vi.fn(),
  dismissKeyboard: vi.fn(),
  replace: vi.fn(),
  pending: {
    pendingToken: 'short-lived-test-registration-token',
    profile: { firstName: 'Google', lastName: 'Profil', email: 'person@example.com' },
  },
}));
vi.mock('react-native', () => ({
  InputAccessoryView: 'InputAccessoryView',
  Keyboard: { dismiss: mocks.dismissKeyboard },
  Platform: { OS: 'ios' },
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  TextInput: 'TextInput',
  View: 'View',
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
vi.mock('expo-router', () => ({
  router: { replace: mocks.replace, push: vi.fn(), back: vi.fn(), canGoBack: () => false },
}));
vi.mock('@/features/auth/auth-store', () => ({
  useAuthStore: (
    select: (store: { completeSocialRegistration: typeof mocks.complete }) => unknown,
  ) => select({ completeSocialRegistration: mocks.complete }),
}));
vi.mock('@/features/auth/social-registration', () => ({
  getPendingSocialRegistration: () => mocks.pending,
  clearPendingSocialRegistration: vi.fn(),
}));
vi.mock('@/features/create/createFlow', () => ({
  consumePendingOnboardingCreateDraft: () => null,
}));
vi.mock('@/features/auth/validation', () => import('./validation'));
vi.mock('@/features/auth/auth-ui', () => ({
  AuthBrandBar: 'AuthBrandBar',
  AuthFormCard: 'AuthFormCard',
  AuthLayout: 'AuthLayout',
  AuthLogo: 'AuthLogo',
  AuthNote: 'AuthNote',
  AuthTitle: 'AuthTitle',
  CheckRow: 'CheckRow',
  GradientAuthButton: 'GradientAuthButton',
  authColors: { muted: '#999', text: '#FFF', yellow: '#FFC400' },
}));

// Real React reconciliation and real react-hook-form Controllers. Native leaf
// components are mocked; native keyboard/modal delivery still needs device QA.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let renderer: ReactTestRenderer;
// The mocked native leaves are custom host names, outside React DOM's tag union.
const host = (name: string) => name as ElementType;

function field(label: string): ReactTestInstance {
  return renderer.root.find(
    (node) => node.type === host('TextInput') && node.props.accessibilityLabel === label,
  );
}

async function type(label: string, value: string) {
  await act(async () => field(label).props.onChangeText(value));
}

beforeEach(async () => {
  vi.clearAllMocks();
  // Stop at the API boundary; do not create a real account or wait for navigation.
  mocks.complete.mockRejectedValue(new Error('Test: registration service unavailable'));
  await act(async () => {
    renderer = create(<SocialCompleteScreen />);
  });
});

afterEach(async () => {
  await act(async () => renderer.unmount());
});

describe('Google profile completion controlled inputs', () => {
  it('preserves Turkish names and each year keystroke, backspace and clear through rerenders', async () => {
    const firstNativeInput = field('Ad');
    expect(field('Ad').props.value).toBe('Google');
    for (const value of ['A', 'Ay', 'Ayş', 'Ayşe']) {
      await type('Ad', value);
      expect(field('Ad').props.value).toBe(value);
      expect(field('Ad')).toBe(firstNativeInput);
    }
    await type('Soyad', 'Çığ Öztürk');
    expect(field('Soyad').props.value).toBe('Çığ Öztürk');
    for (const value of ['1', '19', '199', '1993', '199', '19', '1', '', '0', '']) {
      await type('Doğum yılı', value);
      expect(field('Doğum yılı').props.value).toBe(value);
      expect(field('Ad').props.value).toBe('Ayşe');
      expect(field('Soyad').props.value).toBe('Çığ Öztürk');
    }
    await type('Doğum yılı', '1993');
    expect(field('Doğum yılı').props.value).toBe('1993');
  });

  it('validates partial years and consent before sending the final numeric year', async () => {
    await type('Ad', 'Ayşe');
    await type('Soyad', 'Çetin');
    await type('Doğum yılı', '199');
    await act(async () => renderer.root.findByType(host('GradientAuthButton')).props.onPress());
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(
      renderer.root
        .findAllByType(host('Text'))
        .some((node) => node.props.children === 'Doğum yılınızı 4 haneli girin.'),
    ).toBe(true);

    await type('Doğum yılı', '1993');
    await act(async () => renderer.root.findByType(host('GradientAuthButton')).props.onPress());
    expect(mocks.complete).not.toHaveBeenCalled();
    for (let index = 0; index < 5; index += 1) {
      await act(async () => renderer.root.findAllByType(host('CheckRow'))[index]!.props.onPress());
    }
    await act(async () => renderer.root.findByType(host('GradientAuthButton')).props.onPress());
    expect(mocks.complete).toHaveBeenCalledExactlyOnceWith({
      pendingToken: mocks.pending.pendingToken,
      firstName: 'Ayşe',
      lastName: 'Çetin',
      birthYear: 1993,
      acceptedTerms: true,
      acceptedPrivacy: true,
      acceptedAiDisclosure: true,
      acceptedAge: true,
      acceptedImageRights: true,
    });
    expect(field('Ad').props.value).toBe('Ayşe');
    expect(field('Doğum yılı').props.value).toBe('1993');
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('wires next-field refs and an iOS numeric keyboard Done action', async () => {
    const focusLastName = vi.fn();
    const focusBirthYear = vi.fn();
    field('Soyad').props.ref({ focus: focusLastName });
    field('Doğum yılı').props.ref({ focus: focusBirthYear });
    field('Ad').props.onSubmitEditing();
    field('Soyad').props.onSubmitEditing();
    expect(focusLastName).toHaveBeenCalledOnce();
    expect(focusBirthYear).toHaveBeenCalledOnce();
    const done = renderer.root.findByProps({ accessibilityLabel: 'Klavyeyi kapat' });
    done.props.onPress();
    expect(mocks.dismissKeyboard).toHaveBeenCalledOnce();
    expect(field('Doğum yılı').props.inputAccessoryViewID).toBe(
      renderer.root.findByType(host('InputAccessoryView')).props.nativeID,
    );
  });

  it('uses the working login direct-input responder and fixed-height layout without a focus wrapper', async () => {
    for (const label of ['Ad', 'Soyad', 'Doğum yılı']) {
      const input = field(label);
      expect(input.parent?.type).toBe(host('View'));
      expect(input.parent?.props.style).toMatchObject({
        flexDirection: 'row',
        minHeight: 56,
        paddingLeft: 15,
        gap: 13,
      });
      expect(input.props.style).toMatchObject({ flex: 1, minHeight: 55, paddingVertical: 0 });
      expect(input.props.blurOnSubmit).toBe(false);
      expect(input.props.rejectResponderTermination).toBe(false);
      expect(input.props.onFocus).toBeUndefined();
      expect(input.props.pointerEvents).toBeUndefined();
    }
    await type('Ad', 'Ayşe');
    const nativeInput = field('Ad');
    await act(async () => nativeInput.props.onBlur());
    expect(field('Ad')).toBe(nativeInput);
    expect(field('Ad').props.value).toBe('Ayşe');
  });
});
