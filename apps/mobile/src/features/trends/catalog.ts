import type { ImageSourcePropType } from 'react-native';
import { EIGHTIES_TREND_IDS, trendPresets, type TrendPresetId } from './presets';
const artwork: Record<TrendPresetId, ImageSourcePropType> = {
  kpop_star: require('../../../assets/trends/kpop.webp'),
  pop_icon_80s: require('../../../assets/trends/80-pop.webp'),
  romantic_dinner_80s: require('../../../assets/trends/80-romantik-yemek.webp'),
  romantic_closeup_80s: require('../../../assets/trends/80-yakin-portre.webp'),
  analog_90s: require('../../../assets/trends/90-analog.webp'),
  y2k_celebrity: require('../../../assets/trends/celebrity.webp'),
  red_carpet_glam: require('../../../assets/trends/red-carpet.webp'),
  editorial_cover: require('../../../assets/trends/magazine.webp'),
  old_money_portrait: require('../../../assets/trends/old-money.webp'),
  streetwear_editorial: require('../../../assets/trends/streetwear.webp'),
  neon_club_night: require('../../../assets/trends/neon.webp'),
};
export const trends = trendPresets.map((preset) => ({
  id: preset.id,
  get name() {
    return preset.name;
  },
  get description() {
    return preset.description;
  },
  get detail() {
    return preset.detail;
  },
  source: artwork[preset.id],
}));
export const featuredTrends = trends.filter(
  (trend) => !['romantic_dinner_80s', 'romantic_closeup_80s'].includes(trend.id),
);
export const eightiesTrends = EIGHTIES_TREND_IDS.map((id) => {
  const trend = trends.find((entry) => entry.id === id);
  if (!trend) throw new Error(`Missing 80s trend metadata for ${id}`);
  return trend;
});
export const beautySceneImage = require('../../../assets/beauty/main.webp');
