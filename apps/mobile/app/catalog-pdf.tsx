import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { apiBaseUrl } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { RequireAuthenticated } from '@/features/auth/require-authenticated';
import { brandContactLines, brandLogoUri, useBrandKit } from '@/features/brand/brand-kit';
import {
  MAX_CATALOG_PRODUCTS,
  createCatalogPdf,
  shareCatalogPdf,
} from '@/features/catalog/catalog-pdf';
import type { CatalogLayout } from '@/features/catalog/catalog-html';
import { formatPrice } from '@/features/projects/product-api';
import { useUserProjects } from '@/features/projects/use-user-projects';
import { useCopy, useLanguage } from '@/features/settings/language-store';
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
  SectionLabel,
  Separator,
} from '@/ui/kit';

const layouts: readonly {
  id: CatalogLayout;
  cells: number;
  tr: string;
  en: string;
  detailTr: string;
  detailEn: string;
}[] = [
  {
    id: 'large',
    cells: 4,
    tr: 'Büyük kartlar',
    en: 'Large cards',
    detailTr: 'Sayfada 4 ürün',
    detailEn: '4 products a page',
  },
  {
    id: 'grid',
    cells: 6,
    tr: 'Sık ızgara',
    en: 'Compact grid',
    detailTr: 'Sayfada 6 ürün',
    detailEn: '6 products a page',
  },
];

export default function CatalogPdfRoute() {
  return (
    <RequireAuthenticated>
      <CatalogPdfScreen />
    </RequireAuthenticated>
  );
}

/** Pick finished products and turn them into a shareable, priced PDF catalog. */
function CatalogPdfScreen() {
  const copy = useCopy();
  const router = useRouter();
  const { language } = useLanguage();
  const accessToken = useAuthStore((store) => store.accessToken);
  const kit = useBrandKit();
  const projectsQuery = useUserProjects();
  const products = useMemo(
    () =>
      (projectsQuery.data ?? []).filter(
        (project) => project.mode === 'PRODUCT_STUDIO' && project.outputAssetId,
      ),
    [projectsQuery.data],
  );
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(() => new Set());
  const [showPrices, setShowPrices] = useState(true);
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [cover, setCover] = useState(true);
  const [layout, setLayout] = useState<CatalogLayout>('large');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const chosen = products.filter((project) => !excluded.has(project.id));
  const overLimit = chosen.length > MAX_CATALOG_PRODUCTS;
  const missingPrices = showPrices
    ? chosen.filter((project) => typeof project.priceAmount !== 'number').length
    : 0;

  function toggle(id: string) {
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function create() {
    if (progress || !chosen.length || overLimit) return;
    setProgress({ done: 0, total: chosen.length });
    try {
      const locale = getLocale();
      const uri = await createCatalogPdf(
        chosen.map((project) => ({
          assetId: project.outputAssetId!,
          title: project.title?.trim() || copy('Ürün', 'Product'),
          price: showPrices
            ? formatPrice(project.priceAmount, project.priceCurrency, locale)
            : null,
          description: showDescriptions ? (project.listing?.description ?? null) : null,
        })),
        {
          shopName: kit.shopName,
          tagline: kit.tagline,
          contactLines: brandContactLines(kit),
          accent: kit.accent,
          logoUri: brandLogoUri(kit),
        },
        {
          fallbackTitle: copy('Ürün kataloğu', 'Product catalog'),
          date: new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(new Date()),
          productCount: copy(
            `${chosen.length} ürün`,
            chosen.length === 1 ? '1 product' : `${chosen.length} products`,
          ),
          contactHeading: copy('Sipariş ve iletişim', 'Orders and contact'),
          page: (current, total) => `${current} / ${total}`,
        },
        {
          cover,
          layout,
          rightToLeft: language === 'ar',
          onProgress: (done, total) => setProgress({ done, total }),
        },
      );
      await shareCatalogPdf(uri);
    } catch (reason) {
      Alert.alert(
        copy('Katalog oluşturulamadı', 'Could not create the catalog'),
        reason instanceof Error ? reason.message : copy('Lütfen tekrar dene.', 'Please try again.'),
      );
    } finally {
      setProgress(null);
    }
  }

  return (
    <Page
      footer={
        <PrimaryAction
          disabled={!chosen.length || overLimit}
          icon="document-text-outline"
          label={copy(
            `${chosen.length} ürünle PDF oluştur`,
            chosen.length === 1
              ? 'Create PDF with 1 product'
              : `Create PDF with ${chosen.length} products`,
          )}
          loading={progress !== null}
          loadingLabel={
            progress
              ? copy(
                  `Hazırlanıyor ${progress.done} / ${progress.total}…`,
                  `Preparing ${progress.done} / ${progress.total}…`,
                )
              : undefined
          }
          onPress={() => void create()}
        />
      }
    >
      <BackNav fallback="/(tabs)/projects" label={copy('Katalog', 'Catalog')} />
      <PageTitle
        subtitle={copy(
          'Seçtiğin ürünlerden fiyatlı, paylaşılabilir bir katalog. Cihazında oluşturulur.',
          'A priced, shareable catalog of the products you choose. Built on your device.',
        )}
        title={copy('PDF katalog', 'PDF catalog')}
      />

      <Group>
        <Row
          detail={
            kit.shopName
              ? [kit.tagline, ...brandContactLines(kit)].filter(Boolean).join(' · ') || undefined
              : copy(
                  'Mağaza adını, logonu ve iletişim bilgini ekle.',
                  'Add your shop name, logo and contact details.',
                )
          }
          icon="storefront-outline"
          onPress={() => router.push('/settings/brand' as never)}
          title={kit.shopName || copy('Marka kitini ayarla', 'Set up your brand kit')}
        />
        <Separator />
        <Row
          icon="pricetag-outline"
          title={copy('Fiyatları göster', 'Show prices')}
          trailing={
            <Switch
              onValueChange={setShowPrices}
              trackColor={{ true: brand.gold }}
              value={showPrices}
            />
          }
        />
        <Separator />
        <Row
          icon="reader-outline"
          title={copy('Açıklamaları ekle', 'Include descriptions')}
          trailing={
            <Switch
              onValueChange={setShowDescriptions}
              trackColor={{ true: brand.gold }}
              value={showDescriptions}
            />
          }
        />
        <Separator />
        <Row
          icon="book-outline"
          title={copy('Kapak sayfası', 'Cover page')}
          trailing={
            <Switch onValueChange={setCover} trackColor={{ true: brand.gold }} value={cover} />
          }
        />
      </Group>

      <SectionLabel>{copy('Sayfa düzeni', 'Page layout')}</SectionLabel>
      <View accessibilityRole="radiogroup" style={styles.layouts}>
        {layouts.map((item) => {
          const selected = layout === item.id;
          return (
            <Pressable
              accessibilityLabel={copy(item.tr, item.en)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={item.id}
              onPress={() => setLayout(item.id)}
              style={({ pressed }) => [
                styles.layout,
                selected && styles.layoutSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.sheet}>
                {Array.from({ length: item.cells }, (_, index) => (
                  <View
                    key={index}
                    style={[styles.cell, item.cells === 4 ? styles.cellLarge : styles.cellSmall]}
                  />
                ))}
              </View>
              <Text style={[styles.layoutTitle, selected && styles.layoutTitleSelected]}>
                {copy(item.tr, item.en)}
              </Text>
              <Text style={styles.layoutMeta}>{copy(item.detailTr, item.detailEn)}</Text>
            </Pressable>
          );
        })}
      </View>
      {missingPrices ? (
        <Hint>
          {copy(
            `${missingPrices} üründe fiyat yok; bu ürünler fiyatsız basılır. Fiyatı ürün sayfasından ekleyebilirsin.`,
            `${missingPrices} of the chosen products have no price and are printed without one. Add it on the product page.`,
          )}
        </Hint>
      ) : null}

      <SectionLabel trailing={`${chosen.length} / ${products.length}`}>
        {copy('Ürünler', 'Products')}
      </SectionLabel>
      {projectsQuery.isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator color={brand.gold} />
        </View>
      ) : products.length ? (
        <Group padding={0}>
          {products.map((project, index) => {
            const on = !excluded.has(project.id);
            const title = project.title?.trim() || copy('Ürün', 'Product');
            const price = formatPrice(project.priceAmount, project.priceCurrency, getLocale());
            return (
              <View key={project.id}>
                {index ? <View style={styles.rule} /> : null}
                <Pressable
                  accessibilityLabel={title}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(project.id)}
                  style={({ pressed }) => [styles.product, pressed && styles.pressed]}
                >
                  <Image
                    accessibilityIgnoresInvertColors
                    resizeMode="cover"
                    source={{
                      uri: `${apiBaseUrl}/v1/assets/${encodeURIComponent(project.outputAssetId!)}/content`,
                      headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
                    }}
                    style={[styles.thumb, !on && styles.dimmed]}
                  />
                  <View style={styles.productCopy}>
                    <Text numberOfLines={1} style={styles.productTitle}>
                      {title}
                    </Text>
                    <Text numberOfLines={1} style={styles.productMeta}>
                      {price ?? copy('Fiyat yok', 'No price')}
                    </Text>
                  </View>
                  <Ionicons
                    color={on ? brand.gold : brand.textMuted}
                    name={on ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                  />
                </Pressable>
              </View>
            );
          })}
        </Group>
      ) : (
        <InfoNote
          icon="images-outline"
          title={copy('Henüz hazır ürün yok', 'No finished products yet')}
        >
          {copy(
            'Kataloğa eklemek için önce stüdyoda en az bir ürün görseli üret.',
            'Generate at least one product image in the studio to add it to a catalog.',
          )}
        </InfoNote>
      )}
      {overLimit ? (
        <Hint>
          {copy(
            `Bir katalog en fazla ${MAX_CATALOG_PRODUCTS} ürün içerebilir.`,
            `A catalog can hold up to ${MAX_CATALOG_PRODUCTS} products.`,
          )}
        </Hint>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  state: { alignItems: 'center', paddingVertical: 32 },
  layouts: { flexDirection: 'row', gap: 12 },
  layout: {
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderColor: brand.surface,
    borderRadius: 18,
    borderWidth: 2,
    flex: 1,
    gap: 2,
    padding: 14,
  },
  layoutSelected: { borderColor: brand.gold },
  sheet: {
    alignContent: 'flex-start',
    aspectRatio: 595 / 842,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    marginBottom: 8,
    padding: 8,
    width: 84,
  },
  cell: { backgroundColor: '#C7C7CC', borderRadius: 3 },
  cellLarge: { height: 40, width: 32 },
  cellSmall: { height: 30, width: 20 },
  layoutTitle: { color: brand.text, fontSize: 15, fontWeight: '600' },
  layoutTitleSelected: { color: brand.gold },
  layoutMeta: { color: brand.textSecondary, fontSize: 13 },
  rule: { backgroundColor: brand.line, height: StyleSheet.hairlineWidth * 2, marginLeft: 84 },
  product: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 72, padding: 12 },
  thumb: { backgroundColor: brand.surfaceRaised, borderRadius: 10, height: 56, width: 56 },
  dimmed: { opacity: 0.35 },
  productCopy: { flex: 1, gap: 2, minWidth: 0 },
  productTitle: { color: brand.text, fontSize: 17, fontWeight: '500' },
  productMeta: { color: brand.textSecondary, fontSize: 13, fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.65 },
});
