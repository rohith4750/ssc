'use client';

import React, { useState, useEffect } from 'react';
import {
  getCateringOrders,
  createCateringOrder,
  recordCateringPayment,
  updateCateringStatus,
  getMenuItems
} from '@/actions/db';
import {
  UtensilsCrossed,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Plus,
  X,
  Printer,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Phone
} from 'lucide-react';

export default function CateringPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [menuRegistry, setMenuRegistry] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Active Selected Event Panel
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // New Event Form Modal States
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [guestCount, setGuestCount] = useState('100');
  const [totalAmount, setTotalAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  
  // Custom Menu compiler for new booking
  const [selectedMenuItems, setSelectedMenuItems] = useState<string[]>([]);
  const [customMenuItemText, setCustomMenuItemText] = useState('');

  // Payment Installment States
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentMethod, setInstallmentMethod] = useState('CASH');
  const [installmentNotes, setInstallmentNotes] = useState('');

  // Load Data
  useEffect(() => {
    async function load() {
      try {
        const list = await getCateringOrders();
        const registry = await getMenuItems();
        setOrders(list);
        setMenuRegistry(registry);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleReload = async () => {
    const list = await getCateringOrders();
    setOrders(list);
    if (selectedOrder) {
      const updated = list.find((o) => o.id === selectedOrder.id);
      setSelectedOrder(updated || null);
    }
  };

  // Create Catering Booking
  const handleAddOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !eventDate || !totalAmount) return;

    try {
      await createCateringOrder({
        customerName: customerName.trim(),
        contactNumber: contactNumber.trim(),
        eventDate,
        location: location.trim(),
        guestCount: parseInt(guestCount) || 100,
        menuItems: selectedMenuItems,
        totalAmount: parseFloat(totalAmount),
        advanceAmount: parseFloat(advanceAmount) || 0,
      });

      // Clear forms
      setCustomerName('');
      setContactNumber('');
      setEventDate('');
      setLocation('');
      setGuestCount('100');
      setTotalAmount('');
      setAdvanceAmount('');
      setSelectedMenuItems([]);
      setShowAddOrder(false);
      
      handleReload();
      alert('Catering order registered successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to register catering order');
    }
  };

  // Add Item to catering menu draft
  const handleAddMenuDraftItem = (name: string) => {
    if (!selectedMenuItems.includes(name)) {
      setSelectedMenuItems((prev) => [...prev, name]);
    }
  };

  const handleAddCustomMenuDraftItem = () => {
    if (customMenuItemText.trim() && !selectedMenuItems.includes(customMenuItemText.trim())) {
      setSelectedMenuItems((prev) => [...prev, customMenuItemText.trim()]);
      setCustomMenuItemText('');
    }
  };

  const handleRemoveMenuDraftItem = (name: string) => {
    setSelectedMenuItems((prev) => prev.filter((i) => i !== name));
  };

  // Log Installment Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !installmentAmount) return;

    try {
      await recordCateringPayment(
        selectedOrder.id,
        parseFloat(installmentAmount),
        installmentMethod,
        installmentNotes
      );
      setInstallmentAmount('');
      setInstallmentNotes('');
      handleReload();
      alert('Installment payment registered successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to log payment');
    }
  };

  // Change Event Pipeline Status
  const handleStatusChange = async (status: string) => {
    if (!selectedOrder) return;
    try {
      await updateCateringStatus(selectedOrder.id, status);
      handleReload();
    } catch (e) {
      console.error(e);
    }
  };

  // Print Catering Estimate/Invoice
  const printCateringInvoice = () => {
    if (!selectedOrder) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedEventDate = new Date(selectedOrder.eventDate).toLocaleDateString('en-IN', {
      dateStyle: 'long',
    });

    const menuLines = (selectedOrder.menuItems as string[])
      .map((item) => `<li>${item}</li>`)
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Catering Order Estimate - ${selectedOrder.customerName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #10b981; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .info-table td { padding: 6px 0; font-size: 14px; }
            .menu-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 40px; }
            .menu-title { font-weight: bold; color: #475569; margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
            .menu-list { columns: 2; margin: 0; padding-left: 20px; }
            .menu-list li { padding: 4px 0; font-size: 13px; }
            .summary { margin-left: auto; width: 300px; border-top: 2px solid #000; padding-top: 15px; }
            .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
            .summary-total { font-weight: bold; font-size: 18px; color: #10b981; }
            .footer { margin-top: 80px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div>
              <div class="title">SRI SANDILYASA CATERERS</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">Traditional Catering • Lunch Packs • Curry Point</div>
              <div style="font-size: 11px; color: #888; margin-top: 2px;">📍 Kakinada, Andhra Pradesh &bull; +91 76615 88676</div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 20px; color: #333;">CATERING CONTRACT</h2>
              <div style="font-size: 12px; color: #888; margin-top: 5px;">Reference: cat_${selectedOrder.id.slice(0, 8)}</div>
            </div>
          </div>

          <table class="info-table">
            <tr>
              <td style="width: 50%; vertical-align: top;">
                <strong>CLIENT INFORMATION</strong><br/>
                Name: ${selectedOrder.customerName}<br/>
                Phone: ${selectedOrder.contactNumber || 'N/A'}
              </td>
              <td style="width: 50%; vertical-align: top; text-align: right;">
                <strong>EVENT INFORMATION</strong><br/>
                Date of Event: ${formattedEventDate}<br/>
                Location/Venue: ${selectedOrder.location || 'N/A'}<br/>
                Guaranteed Guests: ${selectedOrder.guestCount}
              </td>
            </tr>
          </table>

          <div class="menu-box">
            <div class="menu-title">SELECTED EVENT MENU</div>
            <ul class="menu-list">
              ${menuLines || '<li>No items selected.</li>'}
            </ul>
          </div>

          <div class="summary">
            <div class="summary-row">
              <span>Total Quotation:</span>
              <span>₹${selectedOrder.totalAmount}</span>
            </div>
            <div class="summary-row">
              <span>Total Advances Paid:</span>
              <span>₹${selectedOrder.advanceAmount}</span>
            </div>
            <div class="summary-row summary-total">
              <span>Balance Due:</span>
              <span>₹${selectedOrder.balanceAmount}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for choosing Sri Sandilyasa Caterers! We promise authentic, premium taste.</p>
            <p>Kakinada, Andhra Pradesh &bull; +91 76615 88676</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter list
  const filteredOrders = orders.filter((o) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'UPCOMING') return o.status === 'PENDING' || o.status === 'IN_PROGRESS';
    return o.status === filterStatus;
  });

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <UtensilsCrossed className="w-8 h-8 text-emerald-400" /> Catering Event Registry
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track large catering functions, manage customized culinary menus, record advances/installments, and monitor event execution statuses.
          </p>
        </div>
        <button
          onClick={() => setShowAddOrder(true)}
          className="flex items-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/10 border-none transition duration-150 cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>New Catering Booking</span>
        </button>
      </div>

      {/* Filter and Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start no-print">
        {/* Left Column - Events List pipeline */}
        <div className="xl:col-span-7 space-y-6">
          {/* Status filters */}
          <div className="flex bg-[#0d1423] p-1.5 rounded-xl border border-white/5 no-print w-fit">
            {[
              { code: 'ALL', label: 'All Bookings' },
              { code: 'UPCOMING', label: 'Active Pipeline' },
              { code: 'COMPLETED', label: 'Completed' },
              { code: 'CANCELLED', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.code}
                onClick={() => setFilterStatus(tab.code)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer border-none ${
                  filterStatus === tab.code
                    ? 'bg-emerald-500 text-white shadow'
                    : 'bg-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading catering orders...</div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isOverdue = order.balanceAmount > 0 && new Date(order.eventDate) < new Date();
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-5 rounded-2xl glass-card relative overflow-hidden cursor-pointer ${
                      selectedOrder?.id === order.id ? 'border-emerald-500/50 bg-emerald-500/5' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                      <div>
                        <h4 className="font-bold text-white text-base">{order.customerName}</h4>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" /> {order.contactNumber || 'No number'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                          order.status === 'CANCELLED' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                          order.status === 'IN_PROGRESS' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                          'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        }`}>
                          {order.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.paymentStatus === 'FULLY_PAID' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                          order.paymentStatus === 'PARTIALLY_PAID' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                          'bg-red-500/15 text-red-400 border border-red-500/20'
                        }`}>
                          {order.paymentStatus === 'FULLY_PAID' ? 'PAID' : order.paymentStatus === 'PARTIALLY_PAID' ? 'PARTIAL' : 'UNPAID'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-300 border-t border-white/5 pt-3 mt-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{new Date(order.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate" title={order.location}>{order.location || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{order.guestCount} Pax</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end font-semibold text-white">
                        <span>Total:</span>
                        <span className="text-emerald-400">₹{order.totalAmount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">
              No catering bookings registered under this category tab.
            </div>
          )}
        </div>

        {/* Right Column - Active Event Details */}
        <div className="xl:col-span-5 space-y-6">
          {selectedOrder ? (
            <div className="p-6 rounded-2xl glass-panel relative space-y-6">
              <div className="flex justify-between items-start border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedOrder.customerName}</h3>
                  <span className="text-xs text-slate-400 block mt-0.5">Reference: cat_${selectedOrder.id.slice(0, 8)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={printCateringInvoice}
                    title="Print invoice document"
                    className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-lg cursor-pointer transition"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 text-slate-400 hover:text-white border-none bg-transparent cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Status Update Options */}
              <div className="grid grid-cols-4 gap-2 text-xs font-sans">
                {[
                  { code: 'PENDING', label: 'Pending' },
                  { code: 'IN_PROGRESS', label: 'Active' },
                  { code: 'COMPLETED', label: 'Done' },
                  { code: 'CANCELLED', label: 'Cancel' },
                ].map((s) => (
                  <button
                    key={s.code}
                    onClick={() => handleStatusChange(s.code)}
                    className={`py-1.5 px-2 rounded-lg font-bold uppercase transition border border-white/5 cursor-pointer ${
                      selectedOrder.status === s.code
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Event details block */}
              <div className="space-y-3.5 text-xs bg-white/5 border border-white/5 p-4 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date</span>
                  <span className="font-semibold text-white">
                    {new Date(selectedOrder.eventDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Location</span>
                  <span className="font-semibold text-white truncate max-w-[200px]" title={selectedOrder.location}>
                    {selectedOrder.location || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Guest Count</span>
                  <span className="font-semibold text-white">{selectedOrder.guestCount} Pax</span>
                </div>
              </div>

              {/* Menu items configured */}
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Event Menu Configured</span>
                <div className="p-3 rounded-xl bg-[#090d16] border border-white/5 max-h-36 overflow-y-auto divide-y divide-white/5 scrollbar-thin">
                  {selectedOrder.menuItems && (selectedOrder.menuItems as string[]).length > 0 ? (
                    (selectedOrder.menuItems as string[]).map((item, index) => (
                      <span key={index} className="block py-1.5 text-xs text-slate-300">
                        🍲 {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-xs italic block py-4 text-center">No menu items configured</span>
                  )}
                </div>
              </div>

              {/* Financial statements */}
              <div className="space-y-4 border-t border-white/5 pt-4">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Financial Statement</span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block mb-1">Quote</span>
                    <span className="text-sm font-bold text-white">₹{selectedOrder.totalAmount}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block mb-1">Paid</span>
                    <span className="text-sm font-bold text-emerald-400">₹{selectedOrder.advanceAmount}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center font-bold">
                    <span className="text-[10px] text-slate-400 block mb-1">Balance</span>
                    <span className="text-sm text-amber-400">₹{selectedOrder.balanceAmount}</span>
                  </div>
                </div>

                {/* Ledger installment payment form */}
                {selectedOrder.balanceAmount > 0 && (
                  <form onSubmit={handleRecordPayment} className="space-y-3 p-4 bg-white/5 border border-white/5 rounded-xl">
                    <span className="block text-xs font-bold text-slate-200">Record Installment Payment</span>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1">Amount (₹)</label>
                        <input
                          type="number"
                          step="any"
                          className="w-full px-3 py-1.5 glass-input text-white text-xs"
                          value={installmentAmount}
                          onChange={(e) => setInstallmentAmount(e.target.value)}
                          placeholder="e.g. 5000"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Method</label>
                        <select
                          className="w-full px-3 py-1.5 bg-[#0d1423] text-white border border-white/10 rounded-lg text-xs"
                          value={installmentMethod}
                          onChange={(e) => setInstallmentMethod(e.target.value)}
                        >
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="CARD">Card</option>
                        </select>
                      </div>
                    </div>

                    <div className="text-xs">
                      <label className="block text-slate-400 mb-1">Notes</label>
                      <input
                        type="text"
                        className="w-full px-3 py-1.5 glass-input text-white text-xs"
                        value={installmentNotes}
                        onChange={(e) => setInstallmentNotes(e.target.value)}
                        placeholder="E.g., final settlement"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition border-none text-xs cursor-pointer"
                    >
                      Record installment
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">
              <UtensilsCrossed className="w-12 h-12 text-slate-500/80 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">No Booking Selected</p>
              <p className="text-xs text-slate-500 mt-1">Select an active catering event booking from pipeline list to manage details</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Catering Booking Overlay Modal */}
      {showAddOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl p-6 rounded-2xl glass-panel glow-green space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-emerald-400" /> Book New Catering Event
              </h3>
              <button
                onClick={() => setShowAddOrder(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOrderSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Customer Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 glass-input text-white text-sm"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="E.g. Raju Verma"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Contact Number</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 glass-input text-white text-sm"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="E.g. +91 9848012345"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Event Date</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2.5 glass-input text-white text-sm"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Venue Location</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 glass-input text-white text-sm"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="E.g. Anjaneya Temple, Kakinada"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Guaranteed Guests</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 glass-input text-white text-sm"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>

              {/* Menu items selector panel */}
              <div className="border border-white/5 rounded-xl p-4 bg-white/5 space-y-3">
                <span className="block text-xs font-semibold text-slate-200">Compile Catering Event Menu</span>
                
                {/* Search helper */}
                <div className="flex gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Or type custom item and press add..."
                    className="flex-1 px-3 py-2 glass-input text-white text-xs"
                    value={customMenuItemText}
                    onChange={(e) => setCustomMenuItemText(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomMenuDraftItem}
                    className="py-2 px-3 bg-emerald-500 text-white rounded-lg border-none font-semibold cursor-pointer"
                  >
                    Add Custom
                  </button>
                </div>

                {/* Preconfigured selector grid */}
                <div className="max-h-24 overflow-y-auto flex flex-wrap gap-2 py-1 scrollbar-thin">
                  {menuRegistry.map((reg) => (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => handleAddMenuDraftItem(reg.name)}
                      className="py-1 px-2.5 bg-[#090d16] hover:bg-emerald-500/10 text-slate-300 hover:text-white border border-white/5 rounded-lg text-[10px] transition cursor-pointer"
                    >
                      + {reg.name}
                    </button>
                  ))}
                </div>

                {/* Current compiled list */}
                <div className="border-t border-white/5 pt-3 mt-3">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-2">Currently compiled event menu items:</span>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto scrollbar-thin">
                    {selectedMenuItems.length > 0 ? (
                      selectedMenuItems.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 py-1 pl-2.5 pr-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-semibold"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => handleRemoveMenuDraftItem(item)}
                            className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded-full border-none bg-transparent cursor-pointer shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">No items added yet. Click menu items above or write custom items.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial values */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Total Quotation Value (₹)</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full px-3 py-2.5 glass-input text-white text-sm"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="e.g. 75000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Advance Amount Received (₹)</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full px-3 py-2.5 glass-input text-white text-sm"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="e.g. 25000"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition duration-150 border-none cursor-pointer text-sm"
              >
                Register Booking Contract
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
