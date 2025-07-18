
import React from 'react';
import type { Item, LatestPrice } from '../types';
import { Card } from './ui/Card';
import { StarIcon } from './icons/Icons';

interface WatchlistProps {
  items: Item[];
  latestPrices: Record<string, LatestPrice>;
  onSelectItem: (item: Item) => void;
}

export const Watchlist: React.FC<WatchlistProps> = ({ items, onSelectItem, latestPrices }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-20 flex flex-col items-center">
        <StarIcon className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Your Watchlist is Empty</h2>
        <p className="text-gray-400">Search for items and click the star icon to add them here.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-6">Your Watchlist</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <Card key={item.id} onClick={() => onSelectItem(item)} isHoverable={true}>
            <div className="flex items-center gap-4">
              <img src={item.icon} alt={item.name} className="w-10 h-10 object-contain" />
              <div className="flex-1">
                <p className="font-bold text-white">{item.name}</p>
                <p className="text-sm text-gray-400">
                  Price: {latestPrices[item.id]?.high?.toLocaleString() || 'N/A'} gp
                </p>
              </div>
              <StarIcon className="w-5 h-5 text-yellow-400" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
