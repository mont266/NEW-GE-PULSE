



import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import { fetchItemMapping, fetchTimeseries, fetchLatestPrices } from './services/osrsWikiApi';
import { fetchUserWatchlist, addToWatchlist, removeFromWatchlist, getProfile, fetchUserInvestments, addInvestment, closeInvestment, clearUserInvestments, deleteInvestment } from './services/database';
import type { Item, TimeseriesData, LatestPrice, Profile, PriceAlert, Investment } from './types';
import { SearchBar } from './components/SearchBar';
import { ItemView } from './components/ItemView';
import { Watchlist } from './components/Watchlist';
import { AlertsPage } from './components/AlertsPage';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { ProfilePage } from './components/ProfilePage';
import { PortfolioPage } from './components/PortfolioPage';
import { AddInvestmentModal } from './components/AddInvestmentModal';
import { PulseIcon, SearchIcon, StarIcon, UserIcon, LogOutIcon, SettingsIcon, UserSquareIcon, BellIcon, LogInIcon, BriefcaseIcon } from './components/icons/Icons';
import { Loader } from './components/ui/Loader';
import { Button } from './components/ui/Button';
import { useLocalStorage } from './hooks/useLocalStorage';
import { TooltipWrapper } from './components/ui/Tooltip';


type View = 'search' | 'watchlist' | 'item' | 'profile' | 'alerts' | 'portfolio';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('search');
  const [items, setItems] = useState<Record<string, Item>>({});
  const [latestPrices, setLatestPrices] = useState<Record<string, LatestPrice>>({});
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isItemLoading, setIsItemLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Auth and Profile State ---
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const initialRoutingDone = useRef(false);


  // --- Watchlist, Alerts, and Portfolio State ---
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [alerts, setAlerts] = useLocalStorage<PriceAlert[]>('priceAlerts', []);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [watchlistTimeseries, setWatchlistTimeseries] = useState<Record<string, TimeseriesData[]>>({});
  const [isAddInvestmentModalOpen, setIsAddInvestmentModalOpen] = useState(false);
  const [investmentModalItem, setInvestmentModalItem] = useState<Item | null>(null);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Supabase Auth & Profile Listener ---
  useEffect(() => {
    const fetchSessionAndProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) {
            const userProfile = await getProfile(session.user.id);
            setProfile(userProfile);
            if (userProfile && !userProfile.username) {
                setIsProfileModalOpen(true); // Prompt for username if not set
            }
        }
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        if (session) {
            setIsAuthModalOpen(false); // Close auth modal on login
            const userProfile = await getProfile(session.user.id);
            setProfile(userProfile);
            if (userProfile && !userProfile.username) {
                setIsProfileModalOpen(true);
            }
        } else {
            setProfile(null);
            setCurrentView('search'); // Go to search on logout
        }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // --- Fetch User Data (Watchlist, Investments) from DB on Login ---
  useEffect(() => {
    if (session) {
      const loadUserData = async () => {
        try {
          const [userWatchlist, userInvestments] = await Promise.all([
            fetchUserWatchlist(session.user.id),
            fetchUserInvestments(session.user.id)
          ]);
          setWatchlist(userWatchlist);
          setInvestments(userInvestments);
        } catch (err) {
          console.error("Failed to load user data", err);
        }
      };
      loadUserData();
    } else {
      setWatchlist([]);
      setInvestments([]);
    }
  }, [session]);

  // --- Fetch Watchlist Timeseries Data ---
  useEffect(() => {
    const fetchWatchlistTimeseries = async () => {
      if (watchlist.length === 0) {
        setWatchlistTimeseries({});
        return;
      }

      const itemsToFetch = watchlist.filter(id => watchlistTimeseries[id] === undefined);
      if (itemsToFetch.length === 0) return;

      const results = await Promise.allSettled(
        itemsToFetch.map(id => fetchTimeseries(id, '1h'))
      );
      
      const newTimeseries: Record<string, TimeseriesData[]> = {};
      results.forEach((result, index) => {
        const itemId = itemsToFetch[index];
        if (result.status === 'fulfilled') {
          newTimeseries[itemId] = result.value.sort((a, b) => a.timestamp - b.timestamp);
        } else {
          console.error(`Failed to fetch timeseries for item ${itemId}:`, result.reason);
          newTimeseries[itemId] = []; // Mark as failed/empty
        }
      });
      
      setWatchlistTimeseries(prev => ({ ...prev, ...newTimeseries }));
    };

    if (currentView === 'watchlist') {
      fetchWatchlistTimeseries();
    }
  }, [currentView, watchlist, watchlistTimeseries]);


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
  
  const handleSelectTimedItem = useCallback(async (item: Item, timeStep: '5m' | '1h' | '6h' = '1h') => {
    setIsItemLoading(true);
    setSelectedItem(item);
    setCurrentView('item');
    try {
      const data = await fetchTimeseries(item.id, timeStep);
      const sortedData = data.sort((a, b) => a.timestamp - b.timestamp);
      setTimeseries(sortedData);
    } catch (err)      {
      setError(`Failed to load price data for ${item.name}.`);
      console.error(err);
    } finally {
      setIsItemLoading(false);
    }
  }, []);

  const handleItemSelection = useCallback((item: Item) => {
    handleSelectTimedItem(item);
  }, [handleSelectTimedItem]);
  
  // --- Initial Hash-based Routing ---
  useEffect(() => {
    // This effect runs once on page load after the initial data is fetched.
    // It checks for a URL hash like '#/item/123' to deep-link to an item.
    if (isLoading || Object.keys(items).length === 0 || initialRoutingDone.current) {
        return;
    }

    const hash = window.location.hash;
    if (hash.startsWith('#/item/')) {
        initialRoutingDone.current = true; // Mark as done to prevent re-routing on state changes
        const itemIdStr = hash.substring('#/item/'.length);
        const itemId = parseInt(itemIdStr, 10);
        if (!isNaN(itemId) && items[itemId]) {
            handleItemSelection(items[itemId]);
        }
    } else {
        // If there's no valid item hash, mark routing as done so we don't re-check
        initialRoutingDone.current = true;
    }
  }, [items, isLoading, handleItemSelection]);

  const switchView = (view: View) => {
    setCurrentView(view);
    // Clear item-specific state when navigating to a list view
    if (view !== 'item') {
        setSelectedItem(null);
        setTimeseries([]);
    }
  };

  const showProfilePage = () => {
    switchView('profile');
    setIsProfileMenuOpen(false);
  }

  const handleBack = () => {
    switchView('search');
  }

  const toggleWatchlist = useCallback(async (itemId: number) => {
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }
    if (profile && !profile.username) {
        setIsProfileModalOpen(true);
        return;
    }
    const isWatched = watchlist.includes(itemId);
    const userId = session.user.id;
    if (isWatched) {
      setWatchlist(prev => prev.filter(id => id !== itemId));
      try {
        await removeFromWatchlist(userId, itemId);
      } catch (err) {
        setWatchlist(prev => [...prev, itemId]);
      }
    } else {
      setWatchlist(prev => [...prev, itemId]);
      try {
        await addToWatchlist(userId, itemId);
      } catch (err) {
        setWatchlist(prev => prev.filter(id => id !== itemId));
      }
    }
  }, [session, profile, watchlist]);
  
  const watchlistItems = useMemo(() => {
    return watchlist.map(id => items[id]).filter(Boolean);
  }, [watchlist, items]);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsProfileMenuOpen(false);
    switchView('search');
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  const handleOpenAddInvestmentModal = (item: Item) => {
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }
    setInvestmentModalItem(item);
    setIsAddInvestmentModalOpen(true);
  };

  const handleSaveInvestment = async (investmentData: Omit<Investment, 'id' | 'user_id' | 'created_at'>) => {
    if (!session) throw new Error("User not authenticated");
    const newInvestment = await addInvestment({ ...investmentData, user_id: session.user.id });
    setInvestments(prev => [newInvestment, ...prev]);
  };

  const handleCloseInvestment = async (investmentId: string, sellData: { sell_price: number; sell_date: string; tax_paid: number; }) => {
    const updatedInvestment = await closeInvestment(investmentId, sellData);
    setInvestments(prev => prev.map(inv => inv.id === investmentId ? updatedInvestment : inv));
  };

  const handleClearPortfolio = async () => {
    if (!session) throw new Error("User not authenticated");
    await clearUserInvestments(session.user.id);
    setInvestments([]);
  };

  const handleDeleteInvestment = async (investmentId: string) => {
    if (!session) throw new Error("User not authenticated");
    await deleteInvestment(investmentId);
    setInvestments(prev => prev.filter(inv => inv.id !== investmentId));
  };

  const getNavButtonClasses = (viewName: View, disabled = false) => {
    const base = 'flex items-center justify-center md:justify-start md:gap-3 p-3 md:px-4 md:py-2 rounded-lg transition-colors w-full text-left';
    if (disabled) {
        return `${base} text-gray-500 cursor-not-allowed`;
    }
    if (currentView === viewName) {
        return `${base} bg-emerald-500/20 text-emerald-300`;
    }
    return `${base} hover:bg-gray-700/50`;
  };

  const renderContent = () => {
    if (isLoading && !initialRoutingDone.current) {
      return <div className="flex justify-center items-center h-full pt-20"><Loader /></div>;
    }
    if (error && currentView !== 'item') {
      return <div className="text-center text-red-400 mt-8">{error}</div>;
    }
    
    switch (currentView) {
      case 'item':
        if (!selectedItem) return null;
        return (
          <ItemView
            item={selectedItem}
            latestPrice={latestPrices[selectedItem.id]}
            timeseriesData={timeseries}
            isLoading={isItemLoading}
            onBack={handleBack}
            onRefresh={handleSelectTimedItem}
            watchlist={watchlist}
            toggleWatchlist={toggleWatchlist}
            alerts={alerts}
            setAlerts={setAlerts}
            onOpenAddInvestmentModal={handleOpenAddInvestmentModal}
          />
        );
      case 'search':
        return <SearchBar items={Object.values(items)} onSelectItem={handleItemSelection} latestPrices={latestPrices} />;
      case 'watchlist':
        return <Watchlist 
                  items={watchlistItems} 
                  onSelectItem={handleItemSelection} 
                  latestPrices={latestPrices} 
                  timeseries={watchlistTimeseries}
               />;
      case 'alerts':
        return <AlertsPage
                 alerts={alerts}
                 setAlerts={setAlerts}
                 items={items}
                 latestPrices={latestPrices}
                 onSelectItem={handleItemSelection}
               />;
      case 'portfolio':
        return <PortfolioPage 
                  investments={investments}
                  items={items}
                  latestPrices={latestPrices}
                  onCloseInvestment={handleCloseInvestment}
                  onClearPortfolio={handleClearPortfolio}
                  onDeleteInvestment={handleDeleteInvestment}
                />;
      case 'profile':
        if (!profile) return null;
        const ownProfileForView: Profile = {
            ...profile,
            watchlists: watchlist.map(item_id => ({ item_id }))
        };
        return <ProfilePage
                  key={ownProfileForView.id}
                  profile={ownProfileForView}
                  items={items}
                  latestPrices={latestPrices}
                  onSelectItem={handleItemSelection}
                  onBack={handleBack}
               />
      default:
        return null;
    }
  };

  return (
    <>
      {isAuthModalOpen && !session && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}
      {isProfileModalOpen && profile && (
        <ProfileModal
            profile={profile}
            onClose={() => setIsProfileModalOpen(false)}
            onProfileUpdate={handleProfileUpdate}
        />
      )}
      {isAddInvestmentModalOpen && investmentModalItem && (
        <AddInvestmentModal
          item={investmentModalItem}
          latestPrice={latestPrices[investmentModalItem.id]}
          onClose={() => setIsAddInvestmentModalOpen(false)}
          onSave={handleSaveInvestment}
        />
      )}
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col md:flex-row">
        <header className="md:w-64 bg-gray-800/50 backdrop-blur-sm p-4 md:p-6 md:h-screen md:flex md:flex-col md:border-r md:border-gray-700/50 sticky top-0 md:static z-20">
          <div className="flex items-center gap-3 mb-8">
            <PulseIcon className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white tracking-tighter hidden md:block">GE Pulse</h1>
          </div>
          <nav className="flex md:flex-col gap-2">
            <button
              onClick={() => switchView('search')}
              className={getNavButtonClasses('search')}
            >
              <SearchIcon className="w-5 h-5" />
              <span className="font-medium hidden md:inline">Search</span>
            </button>
            <TooltipWrapper text="Login to use your Watchlist" show={!session}>
              <button
                onClick={() => switchView('watchlist')}
                disabled={!session}
                className={getNavButtonClasses('watchlist', !session)}
              >
                <StarIcon className="w-5 h-5" />
                <span className="font-medium hidden md:inline">Watchlist</span>
              </button>
            </TooltipWrapper>
            <TooltipWrapper text="Login to track your Portfolio" show={!session}>
              <button
                onClick={() => switchView('portfolio')}
                disabled={!session}
                className={getNavButtonClasses('portfolio', !session)}
              >
                <BriefcaseIcon className="w-5 h-5" />
                <span className="font-medium hidden md:inline">Portfolio</span>
              </button>
            </TooltipWrapper>
            <TooltipWrapper text="Login to set Price Alerts" show={!session}>
              <button
                onClick={() => switchView('alerts')}
                disabled={!session}
                className={getNavButtonClasses('alerts', !session)}
              >
                <BellIcon className="w-5 h-5" />
                <span className="font-medium hidden md:inline">Alerts</span>
              </button>
            </TooltipWrapper>
          </nav>
          
          <div className="md:mt-auto pt-4 border-t border-gray-700/50 relative" ref={profileMenuRef}>
            {session && profile ? (
              <>
                {isProfileMenuOpen && (
                  <div className="absolute bottom-full mb-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1">
                     <button onClick={showProfilePage} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 rounded-md">
                      <UserSquareIcon className="w-5 h-5" />
                      <span>My Profile</span>
                    </button>
                    <button onClick={() => { setIsProfileModalOpen(true); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 rounded-md">
                      <SettingsIcon className="w-5 h-5" />
                      <span>Profile Settings</span>
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700/50 rounded-md">
                      <LogOutIcon className="w-5 h-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setIsProfileMenuOpen(prev => !prev)}
                  className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-700/50"
                  disabled={isProfileModalOpen} // Disable button while profile modal is open
                >
                  <UserIcon className="w-6 h-6 p-1 bg-emerald-500/20 text-emerald-300 rounded-full" />
                  <span className="font-medium text-sm truncate hidden md:inline">{profile.username || profile.email}</span>
                </button>
              </>
            ) : !session ? (
                <Button onClick={() => setIsAuthModalOpen(true)} variant="secondary" className="w-full justify-center md:justify-start">
                   <LogInIcon className="w-5 h-5 md:mr-2" />
                  <span className="hidden md:inline">Login / Sign Up</span>
                </Button>
            ) : (
                <div className="flex items-center justify-center h-10">
                    <Loader size="sm" />
                </div>
            )}
          </div>
        </header>
        
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {renderContent()}
          <footer className="mt-16 pt-6 border-t border-gray-700/50 text-center text-xs text-gray-500">
            <p className="font-semibold">GE Pulse - Beta V1.0</p>
            <p className="mt-2">
              Not affiliated with Jagex Ltd. All item data and images are sourced from the OSRS Wiki.
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}