import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
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
    get title() { return translateCopy("Yeni sahne oluştur"); },
    get description() { return translateCopy("Fotoğrafını özgün bir ortama taşı."); },
    icon: 'images-outline',
    get badge() { return translateCopy('{{p0}} krediden başlayan', { p0: 7 }); },
  },
  {
    id: 'background',
    get title() { return translateCopy("Arka plan değiştir"); },
    get description() { return translateCopy("Pozunu koru, çevreni yeniden tasarla."); },
    icon: 'layers-outline',
    get badge() { return translateCopy('{{p0}} krediden başlayan', { p0: 5 }); },
  },
  {
    id: 'character',
    get title() { return translateCopy("Kurgusal karakterden başla"); },
    get description() { return translateCopy("Fotoğraf yüklemek yerine bir karakter seç."); },
    icon: 'sparkles-outline',
    get badge() { return translateCopy('{{p0}} krediden başlayan', { p0: 9 }); },
  },
  {
    id: 'filter',
    get title() { return translateCopy('AI filtre uygula'); },
    get description() { return translateCopy("Bir fotoğrafa özgün bir stil ver."); },
    icon: 'color-filter-outline',
    get badge() { return translateCopy('{{p0}} krediden başlayan', { p0: 5 }); },
  },
  {
    id: 'portrait',
    get title() { return translateCopy('Profesyonel portre'); },
    get description() { return translateCopy("Doğal, stüdyo kalitesinde bir portre oluştur."); },
    icon: 'person-circle-outline',
    get badge() { return translateCopy('{{p0}} krediden başlayan', { p0: 8 }); },
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
    get label() { return translateCopy("Görsel"); },
    icon: 'image-outline',
    modes: ['scene', 'portrait'],
    get heading() { return translateCopy("Bir görünüm seç"); },
    get intro() { return translateCopy('Fotoğrafını yeni bir sahneye taşı ya da profesyonel bir portre oluştur.'); },
  },
  {
    id: 'fictional',
    get label() { return translateCopy('Kurgusal'); },
    icon: 'sparkles-outline',
    modes: ['character'],
    get heading() { return translateCopy("Kurgusal bir an yarat"); },
    get intro() { return translateCopy('Hayal ürünü bir karakterle, güvenli biçimde özgün bir kare oluştur.'); },
  },
  {
    id: 'tools',
    get label() { return translateCopy("AI Araçları"); },
    icon: 'construct-outline',
    modes: ['filter', 'background'],
    get heading() { return translateCopy("Fotoğrafını dönüştür"); },
    get intro() { return translateCopy('Bir filtre uygula veya arka planını AI ile yeniden tasarla.'); },
  },
];

function sectionForMode(mode: CreateMode): CreateSection {
  return sections.find((section) => section.modes.includes(mode))?.id ?? 'visual';
}

export default function CreateStartScreen() {
  const languageRevision = useLanguageRevision();

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
      <CreateHeader title="BirKare AI" subtitle={translateCopy("Ne oluşturmak istersin?")} />
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
      <Notice tone="neutral" title={translateCopy("Güvenli yaratıcılık")}>
        {section === 'fictional'
          ? translateCopy("Kurgusal karakterler gerçek kişileri temsil etmez. Sonuçlarda AI içeriği etiketi korunur.")
          : translateCopy("Yalnızca paylaşma hakkına sahip olduğun fotoğrafları yükle. Kaynak görselin iznin olmadan paylaşılmaz.")}
      </Notice>
      <WizardFooter
        label={section === 'fictional' ? translateCopy("Kurgusal karakter seç") : translateCopy("Kaynak seç")}
        onPress={() => {
          if (flow.mode === 'character')
            set({ mode: 'scene', sourceKind: 'fictional', personId: null });
          router.push('/create/upload' as never);
        }}
        hint={translateCopy("Seçimini sonraki adımda tamamlayabilirsin.")}
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
