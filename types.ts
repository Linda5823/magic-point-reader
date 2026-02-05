
export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface TextBlock {
  text: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
}

export interface OCRResult {
  blocks: TextBlock[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  SPEAKING = 'SPEAKING',
  TRANSLATING = 'TRANSLATING',
  ERROR = 'ERROR'
}

export type TranslationMode = 'ORIGINAL' | 'TRANSLATE_EN' | 'TRANSLATE_ZH' | 'TRANSLATE_ES';
