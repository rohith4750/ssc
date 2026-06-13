'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/components/confirm-provider';
import { getSettings, updateSetting, getMenuItems, createMenuItem, getUsers, createUser, updateUser, deleteUser } from '@/actions/db';
import { useSession } from 'next-auth/react';
import {
  Settings,
  Sliders,
  DollarSign,
  Plus,
  Save,
  Coffee,
  ListFilter,
  Users,
  Shield,
  UtensilsCrossed,
  X
} from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const confirm = useConfirm();

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PRICING' | 'MENU' | 'USER'>('PRICING');

  // Edit settings state
  const [pricingFields, setPricingFields] = useState<Record<string, string>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // New Menu Item form states
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuCat, setNewMenuCat] = useState('CURRY_POINT');
  const [newMenuPrice, setNewMenuPrice] = useState('');

  // User Management state
  const [users, setUsers] = useState<any[]>([]);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('STAFF');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  
  // Edit user state
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState('STAFF');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserActive, setEditUserActive] = useState(true);

  // Load settings & menus on mount
  useEffect(() => {
    async function load() {
      try {
        const sets = await getSettings();
        const menus = await getMenuItems();
        setSettings(sets);
        setPricingFields(sets);
        setMenuItems(menus);

        const userList = await getUsers();
        setUsers(userList);
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
    const userList = await getUsers();
    setSettings(sets);
    setPricingFields(sets);
    setMenuItems(menus);
    setUsers(userList);
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
      toast.success('Global configurations updated successfully');
      handleReload();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update configurations');
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
      toast.success('New item registered in system menu');
    } catch (err) {
      console.error(err);
      toast.error('Failed to register menu item');
    }
  };

  // Create User
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword || !newUserName) return;
    setIsSavingUser(true);
    try {
      await createUser({
        email: newUserEmail.trim(),
        password: newUserPassword,
        name: newUserName.trim(),
        role: newUserRole,
      });
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('STAFF');
      await handleReload();
      toast.success('New system user registered successfully');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create user');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Open Edit User Modal/Form
  const handleOpenEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserRole(user.role);
    setEditUserActive(user.active);
    setEditUserPassword('');
  };

  // Update User
  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingUser(true);
    try {
      await updateUser(editingUser.id, {
        email: editUserEmail.trim(),
        password: editUserPassword || undefined,
        name: editUserName.trim(),
        role: editUserRole,
        active: editUserActive,
      });
      setEditingUser(null);
      await handleReload();
      toast.success('User updated successfully');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update user');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Toggle User Active Status
  const handleToggleUserStatus = async (user: any) => {
    if (user.email === session?.user?.email) {
      toast.success('You cannot deactivate your own account.');
      return;
    }
    try {
      await updateUser(user.id, {
        email: user.email,
        name: user.name,
        role: user.role,
        active: !user.active,
      });
      await handleReload();
      toast.success(`User status updated to ${!user.active ? 'Active' : 'Inactive'}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  // Delete User
  const handleDeleteUser = async (user: any) => {
    if (user.email === session?.user?.email) {
      toast.success('You cannot delete your own account.');
      return;
    }
    if (!(await confirm({ title: 'Delete User', message: `Are you sure you want to permanently delete user "${user.name}"?`, danger: true }))) {
      return;
    }
    try {
      await deleteUser(user.id);
      await handleReload();
      toast.success('User deleted successfully');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete user');
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
          Configure default lunch pack prices, update extras rates, and customize system menu items registry.
        </p>
      </div>

      {/* Tabs selectors */}
      <div className="flex bg-[#0d1423] p-1.5 rounded-xl border border-white/5 no-print w-fit">
        {[
          { code: 'PRICING', label: 'Lunch Pack Base Rates', icon: Sliders },
          { code: 'MENU', label: 'Menu Registry', icon: UtensilsCrossed },
          ...(isAdmin ? [{ code: 'USER', label: 'System Users', icon: Users }] : []),
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
                {/* Daily Lunch pack categories */}
                <div className="space-y-4">
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5 pb-2">
                    Daily Subscription Plan Base Prices
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">
                        Daily Single Pack (Without Rice)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['daily_single_pack_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('daily_single_pack_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">
                        Daily Single Pack + Rice
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['daily_single_pack_rice_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('daily_single_pack_rice_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">
                        Daily Double Pack (Without Rice)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['daily_double_pack_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('daily_double_pack_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">
                        Daily Double Pack + Rice
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['daily_double_pack_rice_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('daily_double_pack_rice_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Lunch pack categories */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5 pb-2">
                    Monthly Subscription Plan Base Prices
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">
                        Monthly Single Pack (Without Rice)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['monthly_single_pack_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('monthly_single_pack_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">
                        Monthly Single Pack + Rice
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['monthly_single_pack_rice_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('monthly_single_pack_rice_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">
                        Monthly Double Pack (Without Rice)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['monthly_double_pack_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('monthly_double_pack_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">
                        Monthly Double Pack + Rice
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 glass-input text-white text-sm"
                          value={pricingFields['monthly_double_pack_rice_price'] || ''}
                          onChange={(e) => handlePricingFieldChange('monthly_double_pack_rice_price', e.target.value)}
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

          {/* Tab 3: System User Management */}
          {activeTab === 'USER' && isAdmin && (
            <>
              {/* User management list */}
              <div className="xl:col-span-8 p-6 rounded-2xl glass-panel relative">
                <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" /> System Users Registry
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5">Name</th>
                        <th className="py-2.5">Email</th>
                        <th className="py-2.5">Role</th>
                        <th className="py-2.5">Status</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-200">
                      {users.map((u) => {
                        const isSelf = u.email === session?.user?.email;
                        return (
                          <tr key={u.id} className="hover:bg-white/5 transition">
                            <td className="py-3 font-semibold text-white">
                              {u.name} {isSelf && <span className="text-[10px] text-emerald-400 font-normal ml-1">(You)</span>}
                            </td>
                            <td className="py-3 text-slate-300">{u.email}</td>
                            <td className="py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                                u.role === 'ADMIN'
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                                  : u.role === 'MANAGER'
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3">
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                disabled={isSelf}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer border-none ${
                                  u.active
                                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                    : 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20'
                                } ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {u.active ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="py-3 text-right space-x-2">
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="py-1 px-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-md font-semibold text-[10px] transition border-none cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={isSelf}
                                className={`py-1 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md font-semibold text-[10px] transition border-none cursor-pointer ${
                                  isSelf ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add User form */}
              <div className="xl:col-span-4 p-6 rounded-2xl glass-panel relative flex flex-col gap-4 font-sans text-xs">
                <h3 className="text-base font-bold text-white border-b border-white/5 pb-3">
                  Register System User
                </h3>

                <form onSubmit={handleAddUserSubmit} className="space-y-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 glass-input text-white text-sm"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2.5 glass-input text-white text-sm"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="e.g. john@ssc.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Password</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2.5 glass-input text-white text-sm"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Enter strong password"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">System Role</label>
                    <select
                      className="w-full px-3 py-2.5 bg-[#0d1423] text-white border border-white/10 rounded-lg text-sm"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                    >
                      <option value="STAFF">Staff</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingUser}
                    className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700 text-white font-bold rounded-xl transition border-none text-sm cursor-pointer"
                  >
                    {isSavingUser ? 'Creating...' : 'Register User'}
                  </button>
                </form>
              </div>
            </>
          )}

        </div>
      )}

      {/* Edit User Modal Overlay */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel relative flex flex-col gap-4 font-sans text-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white">
                Edit User: {editingUser.name}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 glass-input text-white text-sm"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full px-3 py-2.5 glass-input text-white text-sm"
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Password (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2.5 glass-input text-white text-sm"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  placeholder="Enter new password if changing"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">System Role</label>
                <select
                  className="w-full px-3 py-2.5 bg-[#0d1423] text-white border border-white/10 rounded-lg text-sm"
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              {editingUser.email !== session?.user?.email && (
                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="editUserActive"
                    checked={editUserActive}
                    onChange={(e) => setEditUserActive(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="editUserActive" className="text-slate-300 font-medium cursor-pointer">
                    Account Active / Allowed Sign-in
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition border-none text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700 text-white font-bold rounded-xl transition border-none text-sm cursor-pointer"
                >
                  {isSavingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
