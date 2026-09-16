import type { ElementType, ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  submit: vi.fn(),
}));

vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { supportEmail: 'birkareal@ranvals.com' } } },
}));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@/components', () => ({
  AppHeader: 'AppHeader',
  CategoryChip: 'CategoryChip',
  Icon: 'Icon',
  Notice: 'Notice',
  PrimaryButton: 'PrimaryButton',
  Screen: 'Screen',
  TextField: 'TextField',
}));
vi.mock('@/theme', () => ({ colors: {}, spacing: { lg: 20, xl: 24 }, typography: {} }));
vi.mock('@/features/auth/require-authenticated', () => ({
  RequireAuthenticated: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/features/support/tickets', () => ({
  newSupportSubmissionKey: () => 'support-test-key-0001',
  submitSupportTicket: mocks.submit,
  supportTopics: [{ category: 'GENERATION', label: 'Görsel üretimi' }],
  validSupportInput: (input: { subject: string; message: string }) =>
    input.subject.trim().length >= 3 && input.message.trim().length >= 12,
}));

import SupportTicketScreen from '../../../app/support/ticket';

let renderer: ReactTestRenderer;
const host = (name: string) => name as ElementType;
const button = (label: string) =>
  renderer.root.find((node) => node.type === host('PrimaryButton') && node.props.label === label);
const fields = () => renderer.root.findAllByType(host('TextField'));

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.submit.mockResolvedValue({
    id: 'ticket-1',
    status: 'SENT',
    createdAt: '2026-09-14T10:00:00.000Z',
  });
  await act(async () => {
    renderer = create(<SupportTicketScreen />);
  });
});

afterEach(async () => {
  await act(async () => renderer.unmount());
});

describe('authenticated support ticket screen', () => {
  it('submits valid text once with an idempotency key and shows the receipt', async () => {
    expect(button('Destek talebi gönder').props.disabled).toBe(true);
    await act(async () => fields()[0]!.props.onChangeText('Görsel üretim sorunu'));
    await act(async () => fields()[1]!.props.onChangeText('Görsel oluşturma tamamlanmıyor.'));
    await act(async () => {
      const press = button('Destek talebi gönder').props.onPress;
      press();
      press();
    });
    expect(mocks.submit).toHaveBeenCalledOnce();
    expect(mocks.submit).toHaveBeenCalledWith(
      {
        category: 'GENERATION',
        subject: 'Görsel üretim sorunu',
        message: 'Görsel oluşturma tamamlanmıyor.',
      },
      'support-test-key-0001',
    );
    expect(JSON.stringify(renderer.toJSON())).toContain('Destek talebin kaydedildi.');
    expect(JSON.stringify(renderer.toJSON())).toContain('ticket-1');
  });

  it('preserves the message and reports an unconfirmed backend delivery', async () => {
    mocks.submit.mockResolvedValue({
      id: 'ticket-unconfirmed',
      status: 'UNCONFIRMED',
      createdAt: '2026-09-14T10:00:00.000Z',
    });
    await act(async () => fields()[0]!.props.onChangeText('Projeler görünmüyor'));
    await act(async () => fields()[1]!.props.onChangeText('Projelerime şu anda ulaşamıyorum.'));
    await act(async () => button('Destek talebi gönder').props.onPress());
    expect(fields()[1]!.props.value).toBe('Projelerime şu anda ulaşamıyorum.');
    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('ticket-unconfirmed');
    expect(text).toContain('henüz doğrulanmadı');
    expect(text).toContain('birkareal@ranvals.com');
  });
});
