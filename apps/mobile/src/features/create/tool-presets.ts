import { standardCreationSelection, type CreateFlow } from './createFlow';

/** Reuses validated production modes; artwork is illustrative, never the user's source. */
const toolPresets: Record<string, Partial<CreateFlow>> = {
  background: {
    mode: 'background',
    sceneId: 'scene-alpine-lake',
    styleId: 'filter-natural',
    customInstruction:
      'Yalnızca arka planı seçilen dağ gölü sahnesiyle değiştir. Kaynak kişinin yüzünü, saç tellerini, kıyafetini, pozunu ve ifadesini koru. Zemine temas, gölge, perspektif ve ışık sıcaklığını eşleştir; kesilmiş kenar veya hale oluşturma.',
  },
  light: {
    mode: 'filter',
    styleId: 'filter-natural',
    filterIntensity: 35,
    customInstruction:
      'Yalnızca ışığı iyileştir. Kaynaktaki baskın ışık yönünü takip ederek yumuşak pencere ışığı hissi, dengeli pozlama ve doğal beyaz ayarı uygula. Karanlık bölgelerde ayrıntıyı koru, parlak alanları patlatma. Mekânı, nesneleri, kişiyi, pozu ve kıyafeti değiştirme; cildi turuncuya boyama, yeni pencere veya mobilya ekleme.',
  },
  portrait: {
    mode: 'portrait',
    styleId: 'filter-studio',
    composition: 'Yakın',
    customInstruction:
      'Kaynak kişinin yüz geometrisini, yaşını, ifadesini, saçını ve kıyafetini koruyan doğal bir portre hazırla. Sade koyu gri fonda yandan gelen yumuşak pencere ışığı, gözlerde küçük doğal yansımalar ve kontrollü dolgu kullan. Gözenekleri koru; yüzü inceltme, makyaj veya yeni aksesuar ekleme.',
  },
  extend: {
    mode: 'filter',
    styleId: 'filter-natural',
    aspectRatio: '16:9',
    filterIntensity: 10,
    customInstruction:
      'Fotoğrafın tuvalini seçilen çıktı oranına doğru genişlet (outpainting). Mevcut görüntüyü mümkün olduğunca aynen koru; kişiyi veya nesneleri büyütme, esnetme, kopyalama ya da kesme. Yalnızca dış kenarlara kaynaktaki ortamın mantıklı devamını üret. Ufuk, zemin, perspektif, doku, ışık ve yansımaları kesintisiz sürdür. Kaynakta olmayan balon, manzara veya insan ekleme; çerçeve ve bulanık dolgu kullanma.',
  },
};

export function getToolPreset(slug: string): Partial<CreateFlow> | null {
  if (!Object.hasOwn(toolPresets, slug)) return null;
  return standardCreationSelection({
    toolId: slug,
    sceneId: null,
    personId: null,
    styleId: null,
    preserveFace: true,
    preserveClothes: true,
    ...toolPresets[slug],
  });
}
