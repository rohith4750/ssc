'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Soup,
  UtensilsCrossed,
  Users,
  Package,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Beef
} from 'lucide-react';

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const role = user?.role || 'ADMIN';

  const allMenuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Lunch Packs', path: '/lunch-packs', icon: Beef, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    // { name: 'Curry Point POS', path: '/curry-point', icon: Soup, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    // { name: 'Catering Orders', path: '/catering', icon: UtensilsCrossed, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Worker Payroll', path: '/workers', icon: Users, roles: ['ADMIN'] },
    { name: 'Inventory Stock', path: '/inventory', icon: Package, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Expenses', path: '/expenses', icon: Receipt, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['ADMIN'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const menuItems = allMenuItems.filter((item) => item.roles.includes(role));

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile top navigation bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#faf6ee] border-b border-[#871a1d]/10 sticky top-0 z-40 no-print">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="SSC Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-[#871a1d] tracking-wider font-sans">SSC</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 text-slate-500 hover:text-[#871a1d] transition rounded-lg hover:bg-black/5 border-none cursor-pointer bg-transparent"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar background overlay for mobile */}
      {isOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden no-print"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#faf6ee] border-r border-[#871a1d]/10 z-50 flex flex-col transition-transform duration-300 md:translate-x-0 no-print ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-[#871a1d]/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="SSC Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(181,148,16,0.3)]" />
            </div>
            <div>
              <span className="font-bold text-[#871a1d] tracking-wider text-[15px] block leading-tight font-sans">Sri Sandilyasa</span>
              <span className="text-[9px] text-[#b59410] font-semibold tracking-widest uppercase font-sans">Caterers</span>
            </div>
          </div>
          <button className="md:hidden text-slate-500 hover:text-[#871a1d] border-none bg-transparent cursor-pointer" onClick={toggleSidebar}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="mx-4 my-4 p-4 rounded-xl glass-card flex items-center gap-3 font-sans">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#871a1d] to-[#b59410] flex items-center justify-center text-white font-bold border border-white/10 shrink-0">
            {user?.name ? user.name[0].toUpperCase() : 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Administrator'}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#871a1d]/10 text-[#871a1d] border border-[#871a1d]/20 uppercase tracking-wider">
              {user?.role || 'ADMIN'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-thin font-sans">
          {menuItems.map((item) => {
            const Icon = item.icon;

            if (item.path === '/lunch-packs') {
              const searchParams = useSearchParams();
              const currentView = searchParams.get('view') || 'orders';
              const isActiveParent = pathname === '/lunch-packs';

              return (
                <div key={item.name} className="space-y-1">
                  {/* Parent Section Title */}
                  <div
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#871a1d] bg-[#871a1d]/5 border-l-4 border-[#b59410]/60`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-[#871a1d]" />
                    <span>{item.name}</span>
                  </div>
                  {/* Sub-menu nested list */}
                  <div className="pl-4 ml-6 space-y-1 border-l border-[#871a1d]/10 mt-1">
                    <Link
                      href="/lunch-packs?view=customers"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActiveParent && currentView === 'customers'
                        ? 'bg-[#871a1d]/10 text-[#871a1d] border-l-2 border-[#871a1d]'
                        : 'text-slate-600 hover:text-[#871a1d] hover:bg-[#871a1d]/5'
                        }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#b59410]/60 shrink-0" />
                      <span>Customers</span>
                    </Link>
                    <Link
                      href="/lunch-packs?view=orders"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActiveParent && currentView === 'orders'
                        ? 'bg-[#871a1d]/10 text-[#871a1d] border-l-2 border-[#871a1d]'
                        : 'text-slate-600 hover:text-[#871a1d] hover:bg-[#871a1d]/5'
                        }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#b59410]/60 shrink-0" />
                      <span>Orders</span>
                    </Link>
                    <Link
                      href="/lunch-packs?view=pricing"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActiveParent && currentView === 'pricing'
                        ? 'bg-[#871a1d]/10 text-[#871a1d] border-l-2 border-[#871a1d]'
                        : 'text-slate-600 hover:text-[#871a1d] hover:bg-[#871a1d]/5'
                        }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#b59410]/60 shrink-0" />
                      <span>Pricing Plans</span>
                    </Link>
                  </div>
                </div>
              );
            }

            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${isActive
                  ? 'bg-[#871a1d]/10 border-l-4 border-[#871a1d] text-[#871a1d] font-semibold shadow-inner'
                  : 'text-slate-600 hover:text-[#871a1d] hover:bg-[#871a1d]/5 border-l-4 border-transparent'
                  }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors shrink-0 ${isActive ? 'text-[#871a1d]' : 'text-slate-500 group-hover:text-[#871a1d]'
                    }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions - Logout */}
        <div className="p-4 border-t border-[#871a1d]/10 space-y-2 font-sans">
          {/* Quick POS Access for utility */}
          {pathname !== '/curry-point' && (
            <Link
              href="/curry-point"
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover active:scale-[0.98] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/15 transition duration-150 border-none cursor-pointer"
            >
              <Soup className="w-4 h-4 shrink-0" />
              <span>Curry Point POS</span>
            </Link>
          )}

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-600 hover:text-red-500 font-medium text-xs rounded-xl flex items-center justify-center gap-2 border border-red-500/10 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
