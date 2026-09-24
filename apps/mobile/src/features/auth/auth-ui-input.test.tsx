import { createElement, isValidElement, type ReactElement } from 'react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthLayout, FormField, PasswordFormField } from './auth-ui';

const mocks = await vi.hoisted(async () => {
  // Metro resolves PNG require() to a numeric asset ID; reproduce that in Node.
  const { default: Module, createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const path = require.resolve('../../../assets/onboarding/images/brand/logo-gold-icon.png');
  const original = require.cache[path];
  const asset = new Module(path);
  asset.exports = 1;
  asset.loaded = true;
  require.cache[path] = asset;
  return {
    focused: false,
    setFocused: vi.fn(),
    restoreAsset: () => {
      if (original) require.cache[path] = original;
      else delete require.cache[path];
    },
  };
});
afterAll(() => mocks.restoreAsset());
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useState: () => [mocks.focused, mocks.setFocused],
}));
vi.mock('react-native', () => ({
  Image: 'Image',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'ios' },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Text: 'Text',
  TextInput: 'TextInput',
  View: 'View',
  StyleSheet: { create: (value: unknown) => value, absoluteFill: {} },
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
vi.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView', Image: 'AnimatedImage' },
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => false }));

function descendants(element: unknown): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<Record<string, unknown>>(element)) return [];
  const children = element.props.children;
  return [element, ...(Array.isArray(children) ? children : [children]).flatMap(descendants)];
}

beforeEach(() => {
  mocks.focused = false;
  vi.clearAllMocks();
});

describe('auth native text input touch and focus wiring', () => {
  it('lets the native input own the icon area instead of a non-focusable sibling column', () => {
    const nodes = descendants(
      FormField({ label: 'Ad', icon: createElement('Icon'), value: 'Ayşe' }),
    );
    const input = nodes.find((node) => node.type === 'TextInput')!;
    const overlay = nodes.find((node) => node.props.pointerEvents === 'none')!;
    expect(overlay.props.style).toMatchObject({ position: 'absolute' });
    expect(overlay.props.accessible).toBe(false);
    expect(input.props.style).toContainEqual(expect.objectContaining({ paddingLeft: 46 }));
    expect(input.props.pointerEvents).toBe('auto');
    expect(input.props.editable).toBe(true);
  });

  it('forwards native ref, typed text and blur to the form controller', () => {
    const ref = vi.fn();
    const onChangeText = vi.fn();
    const onBlur = vi.fn();
    const input = descendants(
      FormField({ label: 'Soyad', inputRef: ref, onChangeText, onBlur, value: '' }),
    ).find((node) => node.type === 'TextInput')!;
    expect(input.props.ref).toBe(ref);
    (input.props.onChangeText as (value: string) => void)('Çetin');
    (input.props.onBlur as (event: unknown) => void)({ nativeEvent: {} });
    expect(onChangeText).toHaveBeenCalledWith('Çetin');
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it('keeps input type/key stable when its focus highlight changes', () => {
    const render = () =>
      descendants(FormField({ label: 'Ad', value: 'Ayşe' })).find(
        (node) => node.type === 'TextInput',
      )!;
    const before = render();
    mocks.focused = true;
    const after = render();
    expect(after.type).toBe(before.type);
    expect(after.key).toBe(before.key);
    expect(after.props.value).toBe('Ayşe');
  });

  it('retains explicit disabled semantics and submit-to-next callbacks', () => {
    const next = vi.fn();
    const input = descendants(
      FormField({ label: 'Ad', editable: false, submitBehavior: 'submit', onSubmitEditing: next }),
    ).find((node) => node.type === 'TextInput')!;
    expect(input.props.editable).toBe(false);
    expect(input.props.onSubmitEditing).toBe(next);
    expect(input.props.submitBehavior).toBe('submit');
    expect(input.props.value).toBe('');
  });

  it('forwards password refs while leaving touch handling on the native input', () => {
    const ref = vi.fn();
    const nodes = descendants(
      PasswordFormField({
        label: 'Şifre',
        inputRef: ref,
        icon: createElement('Icon'),
        value: 'secret',
      }),
    );
    const input = nodes.find((node) => node.type === 'TextInput')!;
    const leadingIcon = nodes.find(
      (node) => node.props.pointerEvents === 'none' && node.type === 'View',
    )!;
    expect(input.props.ref).toBe(ref);
    expect(input.props.pointerEvents).toBe('auto');
    expect(input.props.editable).toBe(true);
    expect(leadingIcon).toBeTruthy();
  });

  it('does not let the auth ScrollView pan responder steal input taps', () => {
    const scroll = descendants(AuthLayout({ children: createElement('Text') })).find(
      (node) => node.type === 'ScrollView',
    )!;
    expect(scroll.props.disableScrollViewPanResponder).toBe(true);
    expect(scroll.props.keyboardShouldPersistTaps).toBe('always');
  });
});
