
import React, { useState, useMemo } from 'react';
import type { Item, LatestPrice } from '../types';
import { Card } from './ui/Card';

interface SearchBarProps {
  items: Item[];
  latestPrices: Record<string, LatestPrice>;
  onSelectItem: (item: Item) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ items, onSelectItem, latestPrices }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return items
      .filter(item => item.name.toLowerCase().includes(lowercasedTerm))
      .slice(0, 50); // Limit results for performance
  }, [searchTerm, items]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="sticky top-0 z-10 bg-gray-900 py-4">
        <input
          type="text"
          placeholder="Search for an item (e.g., 'Abyssal whip')"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg text-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
        />
      </div>

      {searchTerm && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
         {filteredItems.map(item => (
           <Card key={item.id} onClick={() => onSelectItem(item)} isHoverable={true}>
              <div className="flex items-center gap-4">
                <img src={item.icon} alt={item.name} className="w-10 h-10 object-contain" />
                <div className="flex-1">
                  <p className="font-bold text-white">{item.name}</p>
                  <p className="text-sm text-gray-400">
                    Price: {latestPrices[item.id]?.high?.toLocaleString() || 'N/A'} gp
                  </p>
                </div>
              </div>
           </Card>
         ))}
       </div>
      )}
      {!searchTerm && (
        <div className="text-center py-20">
          <p className="text-gray-400">Start typing to search for items on the Grand Exchange.</p>
        </div>
      )}
    </div>
  );
};
