import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authMailToken, EMAIL_REQUEST_NOTICE, verificationRecoveryParams } from './email-delivery';

const mocks = vi.hoisted(() => ({
  params: {} as Record<string, unknown>,
  request: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('@/api/client', () => ({ apiRequest: mocks.request }));
vi.mock('@/features/settings/language-store', () => ({
  useCopy: () => (turkish: string) => turkish,
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => false }));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => mocks.params,
  router: { canGoBack: () => false, push: mocks.push, replace: mocks.replace },
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
vi.mock('react-native', () => {
  class AnimatedValue {
    value: number;
    constructor(value: number) {
      this.value = value;
    }
    setValue(value: number) {
      this.value = value;
    }
  }
  const animation = { start: (done?: () => void) => done?.() };
  return {
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    Pressable: 'Pressable',
    StyleSheet: { create: (value: unknown) => value },
    Animated: {
      Value: AnimatedValue,
      View: 'AnimatedView',
      timing: () => animation,
      spring: () => animation,
      sequence: () => animation,
      parallel: () => animation,
    },
    Easing: {
      cubic: 'cubic',
      out: (value: unknown) => value,
    },
  };
});
vi.mock('./auth-ui', () => ({
  AuthBrandBar: 'AuthBrandBar',
  AuthFormCard: 'AuthFormCard',
  AuthLayout: 'AuthLayout',
  AuthLink: 'AuthLink',
  AuthLogo: 'AuthLogo',
  AuthNote: 'AuthNote',
  AuthTitle: 'AuthTitle',
  FormField: 'FormField',
  GradientAuthButton: 'GradientAuthButton',
  authColors: {},
}));
import VerifyEmailScreen from '../../../app/(auth)/verify-email';

let screen: ReactTestRenderer | undefined;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.params = { email: 'member@example.test' };
  mocks.request.mockResolvedValue({ accepted: true, delivery: 'unconfirmed' });
});
afterEach(async () => {
  if (screen) await act(async () => screen!.unmount());
  screen = undefined;
  vi.useRealTimers();
});
async function mount() {
  await act(async () => {
    screen = create(<VerifyEmailScreen />);
  });
  return screen!;
}

describe('transactional email handoff', () => {
  it('only delivery failure after account creation offers recovery, never a second registration', () => {
    expect(
      verificationRecoveryParams(
        { code: 'AUTH_VERIFICATION_DELIVERY_FAILED' },
        ' ME@EXAMPLE.TEST ',
      ),
    ).toEqual({ email: 'me@example.test', delivery: 'failed' });
    expect(
      verificationRecoveryParams({ code: 'MAIL_DELIVERY_UNAVAILABLE' }, 'me@example.test'),
    ).toBeNull();
    expect(verificationRecoveryParams(new Error('network'), 'me@example.test')).toBeNull();
  });

  it('bounds route tokens and does not claim SMTP delivery from anonymous acceptance', () => {
    expect(authMailToken(['first', 'second'])).toBe('');
    expect(authMailToken('x'.repeat(513))).toBe('');
    expect(authMailToken('  token  ')).toBe('token');
    expect(EMAIL_REQUEST_NOTICE).toContain('teslim edildiği anlamına gelmez');
    expect(EMAIL_REQUEST_NOTICE).not.toContain('bağlantısı gönderildi');
  });

  it('picks up an incoming email link while the verification screen is mounted', async () => {
    await mount();
    const incoming = 'b'.repeat(48);
    mocks.params = { ...mocks.params, token: incoming };
    await act(async () => screen!.update(<VerifyEmailScreen />));
    expect(screen!.root.findByType('TextInput' as never).props.value).toBe(incoming);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it('submits once, shows the success state, then hands off to login after the animation', async () => {
    let finish!: () => void;
    mocks.request.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await mount();
    const token = 'a'.repeat(48);
    await act(async () =>
      screen!.root.findByType('TextInput' as never).props.onChangeText(` ${token} `),
    );
    await act(async () => {
      const press = screen!.root.findByType('GradientAuthButton' as never).props.onPress;
      press();
      press();
    });
    expect(mocks.request).toHaveBeenCalledTimes(1);
    expect(mocks.request).toHaveBeenCalledWith(
      '/v1/auth/verify-email',
      { method: 'POST', body: JSON.stringify({ token }) },
      { authenticated: false },
    );
    await act(async () => finish());
    expect(JSON.stringify(screen!.toJSON())).toContain('E-posta doğrulandı');
    expect(mocks.replace).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1600);
    });
    expect(mocks.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('keeps verification recovery available and labels resend as unconfirmed', async () => {
    mocks.params.delivery = 'failed';
    await mount();
    expect(JSON.stringify(screen!.toJSON())).toContain('Yeniden kayıt olman');
    await act(async () => screen!.root.findAllByType('AuthLink' as never)[0]!.props.onPress());
    expect(mocks.request).toHaveBeenCalledWith(
      '/v1/auth/resend-verification',
      { method: 'POST', body: JSON.stringify({ email: 'member@example.test' }) },
      { authenticated: false },
    );
    expect(JSON.stringify(screen!.toJSON())).toContain(EMAIL_REQUEST_NOTICE);
  });

  it('does not send a malformed token or resend to a missing route address', async () => {
    mocks.params = {};
    await mount();
    await act(async () => screen!.root.findByType('GradientAuthButton' as never).props.onPress());
    await act(async () => screen!.root.findAllByType('AuthLink' as never)[0]!.props.onPress());
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
