'use client';

import React, { useState, useEffect } from 'react';
import { getReportStats } from '@/actions/db';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Coffee,
  Soup,
  UtensilsCrossed,
  Receipt,
  Search,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  // Date states - defaults to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handleFetchReport();
  }, []);

  const handleFetchReport = async () => {
    setLoading(true);
    try {
      const stats = await getReportStats(startDate, endDate);
      setReport(stats);
    } catch (e) {
      console.error(e);
      alert('Failed to load report logs');
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel Workbook with multiple sheets
  const handleExportExcel = () => {
    if (!report) return;

    // Sheet 1: Financial Overview
    const overviewData = [
      { Metric: 'Gross Sales Revenue', Amount: report.totalSales },
      { Metric: 'Curry Point Sales', Amount: report.totalCurry },
      { Metric: 'Daily Lunch Pack Sales', Amount: report.totalLunch },
      { Metric: 'Bulk Orders Sales', Amount: report.totalBulk },
      { Metric: 'Total Operating Expenses', Amount: report.totalExpenses },
      { Metric: 'Net Operating Profit', Amount: report.netProfit },
    ];

    // Sheet 2: Curry Sales Logs
    const curryLogs = report.currySales.map((item: any) => ({
      ID: item.id.slice(0, 8),
      Date: new Date(item.date).toLocaleDateString('en-IN'),
      Items: JSON.stringify(item.items),
      Total: item.totalAmount,
      Method: item.paymentMethod,
    }));

    // Sheet 3: Daily Lunch Logs
    const lunchLogs = report.lunchSales.map((item: any) => ({
      Date: new Date(item.date).toLocaleDateString('en-IN'),
      Customer: item.customerId,
      Name: item.customer.name || 'N/A',
      'Pack Type': item.packType,
      Rice: item.withRice ? 'Yes' : 'No',
      Total: item.totalAmount,
      Status: item.paymentStatus,
    }));

    // Sheet 4: Expenses Logs
    const expenseLogs = report.expenses.map((item: any) => ({
      Date: new Date(item.date).toLocaleDateString('en-IN'),
      Vendor: item.vendor,
      Category: item.category,
      Notes: item.notes || '',
      Amount: item.amount,
    }));

    const wb = XLSX.utils.book_new();

    const wsOverview = XLSX.utils.json_to_sheet(overviewData);
    const wsCurry = XLSX.utils.json_to_sheet(curryLogs);
    const wsLunch = XLSX.utils.json_to_sheet(lunchLogs);
    const wsExpenses = XLSX.utils.json_to_sheet(expenseLogs);

    XLSX.utils.book_append_sheet(wb, wsOverview, 'Financial Overview');
    XLSX.utils.book_append_sheet(wb, wsCurry, 'Curry Point Sales');
    XLSX.utils.book_append_sheet(wb, wsLunch, 'Lunch Pack Sales');
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Operating Expenses');

    XLSX.writeFile(wb, `SSC_Report_${startDate}_to_${endDate}.xlsx`);
  };

  // Print Report PDF
  const handlePrintReport = () => {
    window.print();
  };

  // Data processing for charts
  const revenueChartData = report
    ? [
        { name: 'Curry Point', value: report.totalCurry, color: '#10b981' },
        { name: 'Lunch Packs', value: report.totalLunch, color: '#059669' },
        { name: 'Bulk Orders', value: report.totalBulk, color: '#34d399' },
      ].filter((d) => d.value > 0)
    : [];

  const getExpensesByCategory = () => {
    if (!report) return [];
    const catMap: Record<string, number> = {};
    report.expenses.forEach((e: any) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });

    const colors = ['#f59e0b', '#d97706', '#ef4444', '#f87171', '#3b82f6', '#10b981', '#6b7280'];
    return Object.keys(catMap).map((cat, index) => ({
      name: cat.replace('_', ' '),
      value: catMap[cat],
      color: colors[index % colors.length],
    }));
  };

  const expenseChartData = getExpensesByCategory();

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner - Hidden in print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-emerald-400" /> Business Reports & Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Analyze profit & loss statements, query customizable date filters, export ledgers to Excel worksheets, and print summaries.
          </p>
        </div>
        
        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-xl text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              className="bg-transparent text-white border-none focus:outline-none focus:ring-0 text-xs"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span>to</span>
            <input
              type="date"
              className="bg-transparent text-white border-none focus:outline-none focus:ring-0 text-xs"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button
            onClick={handleFetchReport}
            className="py-2 px-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl border-none cursor-pointer transition shrink-0"
          >
            Load Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 no-print">Compiling report ledgers...</div>
      ) : report ? (
        <>
          {/* Print Only Header */}
          <div className="print-only hidden print-report-container space-y-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #10b981', paddingBottom: '15px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#10b981' }}>SRI SANDILYASA CATERERS</h2>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Traditional Catering • Kakinada, AP</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>FINANCIAL PERFORMANCE REPORT</h3>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Period: ${startDate} to ${endDate}</div>
              </div>
            </div>
          </div>

          {/* Action Row - Hidden in print */}
          <div className="flex justify-end gap-3 no-print">
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl border-none cursor-pointer transition shadow-lg shadow-emerald-500/10"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Print Report PDF</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-white/10 cursor-pointer transition"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Export Consolidated Excel</span>
            </button>
          </div>

          {/* Financial Summary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gross Revenue */}
            <div className="p-6 rounded-2xl glass-card border border-white/5 relative overflow-hidden print:border-solid print:border print:border-black/10">
              <div className="flex items-center justify-between mb-4 no-print">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Sales Revenue</span>
                <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <h4 className="print-only hidden text-xs font-semibold text-slate-500 uppercase">Gross Sales Revenue</h4>
              <div className="space-y-1">
                <h2 className="text-3xl font-extrabold tracking-tight text-white print:text-black">
                  ₹{report.totalSales.toLocaleString('en-IN')}
                </h2>
                <p className="text-[10px] text-slate-400">Total billings generated in range</p>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="p-6 rounded-2xl glass-card border border-white/5 relative overflow-hidden print:border-solid print:border print:border-black/10">
              <div className="flex items-center justify-between mb-4 no-print">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operating Expenses</span>
                <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <h4 className="print-only hidden text-xs font-semibold text-slate-500 uppercase">Operating Expenses</h4>
              <div className="space-y-1">
                <h2 className="text-3xl font-extrabold tracking-tight text-white print:text-black">
                  ₹{report.totalExpenses.toLocaleString('en-IN')}
                </h2>
                <p className="text-[10px] text-slate-400">Total outflows (Supplies, wages, utilities)</p>
              </div>
            </div>

            {/* Net Operating Profit */}
            <div className="p-6 rounded-2xl glass-card border border-white/5 relative overflow-hidden print:border-solid print:border print:border-black/10">
              <div className="flex items-center justify-between mb-4 no-print">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Operating Profit</span>
                <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <h4 className="print-only hidden text-xs font-semibold text-slate-500 uppercase">Net Operating Profit</h4>
              <div className="space-y-1">
                <h2 className={`text-3xl font-extrabold tracking-tight print:text-black ${
                  report.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {report.netProfit < 0 ? '-' : ''}₹{Math.abs(report.netProfit).toLocaleString('en-IN')}
                </h2>
                <p className="text-[10px] text-slate-400">Net bottom-line profit margin</p>
              </div>
            </div>
          </div>

          {/* Visual Analytics Charts - Hidden in Print */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
            
            {/* Sales Distribution */}
            <div className="p-6 rounded-2xl glass-panel relative">
              <h3 className="text-base font-bold text-white mb-6">Revenue Streams Distribution</h3>
              {revenueChartData.length > 0 ? (
                <div className="h-64 w-full font-sans text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {revenueChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0d1423',
                          borderColor: 'rgba(255,255,255,0.08)',
                          borderRadius: '0.75rem',
                          color: '#fff',
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 text-xs">No sales revenue recorded in this period</div>
              )}
            </div>

            {/* Expense Distribution */}
            <div className="p-6 rounded-2xl glass-panel relative">
              <h3 className="text-base font-bold text-white mb-6">Operating Expenses Breakdown</h3>
              {expenseChartData.length > 0 ? (
                <div className="h-64 w-full font-sans text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expenseChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0d1423',
                          borderColor: 'rgba(255,255,255,0.08)',
                          borderRadius: '0.75rem',
                          color: '#fff',
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 text-xs">No expenses recorded in this period</div>
              )}
            </div>
          </div>

          {/* Itemized Lists Ledger Details - Hidden in standard print, but styled for full ledger printing if desired */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Sales ledger list */}
            <div className="p-6 rounded-2xl glass-panel relative print:bg-white print:text-black print:border-solid print:border print:border-black/10 print:shadow-none">
              <h3 className="text-base font-bold text-white mb-4 print:text-black">Sales Activity Ledger</h3>
              <div className="max-h-96 overflow-y-auto pr-1 scrollbar-thin divide-y divide-white/5 print:divide-black/10">
                {report.lunchTransactionsCount + report.curryOrdersCount + report.bulkOrdersCount > 0 ? (
                  <>
                    {/* Curry POS Logs */}
                    {report.currySales.map((c: any) => (
                      <div key={c.id} className="flex justify-between py-2.5 text-xs">
                        <div>
                          <span className="font-semibold text-slate-200 print:text-black">Curry POS Checkout</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(c.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} &bull; Mode: {c.paymentMethod}
                          </span>
                        </div>
                        <span className="font-bold text-white print:text-black">₹{c.totalAmount}</span>
                      </div>
                    ))}
                    {/* Daily Lunch checkins */}
                    {report.lunchSales.map((l: any) => (
                      <div key={l.id} className="flex justify-between py-2.5 text-xs">
                        <div>
                          <span className="font-semibold text-slate-200 print:text-black">Lunch pack ({l.customerId})</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(l.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} &bull; {l.packType} Pack &bull; {l.paymentStatus}
                          </span>
                        </div>
                        <span className="font-bold text-white print:text-black">₹{l.totalAmount}</span>
                      </div>
                    ))}
                    {/* Bulk Orders */}
                    {report.bulkSales.map((b: any) => (
                      <div key={b.id} className="flex justify-between py-2.5 text-xs">
                        <div>
                          <span className="font-semibold text-slate-200 print:text-black">Bulk Order ({b.customerName})</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} &bull; Qty: {b.quantity} &bull; {b.status}
                          </span>
                        </div>
                        <span className="font-bold text-white print:text-black">₹{b.totalAmount}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">No sales recorded in this period</div>
                )}
              </div>
            </div>

            {/* Expenses ledger list */}
            <div className="p-6 rounded-2xl glass-panel relative print:bg-white print:text-black print:border-solid print:border print:border-black/10 print:shadow-none">
              <h3 className="text-base font-bold text-white mb-4 print:text-black">Operational Expenses Ledger</h3>
              <div className="max-h-96 overflow-y-auto pr-1 scrollbar-thin divide-y divide-white/5 print:divide-black/10">
                {report.expenses.length > 0 ? (
                  report.expenses.map((e: any) => (
                    <div key={e.id} className="flex justify-between py-2.5 text-xs">
                      <div>
                        <span className="font-semibold text-slate-200 print:text-black">{e.vendor}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} &bull; Category: {e.category.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="font-bold text-white print:text-black">₹{e.amount}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">No expenses logged in this period</div>
                )}
              </div>
            </div>

          </div>
        </>
      ) : (
        <div className="p-12 text-center text-slate-500 no-print">Select Date Range and Load Report</div>
      )}
    </div>
  );
}
