import type { ElementType, PropsWithChildren } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BeautyScreen from '../../../app/beauty';
import { getCreateFlow, resetCreateFlow } from '../create/createFlow';
import { resolveCreateFlow } from '../create/server';
import { emptyBeautySettings, hasBeautyAdjustments } from './settings';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  params: {} as { selected?: string },
  options: [
    {
      id: 'naturalBalance',
      number: 1,
      name: 'Doğal',
      description: 'Doğal ışık',
      group: 'Rötuş',
      defaultIntensity: 35,
      source: 101,
    },
    {
      id: 'skinGlow',
      number: 5,
      name: 'Işıltı',
      description: 'Cilt ışığı',
      group: 'Rötuş',
      defaultIntensity: 30,
      source: 105,
    },
    {
      id: 'faceContour',
      number: 6,
      name: 'Kontür',
      description: 'Kontür',
      group: 'Yüz hatları',
      defaultIntensity: 20,
      source: 106,
      isPro: true,
    },
    {
      id: 'nude',
      number: 8,
      name: 'Nude',
      description: 'Makyaj',
      group: 'Makyaj',
      defaultIntensity: 40,
      source: 108,
    },
  ],
}));
vi.mock('@/api/client', () => ({
  apiBaseUrl: 'http://localhost:4000',
  apiRequest: vi.fn(),
  captureSessionRequestScope: vi.fn(),
}));
vi.mock('react-native', () => ({
  Alert: { alert: vi.fn() },
  Image: 'Image',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Text: 'Text',
  View: 'View',
  StyleSheet: {
    create: (styles: unknown) => styles,
    absoluteFill: { position: 'absolute', inset: 0 },
  },
}));
vi.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mocks.push }),
  useLocalSearchParams: () => mocks.params,
}));
vi.mock('@/components', () => ({
  CategoryChip: 'CategoryChip',
  CreditBadge: 'CreditBadge',
  GlassSurface: 'GlassSurface',
  Icon: 'Icon',
  Notice: 'Notice',
  Screen: 'Screen',
  ToggleRow: 'ToggleRow',
}));
vi.mock('@/features/auth/require-authenticated', () => ({
  RequireAuthenticated: ({ children }: PropsWithChildren) => children,
}));
vi.mock('@/features/billing/use-wallet', () => ({ useAvailableCredits: () => 20 }));
vi.mock('@/features/beauty/catalog', () => ({ beautyOptions: mocks.options }));
vi.mock('./catalog', () => ({ beautyOptions: mocks.options }));
vi.mock('@/features/beauty/BeautyRail', () => import('./BeautyRail'));
vi.mock('@/features/beauty/IntensitySlider', () => ({ IntensitySlider: 'IntensitySlider' }));
vi.mock('@/features/beauty/settings', () => import('./settings'));
vi.mock('@/features/create/createFlow', () => import('../create/createFlow'));
vi.mock('@/features/create/components', () => ({
  CreateHeader: 'CreateHeader',
  FieldLabel: 'FieldLabel',
  MiniChoice: 'MiniChoice',
  WizardFooter: 'WizardFooter',
}));
vi.mock('@/theme', () => ({
  colors: {
    background: '#050505',
    textSecondary: '#AAA',
    textMuted: '#999',
    accentYellow: '#FFC400',
  },
  spacing: { md: 16 },
  typography: { caption: { fontSize: 12 } },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const host = (name: string) => name as ElementType;
let renderer: ReactTestRenderer;
const card = (number: number) =>
  renderer.root.find(
    (node) =>
      node.type === host('Pressable') &&
      String(node.props.accessibilityLabel).startsWith(`${number}. `),
  );
const footer = () => renderer.root.findByType(host('WizardFooter'));
async function tap(number: number) {
  await act(async () => card(number).props.onPress());
}
async function mount() {
  await act(async () => {
    renderer = create(<BeautyScreen />);
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.params = {};
  resetCreateFlow();
  await mount();
});
afterEach(async () => {
  await act(async () => renderer.unmount());
});

describe('beauty editor real state and selection', () => {
  it('turns the selected default off on a second tap and prevents empty generation', async () => {
    expect(card(1).props.accessibilityState.selected).toBe(true);
    await tap(1);
    expect(card(1).props.accessibilityState.selected).toBe(false);
    expect(getCreateFlow().beauty).toEqual(emptyBeautySettings());
    expect(resolveCreateFlow(getCreateFlow()).beauty).toEqual(emptyBeautySettings());
    expect(footer().props.disabled).toBe(true);
    await act(async () => footer().props.onPress());
    expect(mocks.push).not.toHaveBeenCalled();
    expect(
      renderer.root
        .findAllByType(host('Text'))
        .some((node) => node.props.children === 'Filtre seçili değil'),
    ).toBe(true);
    await tap(1);
    expect(getCreateFlow().beauty?.adjustments.naturalBalance).toBe(35);
    expect(resolveCreateFlow(getCreateFlow()).beauty).toMatchObject({
      adjustments: { naturalBalance: 35 },
      makeup: { preset: 'none', intensity: 0 },
    });
    expect(card(1).props.accessibilityState.selected).toBe(true);
    expect(footer().props.disabled).toBe(false);
  });

  it('clears an active makeup selection to none without discarding another layer', async () => {
    await tap(8);
    expect(getCreateFlow().beauty?.makeup).toEqual({ preset: 'nude', intensity: 40 });
    await tap(8);
    expect(getCreateFlow().beauty?.makeup).toEqual({ preset: 'none', intensity: 0 });
    expect(getCreateFlow().beauty?.adjustments.naturalBalance).toBe(35);
    expect(card(8).props.accessibilityState.selected).toBe(false);
    expect(card(1).props.accessibilityState.selected).toBe(true);
    expect(footer().props.disabled).toBe(false);
  });

  it('does not reactivate the default or a stale route selection when an empty draft remounts', async () => {
    await tap(1);
    await act(async () => renderer.unmount());
    mocks.params = { selected: 'naturalBalance' };
    await mount();
    expect(getCreateFlow().beauty).toEqual(emptyBeautySettings());
    expect(card(1).props.accessibilityState.selected).toBe(false);
    expect(footer().props.disabled).toBe(true);
  });

  it('shows locked PRO previews without enabling a pro adjustment or bypassing the footer', async () => {
    const before = getCreateFlow().beauty;
    await tap(6);
    expect(getCreateFlow().beauty).toBe(before);
    expect(getCreateFlow().beauty?.adjustments.faceContour).toBe(0);
    expect(card(6).props.accessibilityState.selected).toBe(false);
    expect(renderer.root.findByType(host('IntensitySlider')).props.disabled).toBe(true);
    expect(footer().props.disabled).toBe(true);
    await tap(6);
    expect(getCreateFlow().beauty).toBe(before);
    expect(footer().props.disabled).toBe(false);
  });

  it('resets all applied layers and leaves source images and dark preview surfaces unchanged', async () => {
    await tap(5);
    const imageSources = renderer.root
      .findAllByType(host('Image'))
      .map((node) => node.props.source);
    expect(imageSources).toContain(101);
    expect(imageSources).toContain(105);
    expect(card(1).props.style({ pressed: false })[0].backgroundColor).toBe('#211E1B');
    const preview = renderer.root.findByProps({
      accessibilityLabel: 'Orijinali görmek için basılı tut',
    });
    expect(preview.props.style.backgroundColor).toBe('#29241F');
    const resetLabel = renderer.root
      .findAllByType(host('Text'))
      .find((node) => node.props.children === 'Sıfırla')!;
    await act(async () => resetLabel.parent!.props.onPress());
    expect(hasBeautyAdjustments(getCreateFlow().beauty!)).toBe(false);
    expect(getCreateFlow().beauty?.makeup.preset).toBe('none');
    expect(footer().props.disabled).toBe(true);
  });
});
