import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/settings/language-store';
import {
  SALES_FORMATS,
  discardCachedImages,
  downloadGeneratedOutput,
  keptShare,
  renderSalesFormat,
  saveFormatsToPhotos,
  shareFormat,
  type DownloadedOutput,
  type SalesFormat,
  type SalesFormatId,
} from '@/features/sharing/format-pack';
import { brand } from '@/theme/brand';
import { BackNav, Hint, InfoNote, Page, PageTitle, PrimaryAction, useLayout } from '@/ui/kit';

const formatNames: Record<SalesFormatId, { tr: string; en: string }> = {
  catalog: { tr: 'Pazaryeri kataloğu', en: 'Marketplace catalog' },
  'product-page': { tr: 'Ürün sayfası', en: 'Product page' },
  story: { tr: 'Hikâye ve Reels', en: 'Story and Reels' },
  web: { tr: 'Web vitrini', en: 'Web hero' },
};

const HEAVY_CROP = 0.6;

function first(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** One finished image, exported in the four sizes sales channels ask for. */
export default function SalesFormatsScreen() {
  const copy = useCopy();
  const params = useLocalSearchParams<{ id: string; outputId?: string }>();
  const generationId = first(params.id);
  const outputId = first(params.outputId);
  const { wide } = useLayout();
  const [source, setSource] = useState<DownloadedOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<SalesFormatId>>(
    () => new Set(SALES_FORMATS.map((format) => format.id)),
  );
  const [busy, setBusy] = useState<'save' | SalesFormatId | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!generationId) return;
    let active = true;
    downloadGeneratedOutput(generationId, outputId)
      .then((result) => {
        if (active) setSource(result);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : copy('Görsel yüklenemedi.', 'The image could not be loaded.'),
          );
      });
    return () => {
      active = false;
    };
  }, [copy, generationId, outputId]);

  // The downloaded original is only needed while this screen is open.
  useEffect(() => {
    if (!source) return;
    return () => discardCachedImages([source.uri]);
  }, [source]);

  function toggle(id: SalesFormatId) {
    setSavedCount(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function fail(reason: unknown) {
    Alert.alert(
      copy('İşlem tamamlanamadı', 'Could not finish'),
      reason instanceof Error ? reason.message : copy('Lütfen tekrar dene.', 'Please try again.'),
    );
  }

  async function saveSelected() {
    if (!source || busy) return;
    setBusy('save');
    try {
      const formats = SALES_FORMATS.filter((format) => selected.has(format.id));
      const files: string[] = [];
      for (const format of formats) files.push(await renderSalesFormat(source, format));
      try {
        await saveFormatsToPhotos(files);
      } finally {
        discardCachedImages(files);
      }
      setSavedCount(files.length);
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(null);
    }
  }

  async function share(format: SalesFormat) {
    if (!source || busy) return;
    setBusy(format.id);
    try {
      await shareFormat(await renderSalesFormat(source, format));
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Page
      footer={
        <>
          {savedCount ? (
            <Hint style={styles.saved}>
              {copy(
                `${savedCount} görsel Fotoğraflar’a kaydedildi.`,
                savedCount === 1
                  ? '1 image saved to Photos.'
                  : `${savedCount} images saved to Photos.`,
              )}
            </Hint>
          ) : null}
          <PrimaryAction
            disabled={!source || selected.size === 0}
            icon="download-outline"
            label={copy(
              `${selected.size} formatı Fotoğraflar’a kaydet`,
              selected.size === 1
                ? 'Save 1 format to Photos'
                : `Save ${selected.size} formats to Photos`,
            )}
            loading={busy === 'save'}
            loadingLabel={copy('Hazırlanıyor…', 'Preparing…')}
            onPress={() => void saveSelected()}
          />
        </>
      }
      width="workspace"
    >
      <BackNav label={copy('Ürün', 'Product')} />
      <PageTitle
        subtitle={copy(
          'Aynı görsel, her satış kanalının istediği ölçüde.',
          'The same image in the size each sales channel asks for.',
        )}
        title={copy('Satış formatları', 'Sales formats')}
      />

      {error ? (
        <InfoNote
          icon="alert-circle-outline"
          title={copy('Görsel açılamadı', 'Could not open the image')}
          tone="warning"
        >
          {error}
        </InfoNote>
      ) : !source ? (
        <View style={styles.loading}>
          <ActivityIndicator color={brand.gold} />
          <Hint>{copy('Görsel hazırlanıyor…', 'Preparing the image…')}</Hint>
        </View>
      ) : (
        <View style={styles.grid}>
          {SALES_FORMATS.map((format) => {
            const on = selected.has(format.id);
            const heavy = keptShare(source, format) < HEAVY_CROP;
            const name = copy(formatNames[format.id].tr, formatNames[format.id].en);
            return (
              <View key={format.id} style={[styles.card, wide && styles.cardWide]}>
                <Pressable
                  accessibilityLabel={`${name}, ${format.ratio}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(format.id)}
                  style={({ pressed }) => [styles.select, pressed && styles.pressed]}
                >
                  <View style={styles.stage}>
                    <View
                      style={[
                        styles.frame,
                        format.width >= format.height
                          ? { aspectRatio: format.width / format.height, width: '100%' }
                          : { aspectRatio: format.width / format.height, height: '100%' },
                        !on && styles.dimmed,
                      ]}
                    >
                      <Image resizeMode="cover" source={{ uri: source.uri }} style={styles.fill} />
                    </View>
                  </View>
                  <View style={styles.cardCopy}>
                    <Text numberOfLines={1} style={styles.cardTitle}>
                      {name}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {format.ratio} · {format.width} × {format.height}
                    </Text>
                    {heavy ? (
                      <Text style={styles.warning}>
                        {copy('Kenarlar belirgin biçimde kırpılır', 'Edges are cropped noticeably')}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    color={on ? brand.gold : brand.textMuted}
                    name={on ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                  />
                </Pressable>
                <Pressable
                  accessibilityLabel={copy(`${name} formatını paylaş`, `Share the ${name} format`)}
                  accessibilityRole="button"
                  disabled={busy !== null}
                  onPress={() => void share(format)}
                  style={({ pressed }) => [styles.share, pressed && styles.pressed]}
                >
                  {busy === format.id ? (
                    <ActivityIndicator color={brand.gold} size="small" />
                  ) : (
                    <Ionicons color={brand.gold} name="share-outline" size={22} />
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {source ? (
        <Hint>
          {copy(
            'Görseller ortadan kırpılır ve büyütülmez. Ürün kenarda kalıyorsa o formatı stüdyoda doğrudan üret.',
            'Images are cropped from the centre and never enlarged. If the product sits near an edge, generate that format directly in the studio.',
          )}
        </Hint>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderRadius: 20,
    flexDirection: 'row',
    width: '100%',
  },
  cardWide: { flexBasis: '48%', flexGrow: 1, width: undefined },
  select: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 14, padding: 12 },
  stage: { alignItems: 'center', height: 92, justifyContent: 'center', width: 92 },
  frame: { backgroundColor: brand.surfaceRaised, borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', width: '100%' },
  dimmed: { opacity: 0.35 },
  cardCopy: { flex: 1, gap: 3, minWidth: 0 },
  cardTitle: { color: brand.text, fontSize: 17, fontWeight: '600' },
  cardMeta: { color: brand.textSecondary, fontSize: 13, fontVariant: ['tabular-nums'] },
  warning: { color: brand.warning, fontSize: 13 },
  share: {
    alignItems: 'center',
    borderLeftColor: brand.line,
    borderLeftWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: 'center',
    minHeight: 64,
    width: 56,
  },
  saved: { color: brand.success, textAlign: 'center' },
  pressed: { opacity: 0.65 },
});
