
export interface Participant {
  nome: string;
  [key: string]: any;
}

export interface LayoutConfig {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
}

export enum Step {
  UPLOAD_TEMPLATE = 1,
  AI_ANALYSIS = 2,
  UPLOAD_LIST = 3,
  GENERATION = 4,
  COMPLETE = 5
}

export interface GenerationProgress {
  total: number;
  current: number;
  status: string;
}
