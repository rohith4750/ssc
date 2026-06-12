'use client';

import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting, getMenuItems, createMenuItem } from '@/actions/db';
import {
  Settings,
  Sliders,
  DollarSign,
  Plus,
  Save,
  Coffee,
  Soup,
  ListFilter,
  Users,
  Shield,
  UtensilsCrossed
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PRICING' | 'MENU'>('PRICING');

  // Edit settings state
  const [pricingFields, setPricingFields] = useState<Record<string, string>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // New Menu Item form states
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuCat, setNewMenuCat] = useState('CURRY_POINT');
  const [newMenuPrice, setNewMenuPrice] = useState('');

  // Load settings & menus on mount
  useEffect(() => {
    async function load() {
      try {
        const sets = await getSettings();
        const menus = await getMenuItems();
        setSettings(sets);
        setPricingFields(sets);
        setMenuItems(menus);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleReload = async () => {
    const sets = await getSettings();
    const menus = await getMenuItems();
    setSettings(sets);
    setPricingFields(sets);
    setMenuItems(menus);
  };

  const handlePricingFieldChange = (key: string, value: string) => {
    setPricingFields((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Save Pricing Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      for (const key of Object.keys(pricingFields)) {
        if (pricingFields[key] !== settings[key]) {
          await updateSetting(key, pricingFields[key]);
        }
      }
      alert('Global configurations updated successfully');
      handleReload();
    } catch (err) {
      console.error(err);
      alert('Failed to update configurations');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Create Menu registry Item
  const handleAddMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName || !newMenuPrice) return;

    try {
      await createMenuItem({
        name: newMenuName.trim(),
        category: newMenuCat,
        price: parseFloat(newMenuPrice),
      });

      // Clear
      setNewMenuName('');
      setNewMenuPrice('');
      
      handleReload();
      alert('New item registered in system menu');
    } catch (err) {
      console.error(err);
      alert('Failed to register menu item');
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="no-print">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="w-8 h-8 text-emerald-400" /> System Settings & Pricing Defaults
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure default lunch pack prices, update extras rates, and customize Curry Point POS check-out items registry.
        </p>
      </div>

      {/* Tabs selectors */}
      <div className="flex bg-[#0d1423] p-1.5 rounded-xl border border-white/5 no-print w-fit">
        {[
          { code: 'PRICING', label: 'Lunch Pack Base Rates', icon: Sliders },
          { code: 'MENU', label: 'Menu Registry', icon: UtensilsCrossed },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.code}
              onClick={() => setActiveTab(tab.code as any)}
              className={`flex items-center gap-2 py-1.5 px-4 rounded-lg text-xs font-semibold transition cursor-pointer border-none ${
                activeTab === tab.code
                  ? 'bg-emerald-500 text-white shadow'
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading configurations...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start no-print">
          
          {/* Tab 1: Pricing Base Rates Configuration */}
          {activeTab === 'PRICING' && (
            <div className="xl:col-span-8 p-6 rounded-2xl glass-panel relative">
              <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" /> Default Rates Configurations
              </h3>

              <form onSubmit={handleSaveSettings} className="space-y-6 text-xs font-sans">
                {/* Lunch pack categories */}
                <div className="space-y-4">
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5 pb-2">
                    Lunch Packs Base Prices
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">
                        Single Pack (Without Rice)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['single_pack_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('single_pack_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">
                        Single Pack + Rice
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['single_pack_rice_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('single_pack_rice_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">
                        Double Pack (Without Rice)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['double_pack_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('double_pack_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">
                        Double Pack + Rice
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['double_pack_rice_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('double_pack_rice_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extras prices */}
                <div className="space-y-4 pt-4">
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5 pb-2">
                    Lunch Extras Add-on Prices
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">Extra Curry Cup Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['extra_curry_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('extra_curry_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">Extra Rice Portion Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['extra_rice_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('extra_rice_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">Sweet Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['sweet_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('sweet_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">Fry Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['fry_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('fry_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 border-none cursor-pointer text-sm"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>{isSavingSettings ? 'Saving Defaults...' : 'Save Pricing Defaults'}</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Menu Registry Items list & add */}
          {activeTab === 'MENU' && (
            <>
              {/* Menu Registry list */}
              <div className="xl:col-span-8 p-6 rounded-2xl glass-panel relative">
                <h3 className="text-base font-bold text-white mb-6">Menu Items Registry</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5">Name</th>
                        <th className="py-2.5">Category</th>
                        <th className="py-2.5 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-200">
                      {menuItems.map((m) => (
                        <tr key={m.id} className="hover:bg-white/5 transition">
                          <td className="py-3 font-semibold text-white">{m.name}</td>
                          <td className="py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                              {m.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 text-right font-bold text-white">₹{m.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Menu Item form */}
              <div className="xl:col-span-4 p-6 rounded-2xl glass-panel relative flex flex-col gap-4 font-sans text-xs">
                <h3 className="text-base font-bold text-white border-b border-white/5 pb-3">
                  Register Menu Item
                </h3>

                <form onSubmit={handleAddMenuSubmit} className="space-y-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Item Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 glass-input text-white text-sm"
                      value={newMenuName}
                      onChange={(e) => setNewMenuName(e.target.value)}
                      placeholder="E.g., 250g Curry, Chicken Fry"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Item Category</label>
                    <select
                      className="w-full px-3 py-2.5 bg-[#0d1423] text-white border border-white/10 rounded-lg text-sm"
                      value={newMenuCat}
                      onChange={(e) => setNewMenuCat(e.target.value)}
                    >
                      <option value="CURRY_POINT">Curry Point POS</option>
                      <option value="LUNCH_PACK_EXTRA">Lunch Pack Extra</option>
                      <option value="CATERING">Catering Specials</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Item Base Price (₹)</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full px-3 py-2.5 glass-input text-white text-sm"
                      value={newMenuPrice}
                      onChange={(e) => setNewMenuPrice(e.target.value)}
                      placeholder="e.g. 60"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition border-none text-sm cursor-pointer"
                  >
                    Register Item
                  </button>
                </form>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
