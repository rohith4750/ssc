'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface ChartData {
  name: string;
  Sales: number;
  Expenses: number;
}

interface DashboardChartsProps {
  financialData: ChartData[];
}

export default function DashboardCharts({ financialData }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sales vs Expenses Bar Chart */}
      <div className="p-6 rounded-2xl glass-panel glow-green">
        <h3 className="text-base font-semibold text-white mb-6">Sales & Expenses Performance</h3>
        <div className="h-80 w-full font-sans text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={financialData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0d1423',
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: '0.75rem',
                  color: '#fff',
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="Sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Total Revenue (₹)" />
              <Bar dataKey="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Total Expenses (₹)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Net Profit Trend Area Chart */}
      <div className="p-6 rounded-2xl glass-panel glow-amber">
        <h3 className="text-base font-semibold text-white mb-6">Net Profit Margin</h3>
        <div className="h-80 w-full font-sans text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={financialData.map((d) => ({
                name: d.name,
                Profit: d.Sales - d.Expenses,
              }))}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0d1423',
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: '0.75rem',
                  color: '#fff',
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Area
                type="monotone"
                dataKey="Profit"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorProfit)"
                name="Net Profit (₹)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
