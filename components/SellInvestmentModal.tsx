import React, { useState, useMemo } from 'react';
import type { Item, LatestPrice, Investment } from '../types';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { XIcon } from './icons/Icons';
import { getHighResImageUrl, createIconDataUrl, parseShorthandPrice, calculateGeTax } from '../utils/image';

interface SellInvestmentModalProps {
  investment: Investment;
  item: Item;
  latestPrice: LatestPrice;
  onClose: () => void;
  onSave: (investmentId: string, sellData: { sell_price: number; sell_date: string; tax_paid: number; }) => Promise<void>;
}

const ProfitText: React.FC<{ value: number }> = ({ value }) => {
    const colorClass = value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-gray-400';
    const sign = value > 0 ? '+' : '';
    return <span className={`${colorClass} font-semibold`}>{sign}{value.toLocaleString()} gp</span>;
};


export const SellInvestmentModal: React.FC<SellInvestmentModalProps> = ({ investment, item, latestPrice, onClose, onSave }) => {
  const [price, setPrice] = useState((latestPrice?.low ?? item.value).toString());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedPrice = useMemo(() => parseShorthandPrice(price), [price]);

  const tax = useMemo(() => {
    if (isNaN(parsedPrice)) return 0;
    return calculateGeTax(item.name, parsedPrice, investment.quantity);
  }, [item.name, parsedPrice, investment.quantity]);
  
  const estimatedProfit = useMemo(() => {
    if (isNaN(parsedPrice)) return 0;
    const totalPurchaseValue = investment.purchase_price * investment.quantity;
    const totalSellValue = parsedPrice * investment.quantity;
    return (totalSellValue - totalPurchaseValue) - tax;
  }, [parsedPrice, investment, tax]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const numPrice = parsedPrice;

    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Sell price must be a positive number. You can use "k" for thousands and "m" for millions.');
      setLoading(false);
      return;
    }
    if (!date) {
        setError('Please select a valid date.');
        setLoading(false);
        return;
    }

    try {
      await onSave(investment.id, {
        sell_price: numPrice,
        sell_date: new Date(date).toISOString(),
        tax_paid: tax,
      });
      onClose();
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-80 z-40 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md relative border border-gray-700/50"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={onClose} aria-label="Close modal">
          <XIcon className="w-6 h-6" />
        </Button>

        <div className="flex items-center gap-4 mb-4">
            <img 
                src={getHighResImageUrl(item.name)} 
                onError={(e) => { e.currentTarget.src = createIconDataUrl(item.icon); }}
                alt={item.name} 
                className="w-12 h-12 object-contain bg-gray-700/50 rounded-md"
            />
            <div>
                <h2 className="text-xl font-bold text-white">Close Position</h2>
                <p className="text-gray-300">{investment.quantity.toLocaleString()}x {item.name}</p>
            </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-md mb-4" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="sell-price" className="block text-sm font-medium text-gray-300 mb-1">Sell Price (each)</label>
            <input
              id="sell-price"
              type="text"
              placeholder="e.g., 120k or 3.5m"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
            />
             {price && !isNaN(parsedPrice) && (
                <p className="text-xs text-gray-400 mt-1">
                    Parsed value: {parsedPrice.toLocaleString()} gp
                </p>
            )}
          </div>
          <div>
            <label htmlFor="sell-date" className="block text-sm font-medium text-gray-300 mb-1">Sell Date</label>
            <input
              id="sell-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
            />
          </div>
          {price && !isNaN(parsedPrice) && (
            <div className="text-sm text-gray-400 mt-3 bg-gray-900/50 p-3 rounded-md space-y-2">
                <div className="flex justify-between items-center">
                    <span>GE Tax:</span>
                    <span className="font-semibold text-red-400">-{tax.toLocaleString()} gp</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                    <span>Estimated Profit:</span>
                    <ProfitText value={estimatedProfit} />
                </div>
            </div>
          )}
          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
            {loading ? <Loader size="sm" /> : 'Confirm Sale'}
          </Button>
        </form>
      </div>
    </div>
  );
};