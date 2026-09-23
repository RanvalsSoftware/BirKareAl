import type { ImageSourcePropType } from 'react-native';
import { EIGHTIES_TREND_IDS, trendPresets, type TrendPresetId } from './presets';
const artwork: Record<TrendPresetId, ImageSourcePropType> = {
  kpop_star: require('../../../assets/trends/kpop.png'),
  pop_icon_80s: require('../../../assets/trends/80-pop.webp'),
  romantic_dinner_80s: require('../../../assets/trends/80-romantik-yemek.webp'),
  romantic_closeup_80s: require('../../../assets/trends/80-yakin-portre.webp'),
  analog_90s: require('../../../assets/trends/90-analog.png'),
  y2k_celebrity: require('../../../assets/trends/celebrity.png'),
  red_carpet_glam: require('../../../assets/trends/red-carpet.png'),
  editorial_cover: require('../../../assets/trends/magazine.png'),
  old_money_portrait: require('../../../assets/trends/old-money.png'),
  streetwear_editorial: require('../../../assets/trends/streetwear.png'),
  neon_club_night: require('../../../assets/trends/neon.png'),
};
export const trends = trendPresets.map((preset) => ({ ...preset, source: artwork[preset.id] }));
export const featuredTrends = trends.filter(
  (trend) => !['romantic_dinner_80s', 'romantic_closeup_80s'].includes(trend.id),
);
export const eightiesTrends = EIGHTIES_TREND_IDS.map((id) => {
  const trend = trends.find((entry) => entry.id === id);
  if (!trend) throw new Error(`Missing 80s trend metadata for ${id}`);
  return trend;
});
export const beautySceneImage = require('../../../assets/beauty/main.png');
