import type { ElementType } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SupportTicketScreen from '../../../app/support/ticket';

const mocks = vi.hoisted(() => ({ openURL: vi.fn(), replace: vi.fn() }));
vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { supportEmail: 'birkareal@ranvals.com' } } },
}));
vi.mock('expo-router', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('react-native', () => ({
  Linking: { openURL: mocks.openURL },
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@/components', () => ({
  AppHeader: 'AppHeader',
  CategoryChip: 'CategoryChip',
  Notice: 'Notice',
  PrimaryButton: 'PrimaryButton',
  Screen: 'Screen',
  TextField: 'TextField',
}));
vi.mock('@/theme', () => ({ colors: {}, spacing: { lg: 20, xl: 24 }, typography: {} }));
vi.mock('@/features/support/email', () => import('./email'));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let renderer: ReactTestRenderer;
const host = (name: string) => name as ElementType;
const button = (label: string) =>
  renderer.root.find((node) => node.type === host('PrimaryButton') && node.props.label === label);

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.openURL.mockResolvedValue(undefined);
  await act(async () => {
    renderer = create(<SupportTicketScreen />);
  });
});
afterEach(async () => {
  await act(async () => renderer.unmount());
});

describe('support draft screen', () => {
  it('opens a draft only after valid input and explicit press, without claiming delivery', async () => {
    expect(mocks.openURL).not.toHaveBeenCalled();
    expect(button('E-posta taslağını aç').props.disabled).toBe(true);
    await act(async () =>
      renderer.root.findByType(host('TextField')).props.onChangeText('Fotoğraf oluşturamıyorum.'),
    );
    await act(async () => button('E-posta taslağını aç').props.onPress());
    expect(mocks.openURL).toHaveBeenCalledOnce();
    expect(mocks.openURL.mock.calls[0][0]).toContain('mailto:birkareal@ranvals.com?subject=');
    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('E-posta taslağın açıldı.');
    expect(text).not.toContain('Talebini aldık');
    expect(text).toContain('gönderim ve teslimat burada doğrulanamaz');
  });

  it('retains the message and exposes the address when the device cannot open email', async () => {
    mocks.openURL.mockRejectedValue(new Error('No mail application'));
    await act(async () =>
      renderer.root.findByType(host('TextField')).props.onChangeText('Projelerime ulaşamıyorum.'),
    );
    await act(async () => button('E-posta taslağını aç').props.onPress());
    expect(renderer.root.findByType(host('TextField')).props.value).toBe(
      'Projelerime ulaşamıyorum.',
    );
    expect(button('E-posta taslağını aç').props.loading).toBe(false);
    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('E-posta uygulaması açılamadı');
    expect(text).toContain('birkareal@ranvals.com');
    expect(text).not.toContain('E-posta taslağın açıldı.');
  });
});
