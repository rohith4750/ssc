'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  getInventory,
  recordInventoryTransaction,
  getInventoryTransactions,
  addInventoryItem
} from '@/actions/db';
import {
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Plus,
  X,
  History,
  Info,
  DollarSign,
  TrendingDown,
  ChevronRight
} from 'lucide-react';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Transaction Form States
  const [activeItem, setActiveItem] = useState<any | null>(null);
  const [transactionType, setTransactionType] = useState<'PURCHASED' | 'CONSUMED' | 'ADJUSTED'>('PURCHASED');
  const [qty, setQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');

  // Add Item Modal States
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemMinStock, setNewItemMinStock] = useState('10');

  // Load Data
  useEffect(() => {
    async function load() {
      try {
        const inv = await getInventory();
        const txs = await getInventoryTransactions();
        setInventory(inv);
        setTransactions(txs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleReload = async () => {
    const inv = await getInventory();
    const txs = await getInventoryTransactions();
    setInventory(inv);
    setTransactions(txs);
  };

  // Record stock transaction
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem || !qty) return;

    try {
      await recordInventoryTransaction({
        inventoryItemId: activeItem.id,
        type: transactionType,
        quantity: parseFloat(qty),
        unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
        notes: notes.trim(),
      });

      // Clear forms
      setQty('');
      setUnitPrice('');
      setNotes('');
      setActiveItem(null);
      
      handleReload();
      toast.success('Inventory ledger updated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update inventory transaction');
    }
  };

  // Add Inventory Item
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    try {
      await addInventoryItem({
        name: newItemName.trim(),
        unit: newItemUnit,
        minStockLevel: parseFloat(newItemMinStock) || 0,
      });

      // Clear
      setNewItemName('');
      setNewItemUnit('kg');
      setNewItemMinStock('10');
      setShowAddItem(false);

      handleReload();
      toast.success('New inventory item added successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add inventory item');
    }
  };

  const handleOpenTransaction = (item: any, type: 'PURCHASED' | 'CONSUMED' | 'ADJUSTED') => {
    setActiveItem(item);
    setTransactionType(type);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="w-8 h-8 text-emerald-400" /> Kitchen Inventory Stock
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track daily raw materials stock, manage consumption logs, restock purchases, and view automatic restock warning indicators.
          </p>
        </div>
        <button
          onClick={() => setShowAddItem(true)}
          className="flex items-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/10 border-none transition duration-150 cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add New Stock Item</span>
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start no-print">
        
        {/* Left Column (7 cols) - Current Stocks List */}
        <div className="xl:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl glass-panel relative">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              📦 Current Ingredients Stock Status
            </h3>

            {loading ? (
              <div className="p-12 text-center text-slate-500">Loading stock registers...</div>
            ) : inventory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inventory.map((item) => {
                  const isLow = item.currentStock <= item.minStockLevel;
                  return (
                    <div
                      key={item.id}
                      className={`p-5 rounded-2xl glass-card border relative overflow-hidden flex flex-col justify-between h-44 ${
                        isLow ? 'border-amber-500/20 bg-amber-500/5 glow-amber' : 'border-white/5 bg-white/5'
                      }`}
                    >
                      <div>
                        {/* Title */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 gap-2">
                          <div>
                            <span className="font-bold text-white text-base block">{item.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-0.5">
                              Alert Limit: {item.minStockLevel} {item.unit}
                            </span>
                          </div>
                          {isLow && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" /> LOW STOCK
                            </span>
                          )}
                        </div>

                        {/* Large Current Stock Print */}
                        <div className="mt-3.5">
                          <span className="text-3xl font-extrabold tracking-tight text-white">
                            {item.currentStock}
                          </span>
                          <span className="text-sm font-semibold text-slate-400 ml-1.5">{item.unit}</span>
                        </div>
                      </div>

                      {/* Quick Actions Buttons */}
                      <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3 mt-3">
                        <button
                          onClick={() => handleOpenTransaction(item, 'PURCHASED')}
                          className="flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg transition border border-emerald-500/10 cursor-pointer"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Restock</span>
                        </button>
                        <button
                          onClick={() => handleOpenTransaction(item, 'CONSUMED')}
                          className="flex items-center justify-center gap-1 py-1.5 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg transition border border-red-500/10 cursor-pointer"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>Consume</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">
                No inventory item types created. Create Rice, Dal etc.
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols) - Transactions History Ledger */}
        <div className="xl:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl glass-panel relative">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" /> Recent Inventory Logs
            </h3>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin divide-y divide-white/5">
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex flex-col sm:flex-row justify-between items-start gap-3 py-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs">{tx.inventoryItem.name}</span>
                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold ${
                          tx.type === 'PURCHASED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          tx.type === 'CONSUMED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {tx.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Logged on: {new Date(tx.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {tx.notes && <span className="text-[10px] text-slate-400 italic block mt-0.5">"{tx.notes}"</span>}
                    </div>

                    <div className="text-right">
                      <span className={`font-bold text-sm block ${
                        tx.type === 'PURCHASED' ? 'text-emerald-400' : tx.type === 'CONSUMED' ? 'text-red-400' : 'text-slate-200'
                      }`}>
                        {tx.type === 'PURCHASED' ? '+' : tx.type === 'CONSUMED' ? '-' : ''}
                        {tx.quantity} {tx.inventoryItem.unit}
                      </span>
                      {tx.type === 'PURCHASED' && tx.unitPrice && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          @ ₹{tx.unitPrice}/{tx.inventoryItem.unit}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">No stock transactions logged yet.</div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Stock Transaction Input Overlay Modal */}
      {activeItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel glow-green space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {transactionType === 'PURCHASED' ? <ArrowUpRight className="w-5 h-5 text-emerald-400" /> : <ArrowDownLeft className="w-5 h-5 text-red-400" />}
                <span>Record {transactionType} - {activeItem.name}</span>
              </h3>
              <button
                onClick={() => setActiveItem(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="space-y-4 text-xs font-sans">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] text-slate-300">
                Current Stock Level: <strong className="text-white">{activeItem.currentStock} {activeItem.unit}</strong>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Quantity ({activeItem.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  className="w-full px-3 py-2.5 glass-input text-white text-sm"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="Enter quantity amount..."
                  required
                />
              </div>

              {transactionType === 'PURCHASED' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Unit Purchase Price (₹ per {activeItem.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="w-full px-3 py-2.5 glass-input text-white text-sm"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="Enter cost per unit..."
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    * This will automatically create an Expense log in Kitchen Supplies category.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notes / Invoice Ref</label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 glass-input text-white text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., purchased from local store, daily cooking consumption"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition border-none text-sm cursor-pointer"
              >
                Log Transaction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Inventory Item Type Overlay Modal */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel glow-green space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" /> Create Inventory Item Type
              </h3>
              <button
                onClick={() => setShowAddItem(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Item Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 glass-input text-white text-sm"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="E.g. Rice, Oil, Dal, Gas Cylinders"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Measurement Unit</label>
                  <select
                    className="w-full px-3 py-2.5 bg-[#0d1423] text-white border border-white/10 rounded-lg text-sm"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="liter">liter (Liters)</option>
                    <option value="cylinder">cylinder (Units)</option>
                    <option value="packet">packet (Units)</option>
                    <option value="box">box (Units)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Min Alert Stock Level</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 glass-input text-white text-sm"
                    value={newItemMinStock}
                    onChange={(e) => setNewItemMinStock(e.target.value)}
                    placeholder="10"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition border-none text-sm cursor-pointer"
              >
                Register Item Type
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
