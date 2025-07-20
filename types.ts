
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

export interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  watchlists?: { item_id: number }[];
}

export interface Investment {
  id: string; // Using string for UUID from the database
  user_id: string;
  item_id: number;
  quantity: number;
  purchase_price: number;
  purchase_date: string; // Stored as ISO 8601 format string
  sell_price: number | null;
  sell_date: string | null; // Stored as ISO 8601 format string
  tax_paid: number | null;
  created_at: string;
}