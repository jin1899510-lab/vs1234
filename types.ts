
export enum StudioStyle {
  CINEMATIC_FOOD = 'CINEMATIC_FOOD',
  TOP_DOWN_GOURMET = 'TOP_DOWN_GOURMET',
  SIZZLING_BBQ = 'SIZZLING_BBQ',
  COZY_INTERIOR = 'COZY_INTERIOR',
  AESTHETIC_LIFESTYLE = 'AESTHETIC_LIFESTYLE'
}

export interface StudioPreset {
  id: StudioStyle;
  name: string;
  description: string;
  thumbnail: string;
  prompt: string;
}

export interface TransformationResult {
  originalUrl: string;
  resultUrl: string;
  timestamp: number;
}
