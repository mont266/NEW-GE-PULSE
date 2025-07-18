
export interface Item {
  id: number;
  name: string;
  examine: string;
  icon: string;
  members: boolean;
  lowalch: number;
  highalch: number;
  limit: number;
  value: number;
}

export interface TimeseriesData {
  timestamp: number;
  avgHighPrice: number | null;
  avgLowPrice: number | null;
  highPriceVolume: number;
  lowPriceVolume: number;
}

export interface LatestPrice {
  high: number | null;
  highTime: number | null;
  low: number | null;
  lowTime: number | null;
}

export interface PriceAlert {
  itemId: number;
  targetPrice: number;
  condition: 'above' | 'below';
}
