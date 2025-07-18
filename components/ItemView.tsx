
import React, { useState } from 'react';
import type { Item, TimeseriesData, LatestPrice } from '../types';
import { PriceChart } from './PriceChart';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { ArrowLeftIcon, StarIcon, BellIcon, RefreshCwIcon } from './icons/Icons';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { PriceAlert } from '../types';

interface ItemViewProps {
  item: Item;
  latestPrice: LatestPrice;
  timeseriesData: TimeseriesData[];
  isLoading: boolean;
  onBack: () => void;
  onRefresh: (item: Item, timeStep: '5m' | '1h' | '6h') => void;
  watchlist: number[];
  toggleWatchlist: (itemId: number) => void;
}

type TimeStep = '5m' | '1h' | '6h';

export const ItemView: React.FC<ItemViewProps> = ({ item, latestPrice, timeseriesData, isLoading, onBack, onRefresh, watchlist, toggleWatchlist }) => {
  const [activeTimeStep, setActiveTimeStep] = useState<TimeStep>('5m');
  const [alerts, setAlerts] = useLocalStorage<PriceAlert[]>('priceAlerts', []);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  const isWatched = watchlist.includes(item.id);

  const handleTimeStepChange = (timeStep: TimeStep) => {
    setActiveTimeStep(timeStep);
    onRefresh(item, timeStep);
  };
  
  const handleSetAlert = () => {
    const currentPrice = latestPrice?.high ?? 0;
    if(currentPrice > 0) {
        const newAlert: PriceAlert = {
            itemId: item.id,
            targetPrice: currentPrice, // Example: set alert at current price
            condition: 'below'
        };
        setAlerts(prev => [...prev.filter(a => a.itemId !== item.id), newAlert]);
        setShowNotification(`Alert set for ${item.name}! (Feature is for demonstration)`);
        setTimeout(() => setShowNotification(null), 3000);
    }
  };


  return (
    <div>
      {showNotification && (
        <div className="fixed top-5 right-5 bg-emerald-500 text-white py-2 px-4 rounded-lg shadow-lg z-50">
          {showNotification}
        </div>
      )}
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={onBack} variant="ghost" size="icon">
          <ArrowLeftIcon className="w-6 h-6" />
        </Button>
        <img src={item.icon} alt={item.name} className="w-12 h-12 object-contain" />
        <h2 className="text-3xl font-bold text-white flex-1">{item.name}</h2>
        <div className="flex items-center gap-2">
            <Button onClick={() => toggleWatchlist(item.id)} variant="ghost" size="icon" className={isWatched ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}>
              <StarIcon className="w-6 h-6" />
            </Button>
            <Button onClick={handleSetAlert} variant="ghost" size="icon" className="text-gray-400 hover:text-emerald-400">
                <BellIcon className="w-6 h-6" />
            </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-400">Average Price</p>
                <p className="text-3xl font-bold text-white">
                  {latestPrice?.high?.toLocaleString() || 'N/A'} gp
                </p>
              </div>
              <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-lg">
                {(['5m', '1h', '6h'] as TimeStep[]).map(ts => (
                   <Button key={ts} onClick={() => handleTimeStepChange(ts)} variant={activeTimeStep === ts ? 'primary' : 'ghost'} size="sm">
                     {ts}
                   </Button>
                ))}
                 <Button onClick={() => handleTimeStepChange(activeTimeStep)} variant="ghost" size="icon" disabled={isLoading}>
                    {isLoading ? <Loader size="sm" /> : <RefreshCwIcon className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="h-80">
              {isLoading ? <div className="flex items-center justify-center h-full"><Loader /></div> : <PriceChart data={timeseriesData} />}
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card>
            <h3 className="text-xl font-bold text-white mb-4">Item Details</h3>
            <div className="space-y-3 text-sm">
                <p><strong className="text-gray-400">Examine:</strong> {item.examine}</p>
                <p><strong className="text-gray-400">Value:</strong> {item.value.toLocaleString()} gp</p>
                <p><strong className="text-gray-400">High Alch:</strong> {item.highalch.toLocaleString()} gp</p>
                <p><strong className="text-gray-400">Buy Limit:</strong> {item.limit.toLocaleString()}</p>
                <p><strong className="text-gray-400">Members:</strong> {item.members ? 'Yes' : 'No'}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
