import React, { useState, useMemo, useEffect } from 'react';
import type { Investment, Item, LatestPrice, TimeseriesData } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { BriefcaseIcon, Trash2Icon } from './icons/Icons';
import { getHighResImageUrl, createIconDataUrl } from '../utils/image';
import { SellInvestmentModal } from './SellInvestmentModal';
import { Loader } from './ui/Loader';
import { fetchTimeseries } from '../services/osrsWikiApi';
import { PortfolioChart } from './PortfolioChart';


interface PortfolioPageProps {
  investments: Investment[];
  items: Record<string, Item>;
  latestPrices: Record<string, LatestPrice>;
  onCloseInvestment: (investmentId: string, sellData: { sell_price: number; sell_date: string; tax_paid: number; }) => Promise<void>;
  onClearPortfolio: () => Promise<void>;
  onDeleteInvestment: (investmentId: string) => Promise<void>;
}

type TimeRange = '1M' | '3M' | '1Y' | 'ALL';

const ProfitText: React.FC<{ value: number }> = ({ value }) => {
    const colorClass = value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-gray-400';
    const sign = value > 0 ? '+' : '';
    return <span className={colorClass}>{sign}{value.toLocaleString()} gp</span>;
};

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ investments, items, latestPrices, onCloseInvestment, onClearPortfolio, onDeleteInvestment }) => {
    const [investmentToSell, setInvestmentToSell] = useState<Investment | null>(null);
    const [investmentToDelete, setInvestmentToDelete] = useState<Investment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    
    // State for portfolio chart
    const [portfolioHistory, setPortfolioHistory] = useState<{ date: string; value: number }[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('1M');

    useEffect(() => {
        const calculateHistory = async () => {
            const openPositionsForHistory = investments.filter(inv => inv.sell_price === null);
            if (openPositionsForHistory.length === 0) {
                setPortfolioHistory([]);
                setIsHistoryLoading(false);
                return;
            }

            setIsHistoryLoading(true);

            const itemIds = [...new Set(openPositionsForHistory.map(inv => inv.item_id))];
            
            const timeseriesResponses = await Promise.allSettled(
                itemIds.map(id => fetchTimeseries(id, '6h'))
            );

            const priceDataMap = new Map<number, { timestamp: number; price: number }[]>();
            timeseriesResponses.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const itemId = itemIds[index];
                    const cleanedData = result.value
                        .map(d => ({ timestamp: d.timestamp, price: d.avgHighPrice }))
                        .filter(d => d.price !== null) as { timestamp: number; price: number }[];
                    priceDataMap.set(itemId, cleanedData.sort((a,b) => a.timestamp - b.timestamp));
                }
            });

            const getStartDate = () => {
                const now = new Date();
                switch (timeRange) {
                    case '1M': return new Date(now.setMonth(now.getMonth() - 1));
                    case '3M': return new Date(now.setMonth(now.getMonth() - 3));
                    case '1Y': return new Date(now.setFullYear(now.getFullYear() - 1));
                    case 'ALL':
                        const firstPurchaseDate = investments.reduce((earliest, inv) => {
                            const d = new Date(inv.purchase_date);
                            return d < earliest ? d : earliest;
                        }, new Date());
                        return firstPurchaseDate;
                }
            };

            const startDate = getStartDate();
            startDate.setHours(0,0,0,0);
            const endDate = new Date();
            const dateArray: Date[] = [];
            for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
                dateArray.push(new Date(dt));
            }

            const history = dateArray.map(date => {
                const dateTimestamp = date.getTime();
                let dailyValue = 0;

                openPositionsForHistory.forEach(inv => {
                    const purchaseDate = new Date(inv.purchase_date);
                    purchaseDate.setHours(0,0,0,0);
                    
                    if (purchaseDate.getTime() <= dateTimestamp) {
                        const itemPriceHistory = priceDataMap.get(inv.item_id);
                        let priceOnDate = inv.purchase_price;

                        if (itemPriceHistory && itemPriceHistory.length > 0) {
                            const pricePoint = [...itemPriceHistory].reverse().find(p => p.timestamp * 1000 <= dateTimestamp);
                            if (pricePoint) {
                                priceOnDate = pricePoint.price;
                            }
                        }
                        dailyValue += inv.quantity * priceOnDate;
                    }
                });

                return { date: date.toISOString().split('T')[0], value: dailyValue };
            });

            setPortfolioHistory(history);
            setIsHistoryLoading(false);
        };

        calculateHistory();
    }, [investments, timeRange]);

    const handleConfirmClear = async () => {
        setIsClearing(true);
        try {
            await onClearPortfolio();
        } catch (error) {
            console.error("Failed to clear portfolio", error);
        } finally {
            setIsClearing(false);
            setIsClearConfirmOpen(false);
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!investmentToDelete) return;
        setIsDeleting(true);
        try {
            await onDeleteInvestment(investmentToDelete.id);
            setInvestmentToDelete(null); // Close modal on success
        } catch (error) {
            console.error("Failed to delete investment", error);
            // Optionally: show an error message to the user here
        } finally {
            setIsDeleting(false);
        }
    };


    const { openPositions, closedPositions } = useMemo(() => {
        return investments.reduce<{ openPositions: Investment[], closedPositions: Investment[] }>((acc, inv) => {
            if (inv.sell_price === null) {
                acc.openPositions.push(inv);
            } else {
                acc.closedPositions.push(inv);
            }
            return acc;
        }, { openPositions: [], closedPositions: [] });
    }, [investments]);
    
    const summaryStats = useMemo(() => {
        let totalValue = 0;
        let unrealisedProfit = 0;
        let realisedProfit = 0;
        let totalTaxPaid = 0;

        openPositions.forEach(inv => {
            const currentPrice = latestPrices[inv.item_id]?.high ?? 0;
            const purchaseValue = inv.purchase_price * inv.quantity;
            const currentValue = currentPrice * inv.quantity;
            totalValue += currentValue;
            unrealisedProfit += (currentValue - purchaseValue);
        });

        closedPositions.forEach(inv => {
            if(inv.sell_price !== null) {
                const purchaseValue = inv.purchase_price * inv.quantity;
                const sellValue = inv.sell_price * inv.quantity;
                realisedProfit += (sellValue - purchaseValue);
                totalTaxPaid += inv.tax_paid ?? 0;
            }
        });

        return { totalValue, unrealisedProfit, realisedProfit, totalTaxPaid };
    }, [openPositions, closedPositions, latestPrices]);

    if (investments.length === 0) {
        return (
          <div className="text-center py-20 flex flex-col items-center">
            <BriefcaseIcon className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Your Portfolio is Empty</h2>
            <p className="text-gray-400">Find an item and use the briefcase icon to add your first investment.</p>
          </div>
        );
    }
    
    return (
        <div>
            {investmentToSell && items[investmentToSell.item_id] && (
                <SellInvestmentModal
                    investment={investmentToSell}
                    item={items[investmentToSell.item_id]}
                    latestPrice={latestPrices[investmentToSell.item_id]}
                    onClose={() => setInvestmentToSell(null)}
                    onSave={onCloseInvestment}
                />
            )}
            {investmentToDelete && items[investmentToDelete.item_id] && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-50 flex justify-center items-center p-4">
                    <Card className="max-w-md w-full border-red-500/50">
                        <h3 className="text-xl font-bold text-white mb-2">Delete Investment</h3>
                        <p className="text-gray-300 mb-6">
                            Are you sure you want to delete the investment for{' '}
                            <span className="font-semibold text-white">{investmentToDelete.quantity.toLocaleString()}x {items[investmentToDelete.item_id].name}</span>?
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-4">
                            <Button variant="secondary" onClick={() => setInvestmentToDelete(null)} disabled={isDeleting}>
                                Cancel
                            </Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? <Loader size="sm" /> : 'Confirm & Delete'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
            {isClearConfirmOpen && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-50 flex justify-center items-center p-4">
                    <Card className="max-w-md w-full border-red-500/50">
                        <h3 className="text-xl font-bold text-white mb-2">Confirm Clear Portfolio</h3>
                        <p className="text-gray-300 mb-6">Are you sure? This will permanently delete all open and closed positions. This action cannot be undone.</p>
                        <div className="flex justify-end gap-4">
                            <Button variant="secondary" onClick={() => setIsClearConfirmOpen(false)} disabled={isClearing}>
                                Cancel
                            </Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                onClick={handleConfirmClear}
                                disabled={isClearing}
                            >
                                {isClearing ? <Loader size="sm" /> : 'Confirm & Delete'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">Your Portfolio</h2>
                {investments.length > 0 && (
                    <Button variant="ghost" className="text-gray-400 hover:text-red-400" onClick={() => setIsClearConfirmOpen(true)}>
                        <Trash2Icon className="w-5 h-5 mr-2" />
                        Clear Portfolio
                    </Button>
                )}
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                    <p className="text-sm text-gray-400">Portfolio Value</p>
                    <p className="text-2xl font-bold text-white">{summaryStats.totalValue.toLocaleString()} gp</p>
                </Card>
                <Card>
                    <p className="text-sm text-gray-400">Unrealised P/L</p>
                    <p className="text-2xl font-bold"><ProfitText value={summaryStats.unrealisedProfit} /></p>
                </Card>
                <Card>
                    <p className="text-sm text-gray-400">Realised Profit</p>
                    <p className="text-2xl font-bold"><ProfitText value={summaryStats.realisedProfit} /></p>
                </Card>
                <Card>
                    <p className="text-sm text-gray-400">Total Tax Paid</p>
                    <p className="text-2xl font-bold text-red-400">-{summaryStats.totalTaxPaid.toLocaleString()} gp</p>
                </Card>
            </div>

             {/* Portfolio Performance Chart */}
            <div className="mb-8">
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">Portfolio Performance</h3>
                        <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-lg">
                            {(['1M', '3M', '1Y', 'ALL'] as TimeRange[]).map(range => (
                                <Button
                                    key={range}
                                    size="sm"
                                    variant={timeRange === range ? 'secondary' : 'ghost'}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1 ${timeRange !== range ? 'text-gray-400 hover:text-white' : 'shadow-md'}`}
                                >
                                    {range}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="h-80">
                        {isHistoryLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader />
                            </div>
                        ) : (
                            <PortfolioChart data={portfolioHistory} />
                        )}
                    </div>
                </Card>
            </div>

            {/* Open Positions */}
            <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">Open Positions ({openPositions.length})</h3>
                {openPositions.length > 0 ? (
                    <div className="space-y-4">
                        {openPositions.map(inv => {
                            const item = items[inv.item_id];
                            if (!item) return null;
                            const currentPrice = latestPrices[item.id]?.high ?? 0;
                            const currentValue = currentPrice * inv.quantity;
                            const profit = currentValue - (inv.purchase_price * inv.quantity);
                            return (
                                <Card key={inv.id} className="flex items-center flex-wrap gap-4">
                                    <img src={getHighResImageUrl(item.name)} onError={(e) => { e.currentTarget.src = createIconDataUrl(item.icon); }} alt={item.name} className="w-10 h-10 object-contain bg-gray-700/50 rounded-md"/>
                                    <div className="flex-1 min-w-[150px]">
                                        <p className="font-bold text-white">{item.name}</p>
                                        <p className="text-sm text-gray-400">{inv.quantity.toLocaleString()} @ {inv.purchase_price.toLocaleString()} gp</p>
                                    </div>
                                    <div className="text-sm">
                                        <p className="text-gray-400">Current Value</p>
                                        <p className="font-semibold">{currentValue.toLocaleString()} gp</p>
                                    </div>
                                    <div className="text-sm">
                                        <p className="text-gray-400">Unrealised P/L</p>
                                        <p className="font-semibold"><ProfitText value={profit} /></p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => setInvestmentToSell(inv)}>Sell</Button>
                                        <Button size="icon" variant="ghost" className="w-8 h-8 text-gray-500 hover:text-red-400" onClick={() => setInvestmentToDelete(inv)}>
                                            <Trash2Icon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : <p className="text-gray-500">No open positions.</p>}
            </div>

            {/* Trade History */}
            <div>
                <h3 className="text-2xl font-bold text-white mb-4">Trade History ({closedPositions.length})</h3>
                 {closedPositions.length > 0 ? (
                    <div className="space-y-4">
                        {closedPositions.map(inv => {
                            const item = items[inv.item_id];
                            if (!item || inv.sell_price === null) return null;
                            const profit = (inv.sell_price - inv.purchase_price) * inv.quantity;
                            return (
                                <Card key={inv.id} className="flex items-center flex-wrap gap-4 opacity-70">
                                    <img src={getHighResImageUrl(item.name)} onError={(e) => { e.currentTarget.src = createIconDataUrl(item.icon); }} alt={item.name} className="w-10 h-10 object-contain bg-gray-700/50 rounded-md"/>
                                    <div className="flex-1 min-w-[150px]">
                                        <p className="font-bold text-white">{item.name}</p>
                                        <p className="text-sm text-gray-400">{inv.quantity.toLocaleString()} units</p>
                                    </div>
                                    <div className="text-sm">
                                        <p className="text-gray-400">Buy: {inv.purchase_price.toLocaleString()}</p>
                                        <p className="text-gray-400">Sell: {inv.sell_price.toLocaleString()}</p>
                                    </div>
                                    <div className="flex-grow flex items-center justify-between gap-4">
                                        <div className="text-sm">
                                            <p className="text-gray-400">Realised P/L</p>
                                            <p className="font-semibold"><ProfitText value={profit} /></p>
                                        </div>
                                        <Button size="icon" variant="ghost" className="w-8 h-8 text-gray-500 hover:text-red-400" onClick={() => setInvestmentToDelete(inv)}>
                                            <Trash2Icon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : <p className="text-gray-500">No completed trades yet.</p>}
            </div>
        </div>
    );
};