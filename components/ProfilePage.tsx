


import React, { useMemo } from 'react';
import type { Item, LatestPrice, Profile } from '../types';
import { WatchlistGrid } from './WatchlistGrid';
import { UserIcon, ArrowLeftIcon } from './icons/Icons';
import { Button } from './ui/Button';

interface ProfilePageProps {
  profile: Profile;
  items: Record<string, Item>;
  latestPrices: Record<string, LatestPrice>;
  onSelectItem: (item: Item) => void;
  onBack: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ profile, items, latestPrices, onSelectItem, onBack }) => {

  const watchlistItems = useMemo(() => {
    if (!profile?.watchlists || !items) return [];
    return profile.watchlists.map(watchlistItem => items[watchlistItem.item_id]).filter(Boolean);
  }, [profile, items]);

  if (!profile) {
    return null; // Should not happen if parent component handles this
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Button onClick={onBack} variant="ghost" size="icon" className="mr-2 self-start">
            <ArrowLeftIcon className="w-6 h-6" />
        </Button>
        <UserIcon className="w-16 h-16 p-3 bg-gray-800 text-emerald-400 rounded-full border-2 border-gray-700"/>
        <div>
            <p className="text-sm text-gray-400">Profile</p>
            <h1 className="text-4xl font-bold text-white">{profile.username}</h1>
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">
            {profile.username}'s Watchlist ({watchlistItems.length})
        </h2>
        {watchlistItems.length > 0 ? (
            <WatchlistGrid
                items={watchlistItems}
                latestPrices={latestPrices}
                onSelectItem={onSelectItem}
                timeseries={{}} // No sparklines on profile page for simplicity
            />
        ) : (
            <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-lg">
                <p className="text-gray-500">This user's watchlist is empty.</p>
            </div>
        )}
      </div>
    </div>
  );
};
