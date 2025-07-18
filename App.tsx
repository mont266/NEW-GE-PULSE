
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchItemMapping, fetchTimeseries, fetchLatestPrices } from './services/osrsWikiApi';
import type { Item, TimeseriesData, LatestPrice } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { SearchBar } from './components/SearchBar';
import { ItemView } from './components/ItemView';
import { Watchlist } from './components/Watchlist';
import { PulseIcon, SearchIcon, StarIcon } from './components/icons/Icons';
import { Loader } from './components/ui/Loader';

type ActiveTab = 'search' | 'watchlist';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [items, setItems] = useState<Record<string, Item>>({});
  const [latestPrices, setLatestPrices] = useState<Record<string, LatestPrice>>({});
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isItemLoading, setIsItemLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [watchlist, setWatchlist] = useLocalStorage<number[]>('watchlist', []);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        const [itemMapping, prices] = await Promise.all([fetchItemMapping(), fetchLatestPrices()]);
        
        const itemMap: Record<string, Item> = {};
        itemMapping.forEach(item => {
            itemMap[item.id] = item;
        });
        
        setItems(itemMap);
        setLatestPrices(prices);
      } catch (err) {
        setError('Failed to load initial item data. Please try refreshing the page.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    initializeData();
  }, []);

  const handleSelectTimedItem = useCallback(async (item: Item, timeStep: '5m' | '1h' | '6h' = '5m') => {
    setIsItemLoading(true);
    setSelectedItem(item);
    try {
      const data = await fetchTimeseries(item.id, timeStep);
      setTimeseries(data);
    } catch (err) {
      setError(`Failed to load price data for ${item.name}.`);
      console.error(err);
    } finally {
      setIsItemLoading(false);
    }
  }, []);
  
  const handleSelectItem = (item: Item) => handleSelectTimedItem(item, '5m');

  const clearSelectedItem = () => {
    setSelectedItem(null);
    setTimeseries([]);
  };

  const toggleWatchlist = (itemId: number) => {
    setWatchlist(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };
  
  const watchlistItems = useMemo(() => {
    return watchlist.map(id => items[id]).filter(Boolean);
  }, [watchlist, items]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-full pt-20"><Loader /></div>;
    }

    if (error && !selectedItem) {
      return <div className="text-center text-red-400 mt-8">{error}</div>;
    }
    
    if (selectedItem) {
      return (
        <ItemView
          item={selectedItem}
          latestPrice={latestPrices[selectedItem.id]}
          timeseriesData={timeseries}
          isLoading={isItemLoading}
          onBack={clearSelectedItem}
          onRefresh={handleSelectTimedItem}
          watchlist={watchlist}
          toggleWatchlist={toggleWatchlist}
        />
      );
    }

    switch (activeTab) {
      case 'search':
        return <SearchBar items={Object.values(items)} onSelectItem={handleSelectItem} latestPrices={latestPrices} />;
      case 'watchlist':
        return <Watchlist items={watchlistItems} onSelectItem={handleSelectItem} latestPrices={latestPrices} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col md:flex-row">
      <header className="md:w-64 bg-gray-800/50 backdrop-blur-sm p-4 md:p-6 md:h-screen md:flex md:flex-col md:border-r md:border-gray-700/50 sticky top-0 md:static z-20">
        <div className="flex items-center gap-3 mb-8">
          <PulseIcon className="w-8 h-8 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white tracking-tighter">GE Pulse</h1>
        </div>
        <nav className="flex md:flex-col gap-2">
          <button
            onClick={() => { setActiveTab('search'); clearSelectedItem(); }}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${activeTab === 'search' && !selectedItem ? 'bg-emerald-500/20 text-emerald-300' : 'hover:bg-gray-700/50'}`}
          >
            <SearchIcon className="w-5 h-5" />
            <span className="font-medium">Search</span>
          </button>
          <button
            onClick={() => { setActiveTab('watchlist'); clearSelectedItem(); }}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${activeTab === 'watchlist' && !selectedItem ? 'bg-emerald-500/20 text-emerald-300' : 'hover:bg-gray-700/50'}`}
          >
            <StarIcon className="w-5 h-5" />
            <span className="font-medium">Watchlist</span>
          </button>
        </nav>
      </header>
      
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}
