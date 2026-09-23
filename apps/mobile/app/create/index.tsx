import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Notice, Screen } from '@/components';
import { standardCreationSelection, useCreateFlow, type CreateMode } from '@/features/create/createFlow';
import {
  ChoiceCard,
  CreateHeader,
  CreateSegmentedControl,
  WizardFooter,
} from '@/features/create/components';
import { colors, spacing, typography } from '@/theme';
import { getToolPreset } from '@/features/create/tool-presets';

const modes: {
  id: CreateMode;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof ChoiceCard>['icon'];
  badge?: string;
}[] = [
  {
    id: 'scene',
    title: 'Yeni sahne oluştur',
    description: 'Fotoğrafını özgün bir ortama taşı.',
    icon: 'images-outline',
    badge: '2 kredi',
  },
  {
    id: 'background',
    title: 'Arka plan değiştir',
    description: 'Pozunu koru, çevreni yeniden tasarla.',
    icon: 'layers-outline',
    badge: '2 kredi',
  },
  {
    id: 'character',
    title: 'Kurgusal karakterden başla',
    description: 'Fotoğraf yüklemek yerine bir karakter seç.',
    icon: 'sparkles-outline',
    badge: '2 kredi',
  },
  {
    id: 'filter',
    title: 'AI filtre uygula',
    description: 'Bir fotoğrafa özgün bir stil ver.',
    icon: 'color-filter-outline',
    badge: '0–3 kredi',
  },
  {
    id: 'portrait',
    title: 'Profesyonel portre',
    description: 'Doğal, stüdyo kalitesinde bir portre oluştur.',
    icon: 'person-circle-outline',
    badge: '3 kredi',
  },
];

type CreateSection = 'visual' | 'fictional' | 'tools';

const sections: readonly {
  id: CreateSection;
  label: string;
  icon: React.ComponentProps<typeof ChoiceCard>['icon'];
  modes: readonly CreateMode[];
  heading: string;
  intro: string;
}[] = [
  {
    id: 'visual',
    label: 'Görsel',
    icon: 'image-outline',
    modes: ['scene', 'portrait'],
    heading: 'Bir görünüm seç',
    intro: 'Fotoğrafını yeni bir sahneye taşı ya da profesyonel bir portre oluştur.',
  },
  {
    id: 'fictional',
    label: 'Kurgusal',
    icon: 'sparkles-outline',
    modes: ['character'],
    heading: 'Kurgusal bir an yarat',
    intro: 'Hayal ürünü bir karakterle, güvenli biçimde özgün bir kare oluştur.',
  },
  {
    id: 'tools',
    label: 'AI Araçları',
    icon: 'construct-outline',
    modes: ['filter', 'background'],
    heading: 'Fotoğrafını dönüştür',
    intro: 'Bir filtre uygula veya arka planını AI ile yeniden tasarla.',
  },
];

function sectionForMode(mode: CreateMode): CreateSection {
  return sections.find((section) => section.modes.includes(mode))?.id ?? 'visual';
}

export default function CreateStartScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { flow, set } = useCreateFlow();
  const [section, setSection] = useState<CreateSection>(() => sectionForMode(flow.mode));

  useEffect(() => {
    let sectionTimeout: ReturnType<typeof setTimeout> | undefined;
    // This is the ordinary creation entry, including a bare /create deep link.
    // Beauty/gender editors have their own routes and must not hijack its next step.
    set(standardCreationSelection());
    if (mode === 'light' || mode === 'extend') {
      const preset = getToolPreset(mode);
      if (preset) set(preset);
      sectionTimeout = setTimeout(() => setSection('tools'), 0);
    } else if (mode && modes.some((item) => item.id === mode)) {
      const nextMode = mode as CreateMode;
      set(standardCreationSelection({
        mode: nextMode,
        toolId: null,
        sourceKind: nextMode === 'character' ? 'fictional' : 'photo',
        sourceUri: null,
        sourceName: null,
        sourceCharacterId: null,
        sourceRightsConfirmed: false,
        sceneId: null,
        personId: null,
        styleId: null,
        customInstruction: '',
      }));
      sectionTimeout = setTimeout(() => setSection(sectionForMode(nextMode)), 0);
    }
    return () => {
      if (sectionTimeout) clearTimeout(sectionTimeout);
    };
  }, [mode, set]);

  const activeSection = sections.find((item) => item.id === section) ?? sections[0];
  const visibleModes = modes.filter((item) => activeSection.modes.includes(item.id));

  const selectSection = (nextSection: CreateSection) => {
    const next = sections.find((item) => item.id === nextSection) ?? sections[0];
    setSection(next.id);
    if (!next.modes.includes(flow.mode))
      set(standardCreationSelection({
        mode: next.modes[0],
        toolId: null,
        customInstruction: '',
        sourceKind: next.id === 'fictional' ? 'fictional' : 'photo',
        sourceUri: null,
        sourceName: null,
        sourceCharacterId: null,
        sourceRightsConfirmed: false,
        sceneId: null,
        personId: null,
        styleId: null,
      }));
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <CreateHeader title="BirKare AI" subtitle="Ne oluşturmak istersin?" />
      <CreateSegmentedControl
        value={section}
        onChange={selectSection}
        options={sections.map(({ id, label, icon }) => ({ value: id, label, icon }))}
      />
      <Text style={styles.heading}>{activeSection.heading}</Text>
      <Text style={styles.intro}>{activeSection.intro}</Text>
      <View style={styles.options} accessibilityRole="radiogroup">
        {visibleModes.map((item) => (
          <ChoiceCard
            key={item.id}
            title={item.title}
            description={item.description}
            icon={item.icon}
            badge={item.badge}
            selected={flow.mode === item.id}
            onPress={() =>
              set(standardCreationSelection({
                mode: item.id,
                toolId: null,
                customInstruction: '',
                sourceKind: item.id === 'character' ? 'fictional' : 'photo',
                sourceUri: null,
                sourceName: null,
                sourceCharacterId: null,
                sourceRightsConfirmed: false,
                sceneId: null,
                personId: null,
                styleId: null,
              }))
            }
          />
        ))}
      </View>
      <Notice tone="neutral" title="Güvenli yaratıcılık">
        {section === 'fictional'
          ? 'Kurgusal karakterler gerçek kişileri temsil etmez. Sonuçlarda AI içeriği etiketi korunur.'
          : 'Yalnızca paylaşma hakkına sahip olduğun fotoğrafları yükle. Kaynak görselin iznin olmadan paylaşılmaz.'}
      </Notice>
      <WizardFooter
        label={section === 'fictional' ? 'Kurgusal karakter seç' : 'Kaynak seç'}
        onPress={() => {
          if (flow.mode === 'character')
            set({ mode: 'scene', sourceKind: 'fictional', personId: null });
          router.push('/create/upload' as never);
        }}
        hint="Seçimini sonraki adımda tamamlayabilirsin."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  heading: { ...typography.h1, color: colors.textPrimary, marginTop: spacing.xl },
  intro: { ...typography.body, color: colors.textSecondary, marginTop: 8, maxWidth: 330 },
  options: { gap: 10, marginTop: spacing.xl, marginBottom: spacing.lg },
});
