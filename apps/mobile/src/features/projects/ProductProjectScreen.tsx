import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { apiBaseUrl } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { brandSignature, useBrandKit } from '@/features/brand/brand-kit';
import { useCopy, useLanguage } from '@/features/settings/language-store';
import { shareAspectRatio } from '@/features/sharing/output';
import { getLocale } from '@/i18n/engine';
import { brand } from '@/theme/brand';
import {
  BackNav,
  Group,
  Hint,
  InfoNote,
  Page,
  PageTitle,
  PrimaryAction,
  Row,
  SecondaryAction,
  SectionLabel,
  Separator,
  Split,
  TextField,
} from '@/ui/kit';
import {
  PRICE_CURRENCIES,
  formatPrice,
  listingAsText,
  parsePriceInput,
  updateProjectPrice,
  writeProjectListing,
  type ListingTone,
  type ProductCommerce,
  type ProductListing,
} from './product-api';

export type ProductProjectDetail = {
  project: {
    id: string;
    title: string | null;
    aspectRatio: string;
    sourceAssetId?: string | null;
    updatedAt: string;
  } & Partial<ProductCommerce>;
  /** Completed generations, newest first. */
  versions: { id: string; output: { id: string; assetId: string } }[];
};

const MAX_PREVIEW_HEIGHT = 420;

const tones: readonly { id: ListingTone; tr: string; en: string }[] = [
  { id: 'neutral', tr: 'Sade', en: 'Plain' },
  { id: 'friendly', tr: 'Samimi', en: 'Friendly' },
  { id: 'premium', tr: 'Premium', en: 'Premium' },
];

/** A finished product: its image, its price and the text to list it with. */
export function ProductProjectScreen({ detail }: { detail: ProductProjectDetail }) {
  const copy = useCopy();
  const router = useRouter();
  const { language } = useLanguage();
  const accessToken = useAuthStore((store) => store.accessToken);
  const kit = useBrandKit();
  const { project, versions } = detail;
  const active = versions[0] ?? null;
  const locale = getLocale();

  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const [columnWidth, setColumnWidth] = useState(0);
  const [price, setPrice] = useState<{ amount: number | null; currency: string }>({
    amount: project.priceAmount ?? null,
    currency: project.priceCurrency ?? (language === 'tr' ? 'TRY' : 'USD'),
  });
  const [priceText, setPriceText] = useState(
    typeof project.priceAmount === 'number' ? String(project.priceAmount).replace('.', ',') : '',
  );
  const [priceState, setPriceState] = useState<'idle' | 'saving' | 'saved' | 'invalid' | 'failed'>(
    'idle',
  );
  const [listing, setListing] = useState<ProductListing | null>(project.listing ?? null);
  const [tone, setTone] = useState<ListingTone>(
    tones.some((item) => item.id === project.listing?.tone)
      ? (project.listing!.tone as ListingTone)
      : 'neutral',
  );
  const [writing, setWriting] = useState(false);
  const [listingError, setListingError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const title = project.title?.trim() || copy('Ürün projesi', 'Product project');
  const priceLabel = formatPrice(price.amount, price.currency, locale);

  async function savePrice(text: string, currency: string) {
    const amount = text.trim() ? parsePriceInput(text) : null;
    if (text.trim() && amount === null) {
      setPriceState('invalid');
      return;
    }
    setPriceState('saving');
    try {
      await updateProjectPrice(project.id, {
        priceAmount: amount,
        priceCurrency: amount === null ? null : currency,
      });
      setPrice({ amount, currency });
      setPriceState('saved');
    } catch {
      setPriceState('failed');
    }
  }

  async function write() {
    if (writing) return;
    setWriting(true);
    setListingError(null);
    try {
      const result = await writeProjectListing(project.id, { language, tone });
      setListing(result.listing);
    } catch (reason) {
      setListingError(
        reason instanceof Error
          ? reason.message
          : copy('İlan metni yazılamadı.', 'The listing text could not be written.'),
      );
    } finally {
      setWriting(false);
    }
  }

  async function copyText(key: string, text: string) {
    await Clipboard.setStringAsync(text);
    setCopied(key);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(null), 1600);
  }

  const fullText = listing
    ? listingAsText(listing, { price: priceLabel, signature: brandSignature(kit) })
    : '';

  function shareListing() {
    Share.share({ message: fullText }).catch(() =>
      Alert.alert(
        copy('Paylaşım açılamadı', 'Could not open sharing'),
        copy(
          'Metni kopyalayıp elle yapıştırabilirsin.',
          'You can copy the text and paste it yourself.',
        ),
      ),
    );
  }

  const aspect = imageRatio ?? shareAspectRatio(project.aspectRatio);
  // Tall results would push every action below the fold; bound the height and keep the shape.
  const previewWidth = Math.min(columnWidth, MAX_PREVIEW_HEIGHT * aspect);
  const imageBlock = active ? (
    <View
      onLayout={(event) => setColumnWidth(event.nativeEvent.layout.width)}
      style={styles.previewWrap}
    >
      <View style={[styles.preview, { height: previewWidth / aspect, width: previewWidth }]}>
        <Image
          accessibilityLabel={title}
          onLoad={(event) => {
            const { width, height } = event.nativeEvent.source;
            if (width > 0 && height > 0) setImageRatio(width / height);
          }}
          resizeMode="cover"
          source={{
            uri: `${apiBaseUrl}/v1/assets/${encodeURIComponent(active.output.assetId)}/content`,
            headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
          }}
          style={styles.fill}
        />
      </View>
    </View>
  ) : (
    <InfoNote
      icon="hourglass-outline"
      title={copy('Üretim hazırlanıyor', 'Generation in progress')}
    >
      {copy(
        'Tamamlanan ilk sonuç burada görünecek.',
        'The first finished result will appear here.',
      )}
    </InfoNote>
  );

  const assetSource = (assetId: string) => ({
    uri: `${apiBaseUrl}/v1/assets/${encodeURIComponent(assetId)}/content`,
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
  });
  const openCompare = () => {
    if (!active) return;
    router.push({
      pathname: '/generations/[id]/compare',
      params: { id: active.id, outputId: active.output.id, projectId: project.id },
    } as never);
  };
  // The seller's own photo next to the result: each half shows the same side of its picture.
  const compareBlock =
    active && project.sourceAssetId ? (
      <Pressable
        accessibilityHint={copy('Karşılaştırmayı tam ekranda açar', 'Opens the full comparison')}
        accessibilityLabel={copy('Önce ve sonra', 'Before and after')}
        accessibilityRole="button"
        onPress={openCompare}
        style={({ pressed }) => [styles.compare, pressed && styles.pressed]}
      >
        <View style={styles.compareHalf}>
          <Image
            resizeMode="cover"
            source={assetSource(project.sourceAssetId)}
            style={styles.fill}
          />
          <View style={styles.compareTag}>
            <Text style={styles.compareTagText}>{copy('Önce', 'Before')}</Text>
          </View>
        </View>
        <View style={styles.compareHalf}>
          <Image
            resizeMode="cover"
            source={assetSource(active.output.assetId)}
            style={styles.fill}
          />
          <View style={styles.compareTag}>
            <Text style={styles.compareTagText}>{copy('Sonra', 'After')}</Text>
          </View>
        </View>
      </Pressable>
    ) : null;

  const actions = active ? (
    <Group>
      <Row
        detail="1:1 · 4:5 · 9:16 · 16:9"
        icon="albums-outline"
        onPress={() =>
          router.push({
            pathname: '/generations/[id]/formats',
            params: { id: active.id, outputId: active.output.id },
          } as never)
        }
        title={copy('Satış formatlarını dışa aktar', 'Export sales formats')}
      />
      <Separator />
      <Row
        icon="share-outline"
        onPress={() =>
          router.push({
            pathname: '/generations/[id]/export',
            params: { id: active.id, outputId: active.output.id },
          } as never)
        }
        title={copy('Paylaş veya kaydet', 'Share or save')}
      />
      <Separator />
      <Row
        icon="color-wand-outline"
        onPress={() => router.push(`/generations/${active.id}/edit` as never)}
        title={copy('Görseli düzenle', 'Edit the image')}
      />
      <Separator />
      <Row
        icon="layers-outline"
        onPress={() => router.push(`/generations/${active.id}/results` as never)}
        title={copy('Alternatifler ve versiyonlar', 'Alternatives and versions')}
        value={String(versions.length)}
      />
    </Group>
  ) : null;

  const priceBlock = (
    <View style={styles.block}>
      <TextField
        hint={
          priceState === 'invalid'
            ? copy('Geçerli bir tutar yaz, örn. 1249,90', 'Enter a valid amount, e.g. 1249.90')
            : priceState === 'failed'
              ? copy(
                  'Fiyat kaydedilemedi. Tekrar dene.',
                  'The price could not be saved. Try again.',
                )
              : priceState === 'saved'
                ? priceLabel
                  ? copy(`Kaydedildi: ${priceLabel}`, `Saved: ${priceLabel}`)
                  : copy('Fiyat kaldırıldı.', 'Price removed.')
                : copy(
                    'PDF katalogda ve paylaştığın ilan metninde görünür.',
                    'Shown in the PDF catalog and in the listing text you share.',
                  )
        }
        keyboardType="decimal-pad"
        label={copy('Fiyat', 'Price')}
        onChangeText={(text) => {
          setPriceText(text);
          setPriceState('idle');
        }}
        onEndEditing={() => void savePrice(priceText, price.currency)}
        placeholder="0,00"
        returnKeyType="done"
        value={priceText}
      />
      <View accessibilityRole="radiogroup" style={styles.chips}>
        {PRICE_CURRENCIES.map((currency) => (
          <Chip
            key={currency}
            label={currency}
            onPress={() => {
              setPrice((current) => ({ ...current, currency }));
              if (priceText.trim()) void savePrice(priceText, currency);
            }}
            selected={price.currency === currency}
          />
        ))}
      </View>
    </View>
  );

  const listingBlock = (
    <View style={styles.block}>
      <SectionLabel>{copy('İlan metni', 'Listing text')}</SectionLabel>
      <View accessibilityRole="radiogroup" style={styles.chips}>
        {tones.map((item) => (
          <Chip
            key={item.id}
            label={copy(item.tr, item.en)}
            onPress={() => setTone(item.id)}
            selected={tone === item.id}
          />
        ))}
      </View>
      {listing ? (
        <>
          <Group padding={0}>
            <ListingPart
              copied={copied === 'title'}
              label={copy('Başlık', 'Title')}
              onCopy={() => void copyText('title', listing.title)}
              text={listing.title}
            />
            <View style={styles.rule} />
            <ListingPart
              copied={copied === 'description'}
              label={copy('Açıklama', 'Description')}
              onCopy={() => void copyText('description', listing.description)}
              text={listing.description}
            />
            <View style={styles.rule} />
            <ListingPart
              copied={copied === 'highlights'}
              label={copy('Öne çıkanlar', 'Highlights')}
              onCopy={() =>
                void copyText(
                  'highlights',
                  listing.highlights.map((item) => `• ${item}`).join('\n'),
                )
              }
              text={listing.highlights.map((item) => `• ${item}`).join('\n')}
            />
            <View style={styles.rule} />
            <ListingPart
              copied={copied === 'hashtags'}
              label={copy('Etiketler', 'Hashtags')}
              onCopy={() => void copyText('hashtags', listing.hashtags.join(' '))}
              text={listing.hashtags.join(' ')}
            />
          </Group>
          <Hint>
            {copy(
              'Metin yapay zekâ ile yazıldı. Yayımlamadan önce ürününe uygunluğunu kontrol et.',
              'This text was written with AI. Check it against your product before publishing.',
            )}
          </Hint>
          <PrimaryAction
            icon={copied === 'all' ? 'checkmark' : 'copy-outline'}
            label={
              copied === 'all' ? copy('Kopyalandı', 'Copied') : copy('Tümünü kopyala', 'Copy all')
            }
            onPress={() => void copyText('all', fullText)}
          />
          <View style={styles.pair}>
            <SecondaryAction
              icon="share-outline"
              label={copy('Paylaş', 'Share')}
              onPress={shareListing}
              style={styles.pairItem}
            />
            <SecondaryAction
              icon="refresh"
              label={copy('Yeniden yaz', 'Rewrite')}
              loading={writing}
              loadingLabel={copy('Yazılıyor…', 'Writing…')}
              onPress={() => void write()}
              style={styles.pairItem}
            />
          </View>
        </>
      ) : (
        <>
          <Hint>
            {copy(
              'Ürün adından başlık, açıklama, öne çıkanlar ve etiketler hazırlanır. Kredi harcamaz.',
              'A title, description, highlights and hashtags are prepared from the product name. It uses no credits.',
            )}
          </Hint>
          <PrimaryAction
            icon="create-outline"
            label={copy('İlan metnini yaz', 'Write the listing text')}
            loading={writing}
            loadingLabel={copy('Yazılıyor…', 'Writing…')}
            onPress={() => void write()}
          />
        </>
      )}
      {listingError ? (
        <InfoNote icon="alert-circle-outline" tone="warning">
          {listingError}
        </InfoNote>
      ) : null}
    </View>
  );

  return (
    <Page width="workspace">
      <BackNav fallback="/(tabs)/projects" label={copy('Katalog', 'Catalog')} />
      <PageTitle
        subtitle={
          priceLabel ??
          new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(new Date(project.updatedAt))
        }
        title={title}
      />
      <Split
        leading={
          <>
            {imageBlock}
            {compareBlock}
            {actions}
          </>
        }
        leadingFlex={5}
        trailing={
          <>
            {priceBlock}
            {listingBlock}
          </>
        }
        trailingFlex={6}
      />
    </Page>
  );
}

function ListingPart({
  label,
  text,
  copied,
  onCopy,
}: {
  label: string;
  text: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const copy = useCopy();
  return (
    <View style={styles.part}>
      <View style={styles.partCopy}>
        <Text style={styles.partLabel}>{label}</Text>
        <Text selectable style={styles.partText}>
          {text}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={copy(`${label} metnini kopyala`, `Copy ${label}`)}
        accessibilityRole="button"
        hitSlop={6}
        onPress={onCopy}
        style={({ pressed }) => [styles.copy, pressed && styles.pressed]}
      >
        <Ionicons
          color={copied ? brand.success : brand.gold}
          name={copied ? 'checkmark' : 'copy-outline'}
          size={20}
        />
      </Pressable>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  previewWrap: { alignItems: 'center', width: '100%' },
  preview: { backgroundColor: brand.surface, borderRadius: 20, overflow: 'hidden' },
  fill: { height: '100%', width: '100%' },
  compare: { borderRadius: 16, flexDirection: 'row', gap: 2, height: 150, overflow: 'hidden' },
  compareHalf: { backgroundColor: brand.surface, flex: 1 },
  compareTag: {
    backgroundColor: 'rgba(10,9,6,0.78)',
    borderRadius: 100,
    bottom: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
  },
  compareTagText: { color: brand.text, fontSize: 12, fontWeight: '600' },
  block: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderColor: brand.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 14,
  },
  chipOn: { borderColor: brand.gold },
  chipText: { color: brand.text, fontSize: 15 },
  chipTextOn: { color: brand.gold, fontWeight: '600' },
  rule: { backgroundColor: brand.line, height: StyleSheet.hairlineWidth * 2, marginLeft: 16 },
  part: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, padding: 16, paddingRight: 8 },
  partCopy: { flex: 1, gap: 4, minWidth: 0 },
  partLabel: { color: brand.textSecondary, fontSize: 13, fontWeight: '600' },
  partText: { color: brand.text, fontSize: 17, lineHeight: 23 },
  copy: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  pair: { flexDirection: 'row', gap: 10 },
  pairItem: { flex: 1 },
  pressed: { opacity: 0.65 },
});
