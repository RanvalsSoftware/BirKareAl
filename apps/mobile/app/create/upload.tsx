import { useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Icon, Notice, Screen, UploadTile, SourcePreview } from '@/components';
import { standardCreationSelection, useCreateFlow } from '@/features/create/createFlow';
import { CreateHeader, CreateSegmentedControl, WizardFooter } from '@/features/create/components';
import { fictionalPeople } from '@/constants/catalog';
import { fictionalSourceSelection } from '@/features/create/source-selection';
import { afterSourcePath, needsSceneSelection } from '@/features/create/workflow';
import { colors, radii, spacing, typography } from '@/theme';

// Keep the client-side hint in sync with the backend's authoritative 15 MB default.
const MAX_SOURCE_PHOTO_BYTES = 15 * 1024 * 1024;

export default function UploadScreen() {
  const router = useRouter();
  const { flow, set } = useCreateFlow();
  const picking = useRef(false);
  const [isPicking, setIsPicking] = useState(false);
  const { source, selected } = useLocalSearchParams<{ source?: string; selected?: string }>();
  const sourceKind = flow.sourceKind ?? (flow.mode === 'character' ? 'fictional' : 'photo');
  const portraitOnly = Boolean(flow.beauty || flow.transformation || flow.trendPreset);
  useEffect(() => {
    if (source !== 'fictional') return;
    const selection = selected ? fictionalSourceSelection(selected) : null;
    set(
      standardCreationSelection({
        sourceKind: 'fictional',
        sourceUri: null,
        sourceName: null,
        sourceCharacterId: null,
        sourceRightsConfirmed: false,
        mode: 'scene',
        personId: null,
        ...(selection ?? {}),
      }),
    );
  }, [source, selected, set]);

  function changeSourceKind(kind: 'photo' | 'fictional') {
    if (kind === sourceKind) return;
    set({
      sourceKind: kind,
      sourceCharacterId: null,
      sourceUri: null,
      sourceName: null,
      sourceRightsConfirmed: false,
      personId: null,
      ...(flow.mode === 'character' ? { mode: 'scene' } : {}),
    });
  }

  function selectCharacter(id: string) {
    const selection = fictionalSourceSelection(id);
    if (!selection) return;
    set({ ...selection, ...(flow.mode === 'character' ? { mode: 'scene' } : {}) });
  }

  async function handlePickerResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_SOURCE_PHOTO_BYTES) {
      Alert.alert(
        'Dosya büyük',
        'Lütfen 15 MB altındaki bir JPEG, PNG, WebP veya HEIC fotoğrafı seç.',
      );
      return;
    }
    // A new image may have different ownership, so never carry consent across selections.
    set({
      sourceKind: 'photo',
      sourceCharacterId: null,
      sourceUri: asset.uri,
      sourceName: asset.fileName ?? 'Kaynak fotoğraf',
      sourceRightsConfirmed: false,
    });
  }

  async function selectFromLibrary() {
    if (picking.current) return;
    picking.current = true;
    setIsPicking(true);
    try {
      // The system image picker grants access to the selected image. Do not
      // block it on broad library permission (including iOS limited access).
      await handlePickerResult(
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          // Source files stay at their original ratio. Cropping is an
          // explicit, reversible choice on the next screen.
          allowsEditing: false,
          quality: 0.9,
        }),
      );
    } catch {
      Alert.alert('Fotoğraf seçilemedi', 'Lütfen tekrar dene.');
    } finally {
      picking.current = false;
      setIsPicking(false);
    }
  }

  async function takePhoto() {
    if (picking.current) return;
    picking.current = true;
    setIsPicking(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Kamera erişimi gerekli',
          'Yeni bir kaynak fotoğraf çekmek için kamera izni ver.',
        );
        return;
      }
      await handlePickerResult(
        await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          // Do not silently crop a captured source to 4:5.
          allowsEditing: false,
          quality: 0.9,
        }),
      );
    } catch {
      Alert.alert('Kamera açılamadı', 'Lütfen tekrar dene veya galerinden fotoğraf seç.');
    } finally {
      picking.current = false;
      setIsPicking(false);
    }
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <CreateHeader
        title="Kaynağını seç"
        subtitle={
          portraitOnly
            ? 'Yüzün net görünen bir portre seç'
            : 'Kendi fotoğrafın veya kurgusal karakter'
        }
        step={1}
      />
      {!portraitOnly ? (
        <CreateSegmentedControl
          value={sourceKind}
          onChange={changeSourceKind}
          options={[
            { value: 'photo', label: 'Fotoğrafım', icon: 'camera-outline' },
            { value: 'fictional', label: 'Kurgusal karakter', icon: 'person-outline' },
          ]}
        />
      ) : null}
      <Text style={styles.heading}>
        {sourceKind === 'fictional' ? 'Kurgusal karakter seç' : 'Kaynak fotoğrafın'}
      </Text>
      <Text style={styles.intro}>
        {sourceKind === 'fictional'
          ? 'Fotoğraf yüklemek yerine bu karakterlerden biriyle başla. Seçtiğin karakter sahnenin ana kişisi olacak.'
          : 'Kendine ait veya kullanım iznine sahip olduğun, net bir fotoğraf seç.'}
      </Text>
      {sourceKind === 'fictional' ? (
        <>
          {flow.sourceUri ? (
            <SourcePreview sourceUri={flow.sourceUri} label="Seçilen kurgusal karakter" />
          ) : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.characterRail}
          >
            {fictionalPeople.map((person) => (
              <Pressable
                key={person.id}
                accessibilityRole="radio"
                accessibilityLabel={person.name}
                accessibilityState={{ selected: flow.sourceCharacterId === person.id }}
                onPress={() => selectCharacter(person.id)}
                style={[
                  styles.character,
                  flow.sourceCharacterId === person.id && styles.characterSelected,
                ]}
              >
                <Image source={person.previewSource} style={styles.characterImage} />
                <Text style={styles.characterName}>{person.name}</Text>
                {flow.sourceCharacterId === person.id ? (
                  <View style={styles.characterTick}>
                    <Icon name="checkmark" size={16} color="#050505" />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
          <Notice tone="neutral">
            Karakterler uygulamanın kurgusal örnekleridir. Oluşturulan kareler gerçek bir kişiyle
            buluşma anlamına gelmez.
          </Notice>
        </>
      ) : (
        <>
          <UploadTile
            sourceUri={flow.sourceUri}
            onPress={selectFromLibrary}
            label={isPicking ? 'Fotoğraf seçici açılıyor…' : 'Galeriden fotoğraf seç'}
          />
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={takePhoto} style={styles.cameraAction}>
              <Icon name="camera-outline" size={20} />
              <Text style={styles.cameraText}>Kamerayla çek</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={selectFromLibrary}
              style={styles.cameraAction}
            >
              <Icon name="images-outline" size={20} />
              <Text style={styles.cameraText}>Galeriyi aç</Text>
            </Pressable>
          </View>
        </>
      )}
      <Text style={styles.storageHint}>
        Üretimi onayladığında kaynak görsel işlenmek üzere yüklenir ve projenle ilişkilendirilir.
      </Text>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={
          sourceKind === 'fictional'
            ? 'Kurgusal karakterin AI üretiminde kullanılmasını onaylıyorum'
            : 'Bu fotoğrafı kullanma hakkına sahip olduğumu onaylıyorum'
        }
        accessibilityState={{ checked: flow.sourceRightsConfirmed, disabled: !flow.sourceUri }}
        disabled={!flow.sourceUri}
        onPress={() => set({ sourceRightsConfirmed: !flow.sourceRightsConfirmed })}
        style={({ pressed }) => [
          styles.rightsConfirmation,
          flow.sourceRightsConfirmed && styles.rightsConfirmationChecked,
          !flow.sourceUri && styles.rightsConfirmationDisabled,
          pressed && flow.sourceUri && styles.pressed,
        ]}
      >
        <View style={[styles.checkbox, flow.sourceRightsConfirmed && styles.checkboxChecked]}>
          {flow.sourceRightsConfirmed ? (
            <Icon name="checkmark" size={16} color={colors.background} />
          ) : null}
        </View>
        <View style={styles.rightsCopy}>
          <Text style={styles.rightsTitle}>
            {sourceKind === 'fictional'
              ? 'Kurgusal karakterle devam et'
              : 'Fotoğraf kullanım hakkım var'}
          </Text>
          <Text style={styles.rightsDetail}>
            {sourceKind === 'fictional'
              ? 'Seçtiğim örneğin AI ile işlenmesini ve sonucun kurgusal olduğunu kabul ediyorum.'
              : 'Bu fotoğrafı kullanma hakkına sahip olduğumu ve görseldeki kişilerin gerekli izinlerini aldığımı onaylıyorum.'}
          </Text>
        </View>
      </Pressable>
      <Notice tone="warning" title="Daha iyi sonuç için">
        Karanlık, bulanık veya birden fazla kişinin göründüğü fotoğraflarda sonuç kalitesi
        düşebilir.
      </Notice>
      <WizardFooter
        label={needsSceneSelection(flow) ? 'Sahne seç' : 'Görseli düzenle'}
        disabled={isPicking || !flow.sourceUri || !flow.sourceRightsConfirmed}
        onPress={() => router.push(afterSourcePath(flow))}
        hint={
          !flow.sourceUri
            ? 'Devam etmek için fotoğraf veya kurgusal karakter seç.'
            : !flow.sourceRightsConfirmed
              ? 'Devam etmek için kaynak görselin kullanımını onayla.'
              : 'Kaynak seçildi. Yükleme üretimi başlatınca yapılır.'
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  storageHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  characterRail: { gap: 12, paddingHorizontal: 4, paddingVertical: 16 },
  character: {
    width: 122,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  characterSelected: { borderColor: colors.accentYellow },
  characterImage: { width: '100%', height: 154, resizeMode: 'cover' },
  characterName: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', padding: 10 },
  characterTick: {
    position: 'absolute',
    right: 7,
    top: 7,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.xl },
  intro: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: spacing.lg,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cameraAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  cameraText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  toggleCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  rightsConfirmation: {
    minHeight: 84,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 13,
    marginBottom: spacing.md,
  },
  rightsConfirmationChecked: {
    borderColor: colors.accentYellow,
    backgroundColor: colors.accentYellowSoft,
  },
  rightsConfirmationDisabled: { opacity: 0.52 },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: 7,
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    marginTop: 1,
    width: 24,
  },
  checkboxChecked: { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow },
  rightsCopy: { flex: 1 },
  rightsTitle: { ...typography.label, color: colors.textPrimary },
  rightsDetail: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 3,
  },
  pressed: { opacity: 0.78 },
});
