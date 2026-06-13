import React from 'react';
import { getDashboardStats } from '@/actions/db';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Beef,
  UtensilsCrossed,
  Receipt
} from 'lucide-react';
import Link from 'next/link';
import DashboardCharts from '@/components/dashboard-charts';

export const revalidate = 0; // force dynamic rendering

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  // Seed trend chart with last 5 months + current month
  const currentMonthName = new Date().toLocaleString('default', { month: 'short' });
  const financialData = [
    { name: 'Jan', Sales: 85000, Expenses: 52000 },
    { name: 'Feb', Sales: 98000, Expenses: 61000 },
    { name: 'Mar', Sales: 115000, Expenses: 73000 },
    { name: 'Apr', Sales: 102000, Expenses: 68000 },
    { name: 'May', Sales: 125000, Expenses: 80000 },
    { name: currentMonthName, Sales: stats.revenueMonth, Expenses: stats.expensesMonth },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time operations & financials for Sri Sandilyasa Caterers.
          </p>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-semibold">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {stats.lowStockCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex gap-3 text-amber-200 glow-amber">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-sm block">Low Stock Warning!</span>
            <p className="text-xs text-amber-300/90 mt-0.5">
              The following inventory items are below minimum levels: {stats.lowStockItems.join(', ')}.
            </p>
            <Link
              href="/inventory"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 mt-2 inline-flex items-center gap-1 transition"
            >
              Go to Inventory Stock <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* KPI Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Today's Sales */}
        <div className="p-6 rounded-2xl glass-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl translate-x-4 -translate-y-4" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Sales</span>
            <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-white">₹{stats.salesToday.toLocaleString('en-IN')}</h2>
            <p className="text-[10px] text-emerald-400 font-medium">Cashflow received: ₹{stats.cashflowToday.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Today's Expenses */}
        <div className="p-6 rounded-2xl glass-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl translate-x-4 -translate-y-4" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Expenses</span>
            <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/20">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-white">₹{stats.expensesToday.toLocaleString('en-IN')}</h2>
            <p className="text-[10px] text-slate-400">Includes materials & salary wages</p>
          </div>
        </div>

        {/* Today's Net profit */}
        <div className="p-6 rounded-2xl glass-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl translate-x-4 -translate-y-4" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Net Profit</span>
            <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className={`text-2xl font-bold tracking-tight ${stats.profitToday >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.profitToday < 0 ? '-' : ''}₹{Math.abs(stats.profitToday).toLocaleString('en-IN')}
            </h2>
            <p className="text-[10px] text-slate-400">Sales minus expenses</p>
          </div>
        </div>

        {/* Pending Catering Payments */}
        <div className="p-6 rounded-2xl glass-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl translate-x-4 -translate-y-4" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Receivables</span>
            <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/20">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-amber-400">₹{stats.pendingCateringPayments.toLocaleString('en-IN')}</h2>
            <p className="text-[10px] text-slate-400">Outstanding catering bills</p>
          </div>
        </div>
      </div>

      {/* Operational Widgets grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Core numbers widgets */}
        <div className="xl:col-span-1 p-6 rounded-2xl glass-panel flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white mb-4">Operational Status</h3>
            <div className="space-y-4">
              {/* Workers active */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-medium text-slate-200">Staff Present Today</span>
                </div>
                <span className="text-base font-bold text-white bg-emerald-500/20 px-3 py-1 rounded-lg">
                  {stats.workerAttendanceToday}
                </span>
              </div>

              {/* Low stock count */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-medium text-slate-200">Low Stock Thresholds</span>
                </div>
                <span className={`text-base font-bold px-3 py-1 rounded-lg ${stats.lowStockCount > 0 ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 bg-white/5'}`}>
                  {stats.lowStockCount}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-white/5 pt-6 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/lunch-packs"
                className="flex items-center gap-2 p-3 bg-white/5 hover:bg-emerald-500/15 hover:border-emerald-500/20 rounded-xl border border-white/5 transition text-xs font-semibold text-slate-200"
              >
                <Beef className="w-4 h-4 text-emerald-400" />
                <span>Lunch Scanner</span>
              </Link>
              <Link
                href="/catering"
                className="flex items-center gap-2 p-3 bg-white/5 hover:bg-emerald-500/15 hover:border-emerald-500/20 rounded-xl border border-white/5 transition text-xs font-semibold text-slate-200"
              >
                <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
                <span>Catering Order</span>
              </Link>
              <Link
                href="/expenses"
                className="flex items-center gap-2 p-3 bg-white/5 hover:bg-emerald-500/15 hover:border-emerald-500/20 rounded-xl border border-white/5 transition text-xs font-semibold text-slate-200"
              >
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Log Expense</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Dynamic visual graphs */}
        <div className="xl:col-span-2">
          <DashboardCharts financialData={financialData} />
        </div>
      </div>
    </div>
  );
}
