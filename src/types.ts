export type TempBand = 'freezing' | 'cold' | 'chilly' | 'mild' | 'warm' | 'hot';

export interface WeatherSummary {
  city: string;
  tempNow: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  precipProb: number;
  precipSum: number;
  windSpeed: number;
  weatherCode: number;
}

export type StyleId = 'oldmoney' | 'casual' | 'formal' | 'minimal';

export interface OutfitItems {
  outer?: string;
  top: string;
  bottom: string;
  shoes: string;
  acc?: string;
}

export interface Outfit {
  id: string;
  style: StyleId;
  bands: TempBand[];
  name: string;
  items: OutfitItems;
  tip: string;
  /** 이 코디의 "조용한 포인트" 한 줄 (FR-14) */
  point: string;
  rainOk: boolean;
  palette: string[];
}

export interface Advice {
  id: string;
  text: string;
  emphasis: boolean;
}

export interface City {
  name: string;
  region?: string;
  latitude: number;
  longitude: number;
}
