'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getExpenses, createExpense } from '@/actions/db';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  Calendar,
  User,
  Tags,
  FileText,
  FileImage,
  Layers
} from 'lucide-react';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Add Expense form state
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('VEGETABLES');
  const [notes, setNotes] = useState('');
  const [billImage, setBillImage] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Load Expenses on mount
  useEffect(() => {
    async function load() {
      try {
        const list = await getExpenses();
        setExpenses(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleReload = async () => {
    const list = await getExpenses();
    setExpenses(list);
  };

  // Submit new expense
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !amount || !expenseDate) return;

    try {
      await createExpense({
        vendor: vendor.trim(),
        amount: parseFloat(amount),
        category,
        notes: notes.trim(),
        billImage: billImage.trim() || undefined,
        date: expenseDate,
      });

      // Clear fields
      setVendor('');
      setAmount('');
      setNotes('');
      setBillImage('');
      setExpenseDate(new Date().toISOString().split('T')[0]);

      handleReload();
      toast.success('Expense logged successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to log expense');
    }
  };

  // Expense categories list
  const categories = [
    'VEGETABLES',
    'GAS',
    'ELECTRICITY',
    'TRANSPORT',
    'KITCHEN_SUPPLIES',
    'SALARY',
    'MISCELLANEOUS',
  ];

  // Calculations for KPI summary cards
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryTotal = (cat: string) => {
    return expenses.filter((e) => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
  };

  // Filter lists
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'ALL' || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="no-print">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Receipt className="w-8 h-8 text-emerald-400" /> Operational Expenses
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Log non-inventory costs, payroll pay sheets, vehicle logistics, utilities, and track general business cash outflow.
        </p>
      </div>

      {/* KPI Tally Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 no-print">
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">TOTAL SPENT</span>
          <span className="text-lg font-bold text-white">₹{totalExpenses.toLocaleString('en-IN')}</span>
        </div>
        {categories.map((cat) => {
          const catSum = getCategoryTotal(cat);
          return (
            <div key={cat} className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
              <span className="text-[9px] text-slate-400 font-semibold block mb-1 truncate" title={cat}>
                {cat.replace('_', ' ')}
              </span>
              <span className="text-sm font-bold text-emerald-400">₹{catSum.toLocaleString('en-IN')}</span>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start no-print">
        
        {/* Left Column (8 cols): Expense Ledger list */}
        <div className="xl:col-span-8 p-6 rounded-2xl glass-panel relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              📂 Operational Expenses Logbook
            </h3>

            {/* Filter controls */}
            <div className="flex flex-wrap gap-2.5 text-xs">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search vendor or notes..."
                  className="pl-8 pr-3 py-1.5 glass-input text-xs text-white w-48"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="px-2.5 py-1.5 bg-[#0d1423] text-white border border-white/10 rounded-lg text-xs"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading ledger logs...</div>
          ) : filteredExpenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse font-sans">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Vendor / Payee</th>
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5">Memo Notes</th>
                    <th className="py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-white/5 transition duration-150">
                      <td className="py-3">{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="py-3 font-semibold text-white">{e.vendor}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                          {e.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 italic max-w-[200px] truncate" title={e.notes || ''}>
                        {e.notes || '-'}
                      </td>
                      <td className="py-3 text-right font-bold text-white">₹{e.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">
              No matching expense logs found. Click log fields on the right to start tracking.
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Log Expense Form */}
        <div className="xl:col-span-4 p-6 rounded-2xl glass-panel relative flex flex-col gap-4 font-sans text-xs">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
            <Plus className="w-5 h-5 text-emerald-400" /> Log Operational Expense
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1" htmlFor="expDate">
                Transaction Date
              </label>
              <input
                id="expDate"
                type="date"
                className="w-full px-3 py-2.5 glass-input text-white text-sm"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1" htmlFor="expVendor">
                Vendor / Payee Name
              </label>
              <input
                id="expVendor"
                type="text"
                className="w-full px-3 py-2.5 glass-input text-white text-sm"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="E.g., Local Veg Market, APSPDCL Power"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1" htmlFor="expCat">
                  Expense Category
                </label>
                <select
                  id="expCat"
                  className="w-full px-3 py-2.5 bg-[#0d1423] text-white border border-white/10 rounded-lg text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1" htmlFor="expAmt">
                  Total Cost (₹)
                </label>
                <input
                  id="expAmt"
                  type="number"
                  step="any"
                  className="w-full px-3 py-2.5 glass-input text-white text-sm"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="₹1200"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1" htmlFor="expImage">
                Bill / Receipt File Reference (Optional)
              </label>
              <input
                id="expImage"
                type="text"
                className="w-full px-3 py-2.5 glass-input text-white text-xs"
                value={billImage}
                onChange={(e) => setBillImage(e.target.value)}
                placeholder="E.g. bill_june_electricity.jpg"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1" htmlFor="expNotes">
                Memo Notes
              </label>
              <textarea
                id="expNotes"
                rows={3}
                className="w-full px-3 py-2.5 glass-input text-white text-xs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Provide details of item breakdown or payment references..."
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition duration-150 border-none cursor-pointer text-sm"
            >
              Log Expense Account
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
