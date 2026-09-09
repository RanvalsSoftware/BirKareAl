import type { AppImageSource } from '@/src/types/image';

export type PhotoSelection =
  | {
      kind: 'device';
      uri: string;
      width?: number;
      height?: number;
      fileName?: string | null;
    }
  | {
      kind: 'demo';
      id: string;
      source: AppImageSource;
    };

export type CategoryId =
  | 'fan-selfie'
  | 'background'
  | 'art-filter'
  | 'professional'
  | 'cinematic';

export type FilterId =
  | 'natural'
  | 'cinematic'
  | 'pop-art'
  | 'drip-art'
  | 'hdr'
  | 'black-white'
  | 'vintage'
  | 'bokeh'
  | 'cyberpunk'
  | 'watercolor'
  | 'sketch'
  | 'cartoon'
  | 'warm-studio';

export type FilterGroup = 'all' | 'natural' | 'art' | 'cinematic' | 'professional';
