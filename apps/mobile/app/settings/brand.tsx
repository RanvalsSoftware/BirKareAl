import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuthStore } from '@/features/auth/auth-store';
import {
  BRAND_ACCENTS,
  brandLogoUri,
  importBrandLogo,
  removeBrandLogo,
  saveBrandKit,
  useBrandKit,
  type BrandKit,
} from '@/features/brand/brand-kit';
import { useCopy } from '@/features/settings/language-store';
import { brand } from '@/theme/brand';
import {
  BackNav,
  Hint,
  Page,
  PageTitle,
  PrimaryAction,
  SecondaryAction,
  SectionLabel,
  TextField,
} from '@/ui/kit';

/** Shop identity used on PDF catalogs and as the signature of shared listing text. */
export default function BrandKitScreen() {
  const copy = useCopy();
  const router = useRouter();
  const userId = useAuthStore((store) => store.user?.id);
  const saved = useBrandKit();
  const [draft, setDraft] = useState<BrandKit>(saved);
  const [pickingLogo, setPickingLogo] = useState(false);
  const logoUri = brandLogoUri(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const update = (patch: Partial<BrandKit>) => setDraft((current) => ({ ...current, ...patch }));

  async function chooseLogo() {
    if (!userId || pickingLogo) return;
    setPickingLogo(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;
      // The previous file is kept until the new kit is saved, so leaving the screen loses nothing.
      update({ logoFile: importBrandLogo(userId, asset.uri, null) });
    } catch {
      Alert.alert(
        copy('Logo eklenemedi', 'Could not add the logo'),
        copy('Başka bir görsel seçmeyi dene.', 'Try choosing a different image.'),
      );
    } finally {
      setPickingLogo(false);
    }
  }

  function save() {
    if (!userId) return;
    try {
      if (saved.logoFile && saved.logoFile !== draft.logoFile) removeBrandLogo(saved.logoFile);
      saveBrandKit(userId, {
        ...draft,
        shopName: draft.shopName.trim(),
        tagline: draft.tagline.trim(),
        phone: draft.phone.trim(),
        instagram: draft.instagram.trim().replace(/^@+/, ''),
        website: draft.website.trim(),
      });
      if (router.canGoBack()) router.back();
    } catch {
      Alert.alert(
        copy('Kaydedilemedi', 'Could not save'),
        copy('Cihazda yer olduğundan emin olup tekrar dene.', 'Check the device storage and try again.'),
      );
    }
  }

  return (
    <Page
      footer={
        <PrimaryAction disabled={!dirty} label={copy('Kaydet', 'Save')} onPress={save} />
      }
    >
      <BackNav fallback="/(tabs)/profile" label={copy('Hesap', 'Account')} />
      <PageTitle
        subtitle={copy(
          'PDF kataloglarında ve paylaştığın ilan metinlerinde görünür. Yalnızca bu cihazda saklanır.',
          'Shown on PDF catalogs and on the listing text you share. Stored only on this device.',
        )}
        title={copy('Marka kiti', 'Brand kit')}
      />

      <View style={styles.logoRow}>
        <View style={[styles.logo, { borderColor: draft.accent }]}>
          {logoUri ? (
            <Image
              accessibilityLabel={copy('Mağaza logosu', 'Shop logo')}
              resizeMode="cover"
              source={{ uri: logoUri }}
              style={styles.logoImage}
            />
          ) : (
            <Ionicons color={brand.textMuted} name="storefront-outline" size={30} />
          )}
        </View>
        <View style={styles.logoActions}>
          <SecondaryAction
            icon="image-outline"
            label={logoUri ? copy('Logoyu değiştir', 'Change logo') : copy('Logo ekle', 'Add logo')}
            loading={pickingLogo}
            onPress={() => void chooseLogo()}
          />
          {draft.logoFile ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => update({ logoFile: null })}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.remove}>{copy('Logoyu kaldır', 'Remove logo')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <TextField
        autoCapitalize="words"
        label={copy('Mağaza adı', 'Shop name')}
        maxLength={60}
        onChangeText={(shopName) => update({ shopName })}
        placeholder={copy('Örn. Atölye Ayşe', 'e.g. Studio Ayla')}
        value={draft.shopName}
      />
      <TextField
        label={copy('Kısa tanıtım', 'Tagline')}
        maxLength={90}
        onChangeText={(tagline) => update({ tagline })}
        placeholder={copy('Örn. El yapımı deri ürünler', 'e.g. Handmade leather goods')}
        value={draft.tagline}
      />

      <View style={styles.block}>
        <SectionLabel>{copy('Vurgu rengi', 'Accent colour')}</SectionLabel>
        <View accessibilityRole="radiogroup" style={styles.swatches}>
          {BRAND_ACCENTS.map((accent) => {
            const selected = draft.accent === accent;
            return (
              <Pressable
                accessibilityLabel={accent}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={accent}
                onPress={() => update({ accent })}
                style={[styles.swatchHit, selected && styles.swatchSelected]}
              >
                <View style={[styles.swatch, { backgroundColor: accent }]}>
                  {selected ? <Ionicons color="#FFFFFF" name="checkmark" size={18} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextField
        keyboardType="phone-pad"
        label={copy('Telefon / WhatsApp', 'Phone / WhatsApp')}
        maxLength={30}
        onChangeText={(phone) => update({ phone })}
        placeholder="+90 5xx xxx xx xx"
        value={draft.phone}
      />
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        label="Instagram"
        maxLength={40}
        onChangeText={(instagram) => update({ instagram })}
        placeholder={copy('kullanıcı adı', 'username')}
        value={draft.instagram}
      />
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        label={copy('Web sitesi', 'Website')}
        maxLength={80}
        onChangeText={(website) => update({ website })}
        placeholder="magazam.com"
        value={draft.website}
      />
      <Hint>
        {copy(
          'Boş bıraktığın alanlar katalogda yer almaz.',
          'Fields you leave empty are left out of the catalog.',
        )}
      </Hint>
    </Page>
  );
}

const styles = StyleSheet.create({
  logoRow: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  logo: {
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderRadius: 22,
    borderWidth: 2,
    height: 88,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 88,
  },
  logoImage: { height: '100%', width: '100%' },
  logoActions: { flex: 1, gap: 12 },
  remove: { color: brand.danger, fontSize: 15, textAlign: 'center' },
  block: { gap: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  swatchHit: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 24,
    borderWidth: 2,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  swatchSelected: { borderColor: brand.text },
  swatch: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pressed: { opacity: 0.65 },
});
