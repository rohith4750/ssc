'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/components/confirm-provider';
import { useSearchParams } from 'next/navigation';
import {
  getLunchCustomers,
  addLunchCustomer,
  updateLunchCustomer,
  getSettings,
  recordLunchTransaction,
  generateMonthlyInvoice,
  recordLunchPayment,
  toggleLunchCustomerStatus,
  getDailyTransactions,
  saveDailyAttendance,
  getLunchPackPrices,
  createLunchPackPrice,
  updateLunchPackPrice,
  deleteLunchPackPrice
} from '@/actions/db';
import {
  QrCode,
  Search,
  Plus,
  UserPlus,
  FileText,
  DollarSign,
  Printer,
  X,
  Check,
  Beef,
  Maximize2,
  ListFilter,
  Download,
  AlertCircle,
  Edit,
  Sliders
} from 'lucide-react';
import * as XLSX from 'xlsx';

function LunchPacksContent() {
  const confirm = useConfirm();
  // Core lists
  const [customers, setCustomers] = useState<any[]>([]);
  const [dailyTransactions, setDailyTransactions] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  
  // Page states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Delivery Attendance state for the selectedDate
  // Key: customerId, Value: attendance properties
  const [attendance, setAttendance] = useState<Record<string, {
    delivered: boolean;
    packType: string;
    withRice: boolean;
    extras: any[];
    totalAmount: number;
    paymentStatus: string;
  }>>({});

  // Extras popover / drawer state
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [tempPackType, setTempPackType] = useState('SINGLE');
  const [tempWithRice, setTempWithRice] = useState(false);
  const [tempPaymentStatus, setTempPaymentStatus] = useState('PENDING');
  const [tempExtrasQty, setTempExtrasQty] = useState<Record<string, number>>({
    'Extra Curry': 0,
    'Extra Rice': 0,
    'Sweet': 0,
    'Fry': 0,
  });

  // Invoice / Billing preview states
  const [selectedInvoiceCustomer, setSelectedInvoiceCustomer] = useState<any | null>(null);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [invoiceMonth, setInvoiceMonth] = useState(new Date().getMonth() + 1);
  const [invoiceYear, setInvoiceYear] = useState(new Date().getFullYear());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Modals
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // New Customer Form
  const [newCustId, setNewCustId] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustRoute, setNewCustRoute] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustMode, setNewCustMode] = useState('DAILY'); // DAILY or MONTHLY
  const [newCustPack, setNewCustPack] = useState('SINGLE');
  const [newCustRice, setNewCustRice] = useState(false);
  const [newCustMonthlyPrice, setNewCustMonthlyPrice] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Customer Profile Form
  const [editingCustProfile, setEditingCustProfile] = useState<any | null>(null);
  const [editCustName, setEditCustName] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustRoute, setEditCustRoute] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [editCustMode, setEditCustMode] = useState('DAILY');
  const [editCustPack, setEditCustPack] = useState('SINGLE');
  const [editCustRice, setEditCustRice] = useState(false);
  const [editCustMonthlyPrice, setEditCustMonthlyPrice] = useState('');
  const [editCustActive, setEditCustActive] = useState(true);

  // Pricing Plans Master Form States
  const [newPlanMode, setNewPlanMode] = useState('DAILY');
  const [newPlanPack, setNewPlanPack] = useState('SINGLE');
  const [newPlanRice, setNewPlanRice] = useState(false);
  const [newPlanPrice, setNewPlanPrice] = useState('');

  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [editPlanPrice, setEditPlanPrice] = useState('');
  const [editPlanActive, setEditPlanActive] = useState(true);

  // Auto-populate monthly prices from settings recommendations for New Customer Form
  useEffect(() => {
    if (newCustMode === 'MONTHLY' && Object.keys(settings).length > 0) {
      const key = `monthly_${newCustPack.toLowerCase()}_pack${newCustRice ? '_rice' : ''}_price`;
      const val = settings[key] || '';
      setNewCustMonthlyPrice(val);
    } else {
      setNewCustMonthlyPrice('');
    }
  }, [newCustMode, newCustPack, newCustRice, settings]);

  // Auto-populate monthly prices from settings recommendations for Edit Profile Form
  useEffect(() => {
    if (editingCustProfile) {
      if (editCustMode === 'MONTHLY' && Object.keys(settings).length > 0) {
        // If the customer profile mode was already MONTHLY and they didn't change it or the pack details, keep current
        if (editingCustProfile.mode === 'MONTHLY' && editCustMode === 'MONTHLY' && String(editingCustProfile.monthlyPrice) === editCustMonthlyPrice) {
          // Keep it
        } else {
          const key = `monthly_${editCustPack.toLowerCase()}_pack${editCustRice ? '_rice' : ''}_price`;
          const val = settings[key] || '';
          setEditCustMonthlyPrice(val);
        }
      } else {
        setEditCustMonthlyPrice('');
      }
    }
  }, [editCustMode, editCustPack, editCustRice, settings]);

  // Dynamic price calculator
  const getBasePrice = (customer: any, packType: string, withRice: boolean, sets: Record<string, string>, plansList?: any[]) => {
    if (customer.mode === 'MONTHLY') return 0; // Covered under flat manual monthly billing
    
    // Look up dynamic pricing plan
    const activePlans = plansList || pricingPlans;
    const plan = activePlans.find(
      (p) =>
        p.active &&
        p.mode.toUpperCase() === customer.mode.toUpperCase() &&
        p.packType.toUpperCase() === packType.toUpperCase() &&
        p.withRice === withRice
    );
    if (plan) return plan.price;

    const key = `daily_${packType.toLowerCase()}_pack${withRice ? '_rice' : ''}_price`;
    const price = parseFloat(sets[key]);
    return isNaN(price) ? (withRice ? 150 : 120) : price;
  };


  // Load Data
  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      const custs = await getLunchCustomers() as any[];
      const txs = await getDailyTransactions(selectedDate);
      const sets = await getSettings();
      const plans = await getLunchPackPrices() as any[];
      
      setCustomers(custs);
      setSettings(sets);
      setDailyTransactions(txs);
      setPricingPlans(plans);

      // Auto-increment Next Customer ID LPXXXX
      const activeIds = custs.map(c => parseInt(c.id.replace('LP', ''))).filter(n => !isNaN(n));
      const maxId = activeIds.length > 0 ? Math.max(...activeIds) : 0;
      setNewCustId('LP' + String(maxId + 1).padStart(4, '0'));

      // Populate attendance states
      const initialAttendance: typeof attendance = {};
      custs.forEach((c) => {
        const matchedTx = txs.find((t) => t.customerId === c.id);
        if (matchedTx) {
          initialAttendance[c.id] = {
            delivered: true,
            packType: matchedTx.packType,
            withRice: matchedTx.withRice,
            extras: matchedTx.extras as any[],
            totalAmount: matchedTx.totalAmount,
            paymentStatus: matchedTx.paymentStatus,
          };
        } else {
          initialAttendance[c.id] = {
            delivered: false,
            packType: c.defaultPackType,
            withRice: c.defaultWithRice,
            extras: [],
            totalAmount: getBasePrice(c, c.defaultPackType, c.defaultWithRice, sets, plans),
            paymentStatus: 'PENDING',
          };
        }
      });
      setAttendance(initialAttendance);
    } catch (err) {
      console.error('Failed to load attendance data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate]);

  // Re-calculate local totals for a single customer row
  const getRowCalculatedTotal = (
    customer: any,
    pType: string,
    wRice: boolean,
    extQty: Record<string, number>
  ) => {
    const base = getBasePrice(customer, pType, wRice, settings);
    const extCurry = parseFloat(settings['extra_curry_price'] || '40') * (extQty['Extra Curry'] || 0);
    const extRice = parseFloat(settings['extra_rice_price'] || '30') * (extQty['Extra Rice'] || 0);
    const sweet = parseFloat(settings['sweet_price'] || '25') * (extQty['Sweet'] || 0);
    const fry = parseFloat(settings['fry_price'] || '35') * (extQty['Fry'] || 0);
    return base + extCurry + extRice + sweet + fry;
  };

  // Toggle delivery check state
  const handleToggleDelivered = (customerId: string, checked: boolean) => {
    setAttendance((prev) => ({
      ...prev,
      [customerId]: {
        ...prev[customerId],
        delivered: checked,
      },
    }));
  };

  const handleRowPackTypeChange = (customerId: string, packType: string, customer: any) => {
    const record = attendance[customerId];
    const extrasAmt = record.extras.reduce((acc: number, e: any) => acc + (e.price * e.quantity), 0);
    const newBase = getBasePrice(customer, packType, record.withRice, settings);
    setAttendance((prev) => ({
      ...prev,
      [customerId]: {
        ...prev[customerId],
        packType,
        totalAmount: newBase + extrasAmt,
      },
    }));
  };

  const handleRowWithRiceChange = (customerId: string, withRice: boolean, customer: any) => {
    const record = attendance[customerId];
    const extrasAmt = record.extras.reduce((acc: number, e: any) => acc + (e.price * e.quantity), 0);
    const newBase = getBasePrice(customer, record.packType, withRice, settings);
    setAttendance((prev) => ({
      ...prev,
      [customerId]: {
        ...prev[customerId],
        withRice,
        totalAmount: newBase + extrasAmt,
      },
    }));
  };

  // Bulk actions
  const handleMarkAllDelivered = (mark: boolean) => {
    const updated: typeof attendance = { ...attendance };
    filteredAttendanceCustomers.forEach((c) => {
      if (updated[c.id]) {
        updated[c.id].delivered = mark;
      }
    });
    setAttendance(updated);
  };

  // Edit Extras triggers
  const handleOpenEditExtras = (customer: any) => {
    setEditingCustomer(customer);
    const current = attendance[customer.id];
    setTempPackType(current.packType);
    setTempWithRice(current.withRice);
    setTempPaymentStatus(current.paymentStatus);

    // Initialize temporary extras quantities
    const qtys = { 'Extra Curry': 0, 'Extra Rice': 0, Sweet: 0, Fry: 0 };
    current.extras.forEach((e) => {
      if (e.name in qtys) {
        qtys[e.name as keyof typeof qtys] = e.quantity;
      }
    });
    setTempExtrasQty(qtys);
  };

  // Save temporary extras row state back to local attendance sheet state
  const handleSaveTempExtras = () => {
    if (!editingCustomer) return;
    const cid = editingCustomer.id;
    const formattedExtras = Object.entries(tempExtrasQty)
      .filter(([_, qty]) => qty > 0)
      .map(([name, qty]) => ({
        name,
        price: parseFloat(settings[name === 'Extra Curry' ? 'extra_curry_price' : name === 'Extra Rice' ? 'extra_rice_price' : name === 'Sweet' ? 'sweet_price' : 'fry_price'] || '0'),
        quantity: qty,
      }));

    const total = getRowCalculatedTotal(editingCustomer, tempPackType, tempWithRice, tempExtrasQty);

    setAttendance((prev) => ({
      ...prev,
      [cid]: {
        ...prev[cid],
        delivered: true, // Auto check delivered when adjusting extras
        packType: tempPackType,
        withRice: tempWithRice,
        extras: formattedExtras,
        totalAmount: total,
        paymentStatus: tempPaymentStatus,
      },
    }));
    setEditingCustomer(null);
  };

  // Save the entire attendance sheet
  const handleSaveAttendanceSheet = async () => {
    try {
      const records = Object.entries(attendance).map(([customerId, val]) => ({
        customerId,
        ...val,
      }));
      await saveDailyAttendance(selectedDate, records);
      toast.success(`Attendance checklist saved successfully for ${selectedDate}`);
      loadAttendanceData();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save daily attendance');
    }
  };

  // Register Customer
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newCustId.trim()) {
      setFormError('Customer code is required.');
      return;
    }

    if (customers.some((c) => c.id.toLowerCase() === newCustId.trim().toLowerCase())) {
      setFormError('Customer Code already exists.');
      return;
    }

    try {
      await addLunchCustomer({
        id: newCustId.trim().toUpperCase(),
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        route: newCustRoute.trim() || undefined,
        address: newCustAddress.trim() || undefined,
        mode: newCustMode,
        defaultPackType: newCustPack,
        defaultWithRice: newCustRice,
        monthlyPrice: newCustMode === 'MONTHLY' ? parseFloat(newCustMonthlyPrice) || 0 : 0,
      });

      // Reload lists
      loadAttendanceData();
      
      setNewCustName('');
      setNewCustPhone('');
      setNewCustRoute('');
      setNewCustAddress('');
      setNewCustMonthlyPrice('');
      setShowAddCustomer(false);
      toast.success('Lunch customer registered successfully!');
    } catch (err) {
      setFormError('Failed to create customer record.');
    }
  };

  // Edit Customer Profile Handlers
  const handleOpenEditCustProfile = (customer: any) => {
    setEditingCustProfile(customer);
    setEditCustName(customer.name || '');
    setEditCustPhone(customer.phone || '');
    setEditCustRoute(customer.route || '');
    setEditCustAddress(customer.address || '');
    setEditCustMode(customer.mode);
    setEditCustPack(customer.defaultPackType);
    setEditCustRice(customer.defaultWithRice);
    setEditCustMonthlyPrice(String(customer.monthlyPrice || ''));
    setEditCustActive(customer.active);
  };

  const handleEditCustProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustProfile) return;

    try {
      await updateLunchCustomer(editingCustProfile.id, {
        name: editCustName.trim(),
        phone: editCustPhone.trim(),
        route: editCustRoute.trim() || undefined,
        address: editCustAddress.trim() || undefined,
        mode: editCustMode,
        defaultPackType: editCustPack,
        defaultWithRice: editCustRice,
        monthlyPrice: editCustMode === 'MONTHLY' ? parseFloat(editCustMonthlyPrice) || 0 : 0,
        active: editCustActive,
      });

      setEditingCustProfile(null);
      loadAttendanceData();
      toast.success('Subscriber profile updated successfully!');
    } catch (err) {
      toast.error('Failed to update subscriber profile.');
    }
  };

  // Dynamic Pricing Plans CRUD Handlers
  const handleAddPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanPrice) return;
    try {
      await createLunchPackPrice({
        mode: newPlanMode,
        packType: newPlanPack,
        withRice: newPlanRice,
        price: parseFloat(newPlanPrice),
      });
      setNewPlanPrice('');
      toast.success('Pricing plan added successfully!');
      loadAttendanceData();
    } catch (err) {
      toast.error('Failed to create pricing plan. Make sure this combination is unique.');
    }
  };

  const handleEditPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan || !editPlanPrice) return;
    try {
      await updateLunchPackPrice(editingPlan.id, {
        price: parseFloat(editPlanPrice),
        active: editPlanActive,
      });
      setEditingPlan(null);
      toast.success('Pricing plan updated successfully!');
      loadAttendanceData();
    } catch (err) {
      toast.error('Failed to update pricing plan.');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!(await confirm({ title: 'Delete Pricing Plan', message: 'Are you sure you want to permanently delete this pricing plan?', danger: true }))) return;
    try {
      await deleteLunchPackPrice(id);
      toast.success('Pricing plan deleted successfully!');
      loadAttendanceData();
    } catch (err) {
      toast.error('Failed to delete pricing plan.');
    }
  };

  // Invoicing
  const handleLoadInvoice = async (customer: any) => {
    setSelectedInvoiceCustomer(customer);
    try {
      const data = await generateMonthlyInvoice(customer.id, invoiceYear, invoiceMonth);
      setInvoiceData(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Log Invoice Payment
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceCustomer || !paymentAmount) return;

    try {
      await recordLunchPayment(
        selectedInvoiceCustomer.id,
        parseFloat(paymentAmount),
        paymentMethod,
        paymentNotes
      );
      setPaymentAmount('');
      setPaymentNotes('');
      handleLoadInvoice(selectedInvoiceCustomer);
      toast.success('Billing payment recorded successfully!');
    } catch (err) {
      toast.error('Failed to record payment');
    }
  };

  // Print Invoice Sheet
  const handlePrintInvoice = () => {
    if (!invoiceData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceMonthName = new Date(invoiceYear, invoiceMonth - 1).toLocaleString('default', { month: 'long' });

    let itemLines = invoiceData.transactions.map((t: any) => {
      const date = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const extrasSummary = t.extras && Array.isArray(t.extras) 
        ? t.extras.map((e: any) => `${e.name} (${e.quantity})`).join(', ')
        : 'None';
      return `
        <tr>
          <td>${date}</td>
          <td>${t.packType} Pack</td>
          <td>${t.withRice ? 'With Rice' : 'Without Rice'}</td>
          <td>${extrasSummary || '-'}</td>
          <td style="text-align: right;">₹${t.totalAmount}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Monthly Invoice - ${invoiceData.customer.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #871a1d; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #871a1d; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .info-table td { padding: 6px 0; }
            .ledger-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .ledger-table th, .ledger-table td { border-bottom: 1px solid #ddd; padding: 12px 10px; text-align: left; }
            .ledger-table th { background: #faf6ee; color: #1e1315; }
            .summary { margin-left: auto; width: 300px; border-top: 2px solid #000; padding-top: 15px; }
            .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
            .summary-total { font-weight: bold; font-size: 18px; color: #871a1d; }
            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div>
              <div class="title">SRI SANDILYASA CATERERS</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">Traditional Catering • Lunch Packs • Curry Point</div>
              <div style="font-size: 11px; color: #888; margin-top: 2px;">📍 Kakinada, Andhra Pradesh</div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 20px;">LUNCH PACK INVOICE</h2>
              <div style="font-size: 14px; font-weight: bold; color: #871a1d; margin-top: 5px;">${invoiceMonthName.toUpperCase()} ${invoiceYear}</div>
            </div>
          </div>

          <table class="info-table">
            <tr>
              <td style="width: 50%; vertical-align: top;">
                <strong>CUSTOMER DETAILS</strong><br/>
                Customer Code: ${invoiceData.customer.id}<br/>
                Name: ${invoiceData.customer.name || 'N/A'}<br/>
                Route: ${invoiceData.customer.route || 'N/A'}<br/>
                Address: ${invoiceData.customer.address || 'N/A'}<br/>
                Billing Plan: ${invoiceData.customer.mode} Subscription
              </td>
              <td style="width: 50%; vertical-align: top; text-align: right;">
                <strong>INVOICE SUMMARY</strong><br/>
                Issue Date: ${new Date().toLocaleDateString('en-IN')}<br/>
                Billing Period: 01-${invoiceMonthName} to End of ${invoiceMonthName}<br/>
                Payment Terms: Monthly
              </td>
            </tr>
          </table>

          <table class="ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Pack Type</th>
                <th>Rice Option</th>
                <th>Extras</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemLines}
            </tbody>
          </table>

          <div class="summary">
            ${invoiceData.customer.mode === 'MONTHLY' ? `
              <div class="summary-row">
                <span>Base Monthly Fee (Manual):</span>
                <span>₹${invoiceData.customer.monthlyPrice || 0}</span>
              </div>
              <div class="summary-row">
                <span>Add-on Extras Accrued:</span>
                <span>₹${invoiceData.totalAmount - (invoiceData.customer.monthlyPrice || 0)}</span>
              </div>
            ` : `
              <div class="summary-row">
                <span>Total Accrued (Delivered Days Only):</span>
                <span>₹${invoiceData.totalAmount}</span>
              </div>
            `}
            <div class="summary-row">
              <span>Total Accrued (Total Bill):</span>
              <span>₹${invoiceData.totalAmount}</span>
            </div>
            <div class="summary-row">
              <span>Total Paid:</span>
              <span>₹${invoiceData.totalPaid}</span>
            </div>
            <div class="summary-row summary-total">
              <span>Balance Due:</span>
              <span>₹${invoiceData.balance}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for subscribing to our Lunch Pack service!</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export ledger to Excel
  const handleExportLedgerExcel = () => {
    if (!invoiceData) return;
    const items = invoiceData.transactions.map((t: any) => ({
      Date: new Date(t.date).toLocaleDateString('en-IN'),
      'Pack Type': t.packType,
      'Rice Pref': t.withRice ? 'With Rice' : 'No Rice',
      Extras: t.extras && Array.isArray(t.extras) 
        ? t.extras.map((e: any) => `${e.name}(${e.quantity})`).join(', ') 
        : 'None',
      Amount: t.totalAmount,
      Status: t.paymentStatus,
    }));

    const ws = XLSX.utils.json_to_sheet(items);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Ledger_${invoiceData.customer.id}`);
    XLSX.writeFile(wb, `LunchLedger_${invoiceData.customer.id}_${invoiceMonth}_${invoiceYear}.xlsx`);
  };

  // Filter lists by route and name query
  const routes = Array.from(new Set(customers.map(c => c.route).filter(Boolean))) as string[];

  const filteredCustomers = customers.filter(
    (c) =>
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery))
  );

  const filteredAttendanceCustomers = customers.filter((c) => {
    const matchesRoute = selectedRoute === 'ALL' || c.route === selectedRoute;
    const matchesSearch =
      searchQuery === '' ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery));
    return matchesRoute && matchesSearch;
  });

  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'orders';

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            {view === 'customers' ? (
              <>
                <UserPlus className="w-8 h-8 text-[#871a1d]" /> Lunch Pack Subscribers
              </>
            ) : view === 'pricing' ? (
              <>
                <Sliders className="w-8 h-8 text-[#871a1d]" /> Lunch Pack Pricing Master
              </>
            ) : (
              <>
                <Beef className="w-8 h-8 text-[#871a1d]" /> Daily Lunch Delivery Sheet
              </>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {view === 'customers'
              ? 'Manage subscriber profiles, addresses, routes, and billing statements.'
              : view === 'pricing'
              ? 'Configure and manage active pricing plans dynamically for all single and double pack combinations.'
              : 'Log daily pack delivery attendance, routes distribution, and extras.'}
          </p>
        </div>
        {view === 'customers' && (
          <button
            onClick={() => setShowAddCustomer(true)}
            className="flex items-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 border-none transition duration-150 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>Add Subscriber</span>
          </button>
        )}
      </div>

      {/* Grid Layout */}
      {view === 'orders' ? (
        <div className="flex flex-col max-w-5xl mx-auto w-full space-y-6 no-print">
          {/* Controls Bar */}
          <div className="p-4 rounded-xl glass-panel flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Input */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date:</span>
                <input
                  type="date"
                  className="px-3 py-1.5 glass-input text-xs font-semibold"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              {/* Route Dropdown Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Route:</span>
                <select
                  className="px-2.5 py-1.5 bg-transparent border border-[#871a1d]/15 text-slate-800 text-xs rounded-lg font-medium"
                  value={selectedRoute}
                  onChange={(e) => setSelectedRoute(e.target.value)}
                >
                  <option value="ALL">All Routes</option>
                  {routes.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick search input overlay */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search code or name..."
                className="w-full pl-8 pr-3 py-1.5 glass-input text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Delivery Checklist Grid */}
          <div className="p-6 rounded-2xl glass-panel relative overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-[#871a1d]/10">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Beef className="w-5 h-5 text-[#871a1d]" /> Delivery Attendance logs
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMarkAllDelivered(true)}
                  className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] rounded-lg transition duration-150 border border-slate-200 cursor-pointer"
                >
                  Mark All Delivered
                </button>
                <button
                  onClick={() => handleMarkAllDelivered(false)}
                  className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] rounded-lg transition duration-150 border border-slate-200 cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading delivery checklists...</div>
            ) : filteredAttendanceCustomers.length > 0 ? (
              <>
                {/* Mobile view (visible only on small screens) */}
                <div className="block md:hidden space-y-4">
                  {filteredAttendanceCustomers.map((c) => {
                    const record = attendance[c.id] || {
                      delivered: false,
                      packType: c.defaultPackType,
                      withRice: c.defaultWithRice,
                      extras: [],
                      totalAmount: getBasePrice(c, c.defaultPackType, c.defaultWithRice, settings),
                      paymentStatus: 'PENDING',
                    };
                    return (
                      <div key={c.id} className={`p-4 rounded-xl border transition ${record.delivered ? 'bg-[#871a1d]/5 border-[#871a1d]/20' : 'bg-[#faf6ee] border-[#871a1d]/10 opacity-80'} flex flex-col gap-3 shadow`}>
                        {/* Header Row: Checkbox, Code, Name */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={record.delivered}
                              onChange={(e) => handleToggleDelivered(c.id, e.target.checked)}
                              className="w-5 h-5 rounded accent-[#871a1d] cursor-pointer"
                            />
                            <div>
                              <span className="font-extrabold text-sm text-[#871a1d] block">{c.id}</span>
                              <span className="text-slate-800 font-bold text-sm block">{c.name || 'Anonymous'}</span>
                              <span className="text-[10px] text-slate-500 block">{c.phone || 'N/A'}</span>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#b59410]/15 text-[#b59410] border border-[#b59410]/20 uppercase">
                            {c.mode}
                          </span>
                        </div>

                        {/* Route / Address Section */}
                        <div className="text-xs text-slate-650 bg-[#871a1d]/5 p-2 rounded-lg space-y-1 border border-[#871a1d]/5">
                          <div><strong className="text-slate-700">Route:</strong> {c.route || '-'}</div>
                          <div className="truncate text-slate-500 font-medium" title={c.address || ''}>
                            <strong className="text-slate-700 font-bold">Address:</strong> {c.address || '-'}
                          </div>
                        </div>

                        {/* Selectors Row: Pack Type & Rice */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Pack Type</label>
                            <select
                              className="w-full px-2 py-1.5 bg-white border border-[#871a1d]/15 text-slate-800 text-xs rounded-lg font-bold cursor-pointer"
                              value={record.packType}
                              onChange={(e) => handleRowPackTypeChange(c.id, e.target.value, c)}
                            >
                              <option value="SINGLE">Single Pack</option>
                              <option value="DOUBLE">Double Pack</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Rice Preference</label>
                            <select
                              className="w-full px-2 py-1.5 bg-white border border-[#871a1d]/15 text-slate-800 text-xs rounded-lg font-bold cursor-pointer"
                              value={String(record.withRice)}
                              onChange={(e) => handleRowWithRiceChange(c.id, e.target.value === 'true', c)}
                            >
                              <option value="false">Without Rice</option>
                              <option value="true">With Rice</option>
                            </select>
                          </div>
                        </div>

                        {/* Extras display if any */}
                        {record.extras.length > 0 && (
                          <div className="text-[10px] text-emerald-600 font-bold bg-emerald-500/5 p-1.5 rounded-lg border border-emerald-500/10">
                            + Extras: {record.extras.map((e) => `${e.name} (x${e.quantity})`).join(', ')}
                          </div>
                        )}

                        {/* Footer Row: Daily Cost Input & Edit Extras Button */}
                        <div className="flex items-center justify-between gap-3 border-t border-[#871a1d]/5 pt-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500 font-semibold">Cost:</span>
                            <span className="text-slate-400 font-bold">₹</span>
                            <input
                              type="number"
                              className="w-16 px-1.5 py-1 bg-white border border-[#871a1d]/15 text-slate-800 text-xs rounded-lg font-extrabold text-right focus:border-[#871a1d] focus:outline-none"
                              value={record.totalAmount}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setAttendance((prev) => ({
                                  ...prev,
                                  [c.id]: {
                                    ...prev[c.id],
                                    totalAmount: val,
                                  },
                                }));
                              }}
                            />
                          </div>

                          <button
                            onClick={() => handleOpenEditExtras(c)}
                            className="py-1.5 px-3 bg-[#871a1d]/10 text-[#871a1d] hover:bg-[#871a1d]/20 rounded-lg font-bold text-xs transition border-none cursor-pointer"
                          >
                            Edit Extras
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop view (visible only on medium screens and larger) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#871a1d]/10 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5">Delivered</th>
                        <th className="py-2.5">Code</th>
                        <th className="py-2.5">Name</th>
                        <th className="py-2.5">Route</th>
                        <th className="py-2.5">Plan / Default</th>
                        <th className="py-2.5">Address</th>
                        <th className="py-2.5 text-right">Daily Cost</th>
                        <th className="py-2.5 text-center">Settings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#871a1d]/5">
                      {filteredAttendanceCustomers.map((c) => {
                        const record = attendance[c.id] || {
                          delivered: false,
                          packType: c.defaultPackType,
                          withRice: c.defaultWithRice,
                          extras: [],
                          totalAmount: getBasePrice(c, c.defaultPackType, c.defaultWithRice, settings),
                          paymentStatus: 'PENDING',
                        };
                        return (
                          <tr key={c.id} className={record.delivered ? 'bg-[#871a1d]/5 font-medium' : 'opacity-70'}>
                            <td className="py-3">
                              <input
                                type="checkbox"
                                checked={record.delivered}
                                onChange={(e) => handleToggleDelivered(c.id, e.target.checked)}
                                className="w-4 h-4 rounded accent-[#871a1d] cursor-pointer"
                              />
                            </td>
                            <td className="py-3 font-bold text-[#871a1d]">{c.id}</td>
                            <td className="py-3">
                              <div>
                                <span className="text-slate-800 font-bold block">{c.name || 'Anonymous'}</span>
                                <span className="text-[10px] text-slate-500">{c.phone || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="py-3 font-medium text-slate-700">{c.route || '-'}</td>
                            <td className="py-3 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-extrabold bg-[#b59410]/15 text-[#b59410] border border-[#b59410]/20 uppercase tracking-wider shrink-0">
                                  {c.mode}
                                </span>
                                
                                <select
                                  className="px-1 py-0.5 bg-white border border-[#871a1d]/15 text-slate-800 text-[10px] rounded font-semibold cursor-pointer shrink-0"
                                  value={record.packType}
                                  onChange={(e) => handleRowPackTypeChange(c.id, e.target.value, c)}
                                >
                                  <option value="SINGLE">Single</option>
                                  <option value="DOUBLE">Double</option>
                                </select>

                                <select
                                  className="px-1 py-0.5 bg-white border border-[#871a1d]/15 text-slate-800 text-[10px] rounded font-semibold cursor-pointer shrink-0"
                                  value={String(record.withRice)}
                                  onChange={(e) => handleRowWithRiceChange(c.id, e.target.value === 'true', c)}
                                >
                                  <option value="false">No Rice</option>
                                  <option value="true">Rice</option>
                                </select>
                              </div>
                              {record.extras.length > 0 && (
                                <span className="block text-[9px] text-emerald-600 font-bold mt-1">
                                  + Extras: {record.extras.map((e) => `${e.name} (x${e.quantity})`).join(', ')}
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-slate-500 max-w-[150px] truncate" title={c.address || ''}>
                              {c.address || '-'}
                            </td>
                            <td className="py-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <span className="text-slate-500 font-semibold">₹</span>
                                <input
                                  type="number"
                                  className="w-16 px-1.5 py-1 bg-white border border-[#871a1d]/15 text-slate-800 text-xs rounded-lg font-bold text-right focus:border-[#871a1d] focus:outline-none"
                                  value={record.totalAmount}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setAttendance((prev) => ({
                                      ...prev,
                                      [c.id]: {
                                        ...prev[c.id],
                                        totalAmount: val,
                                      },
                                    }));
                                  }}
                                />
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <button
                                onClick={() => handleOpenEditExtras(c)}
                                className="py-1 px-2.5 bg-[#871a1d]/10 text-[#871a1d] hover:bg-[#871a1d]/20 rounded-md font-semibold text-[10px] transition duration-150 border-none cursor-pointer"
                              >
                                Edit Extras
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400">No active lunch customers registered under selected filters.</div>
            )}

            <div className="pt-4 border-t border-[#871a1d]/10 flex justify-end">
              <button
                onClick={handleSaveAttendanceSheet}
                className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 border-none transition duration-150 cursor-pointer"
              >
                Save Delivery Attendance
              </button>
            </div>
          </div>
        </div>
      ) : view === 'pricing' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 max-w-5xl mx-auto w-full items-start no-print">
          {/* Pricing Plans Table */}
          <div className="xl:col-span-8 p-6 rounded-2xl glass-panel relative overflow-hidden space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-[#871a1d]/10 pb-2">
              <Sliders className="w-5 h-5 text-[#871a1d]" /> Active Pricing Plans Master
            </h3>

            {pricingPlans.length > 0 ? (
              <>
                {/* Mobile view (visible only on small screens) */}
                <div className="block md:hidden space-y-4">
                  {pricingPlans.map((plan) => (
                    <div key={plan.id} className={`p-4 rounded-xl border transition ${plan.active ? 'bg-[#871a1d]/5 border-[#871a1d]/20' : 'bg-slate-50 border-slate-200 opacity-60'} flex flex-col gap-3 shadow`}>
                      {/* Header Row: Plan Mode Badge, Status Badge */}
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold bg-[#b59410]/15 text-[#b59410] border border-[#b59410]/20 uppercase">
                          {plan.mode}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          plan.active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-300/10 text-slate-500'
                        }`}>
                          {plan.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Detail row */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase">Pack Type</span>
                          <span className="font-bold text-slate-800 uppercase">{plan.packType}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase">Rice Option</span>
                          <span className="font-semibold text-slate-700">{plan.withRice ? 'With Rice' : 'No Rice'}</span>
                        </div>
                      </div>

                      {/* Bottom row: Price and actions */}
                      <div className="flex items-center justify-between border-t border-[#871a1d]/5 pt-3">
                        <div className="flex items-baseline gap-1">
                          <span className="text-slate-400 text-[10px] font-bold">₹</span>
                          <span className="text-base font-extrabold text-slate-800">{plan.price}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingPlan(plan);
                              setEditPlanPrice(String(plan.price));
                              setEditPlanActive(plan.active);
                            }}
                            className="py-1.5 px-3 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 rounded-lg font-bold text-xs transition border-none cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-650 rounded-lg font-bold text-xs transition border-none cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop view (visible only on md screens and larger) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#871a1d]/10 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5">Plan Mode</th>
                        <th className="py-2.5">Pack Type</th>
                        <th className="py-2.5">Rice Option</th>
                        <th className="py-2.5 text-right">Base Price</th>
                        <th className="py-2.5 text-center">Status</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#871a1d]/5">
                      {pricingPlans.map((plan) => (
                        <tr key={plan.id} className={plan.active ? '' : 'opacity-50'}>
                          <td className="py-3 font-bold text-slate-800">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold bg-[#b59410]/10 text-[#b59410] border border-[#b59410]/20 uppercase">
                              {plan.mode}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-slate-700 uppercase">{plan.packType}</td>
                          <td className="py-3 text-slate-650">
                            {plan.withRice ? 'With Rice' : 'No Rice'}
                          </td>
                          <td className="py-3 text-right font-bold text-slate-800">₹{plan.price}</td>
                          <td className="py-3 text-center">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              plan.active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-300/10 text-slate-500'
                            }`}>
                              {plan.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingPlan(plan);
                                setEditPlanPrice(String(plan.price));
                                setEditPlanActive(plan.active);
                              }}
                              className="py-1 px-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 rounded-md font-semibold text-[10px] transition duration-150 border-none cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePlan(plan.id)}
                              className="py-1 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-650 rounded-md font-semibold text-[10px] transition duration-150 border-none cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400">No custom pricing plans configured yet. Use the form to add one.</div>
            )}
          </div>

          {/* Create Pricing Plan Form */}
          <div className="xl:col-span-4 p-6 rounded-2xl glass-panel relative flex flex-col gap-4 text-xs font-sans">
            <h3 className="text-sm font-bold text-slate-800 border-b border-[#871a1d]/10 pb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#871a1d]" /> Create Pricing Plan
            </h3>

            <form onSubmit={handleAddPlanSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Plan Mode</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 glass-input text-slate-800 text-sm font-semibold uppercase"
                  value={newPlanMode}
                  onChange={(e) => setNewPlanMode(e.target.value)}
                  placeholder="E.g. DAILY, WEEKLY, SPECIAL"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Pack Type</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 glass-input text-slate-800 text-sm font-semibold uppercase"
                  value={newPlanPack}
                  onChange={(e) => setNewPlanPack(e.target.value)}
                  placeholder="E.g. SINGLE, DOUBLE, FAMILY"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Rice Preference</label>
                <select
                  className="w-full px-3 py-2 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800 font-medium"
                  value={String(newPlanRice)}
                  onChange={(e) => setNewPlanRice(e.target.value === 'true')}
                >
                  <option value="false">Without Rice</option>
                  <option value="true">With Rice</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Plan Base Price (₹)</label>
                <input
                  type="number"
                  step="any"
                  className="w-full px-3 py-2 glass-input text-slate-800 text-sm font-bold"
                  value={newPlanPrice}
                  onChange={(e) => setNewPlanPrice(e.target.value)}
                  placeholder="E.g. 130"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#871a1d] hover:bg-[#871a1d]/90 text-white font-bold rounded-xl transition duration-150 border-none cursor-pointer"
              >
                Register Pricing Plan
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex flex-col max-w-5xl mx-auto w-full space-y-6 no-print">
          {/* Customer Directory */}
          <div className="p-6 rounded-2xl glass-panel relative">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#871a1d]" /> Subscriber Directory
            </h3>
            {/* Quick search filter */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers..."
                className="w-full pl-9 pr-4 py-2 glass-input text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* List */}
            <div className="max-h-80 overflow-y-auto space-y-2 divide-y divide-[#871a1d]/5 scrollbar-thin">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <div key={c.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-3 px-2 text-xs hover:bg-[#871a1d]/5 transition rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#871a1d] text-sm">{c.id}</span>
                        {c.name && <span className="text-slate-800 font-semibold">{c.name}</span>}
                        {!c.active && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-red-100 text-red-700 rounded font-bold uppercase">
                            Inactive
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Route: {c.route || 'N/A'} &bull; Plan: {c.mode === 'MONTHLY' ? `MONTHLY (₹${c.monthlyPrice || 0})` : 'DAILY'} &bull; {c.defaultPackType} Pack ({c.defaultWithRice ? 'With Rice' : 'No Rice'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditCustProfile(c)}
                        title="Edit profile settings"
                        className="p-2 bg-sky-550/10 border border-sky-500/20 text-sky-600 hover:bg-sky-500/20 rounded-lg cursor-pointer transition shrink-0"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleLoadInvoice(c)}
                        title="View monthly statement"
                        className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 hover:bg-amber-500/20 rounded-lg cursor-pointer transition shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">No records found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Ledger overlay (if loaded) */}
      {selectedInvoiceCustomer && invoiceData && (
        <div className="p-6 rounded-2xl glass-panel relative overflow-hidden font-sans space-y-6 no-print">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#871a1d]/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" /> Account Statement for {invoiceData.customer.id}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Profile: {invoiceData.customer.name || 'Anonymous'} &bull; Phone: {invoiceData.customer.phone || 'N/A'} &bull; Route: {invoiceData.customer.route || 'N/A'} &bull; Billing Plan: {invoiceData.customer.mode}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <select
                className="px-2.5 py-1.5 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800"
                value={invoiceMonth}
                onChange={(e) => {
                  setInvoiceMonth(parseInt(e.target.value));
                  setTimeout(() => handleLoadInvoice(selectedInvoiceCustomer), 100);
                }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                className="px-2.5 py-1.5 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800"
                value={invoiceYear}
                onChange={(e) => {
                  setInvoiceYear(parseInt(e.target.value));
                  setTimeout(() => handleLoadInvoice(selectedInvoiceCustomer), 100);
                }}
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={handlePrintInvoice}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg border-none cursor-pointer transition"
              >
                Print Invoice
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Invoice summary cards */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">Total Accrued</span>
                  <span className="text-xl font-bold text-slate-800">₹{invoiceData.totalAmount}</span>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">Total Paid</span>
                  <span className="text-xl font-bold text-emerald-600">₹{invoiceData.totalPaid}</span>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">Outstanding Balance</span>
                  <span className="text-xl font-bold text-amber-600">₹{invoiceData.balance}</span>
                </div>
              </div>

              {invoiceData.customer.mode === 'MONTHLY' && (
                <div className="p-4 rounded-xl bg-[#871a1d]/5 border border-[#871a1d]/10 text-xs text-slate-700 flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <span className="text-slate-500 font-medium block">Monthly Flat Rate:</span>
                    <span className="text-sm font-bold text-slate-800">₹{invoiceData.customer.monthlyPrice || 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Add-on Extras Accrued:</span>
                    <span className="text-sm font-bold text-slate-800">₹{invoiceData.totalAmount - (invoiceData.customer.monthlyPrice || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Billing Plan Mode:</span>
                    <span className="text-xs font-bold uppercase text-[#b59410]">Manual Monthly Billing</span>
                  </div>
                </div>
              )}

              {/* Transactions log table */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Daily logs in selected period</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400">
                        <th className="py-2">Date</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Rice</th>
                        <th className="py-2">Extras</th>
                        <th className="py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-700">
                      {invoiceData.transactions.length > 0 ? (
                        invoiceData.transactions.map((t: any) => (
                          <tr key={t.id}>
                            <td className="py-2.5">{new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td className="py-2.5">{t.packType} Pack</td>
                            <td className="py-2.5">{t.withRice ? 'Yes' : 'No'}</td>
                            <td className="py-2.5 text-slate-500">
                              {t.extras && Array.isArray(t.extras) 
                                ? t.extras.map((e: any) => `${e.name}(${e.quantity})`).join(', ') 
                                : '-'}
                            </td>
                            <td className="py-2.5 text-right font-semibold text-slate-800">₹{t.totalAmount}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-450">No daily transactions logged in this month</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Quick Record Payment Form */}
            <div className="lg:col-span-1 p-6 rounded-xl bg-white/5 border border-white/5">
              <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Record Billing Payment
              </h4>
              <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-slate-600 font-medium mb-1" htmlFor="pamt">
                    Payment Amount (₹)
                  </label>
                  <input
                    id="pamt"
                    type="number"
                    step="any"
                    className="w-full px-3 py-2 glass-input text-slate-800 text-sm"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount, e.g. 1500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1" htmlFor="pmthd">
                    Payment Method
                  </label>
                  <select
                    id="pmthd"
                    className="w-full px-3 py-2 bg-[#faf6ee] border border-white/10 rounded-lg text-xs text-slate-800"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / Digital</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1" htmlFor="pnote">
                    Payment Reference / Notes
                  </label>
                  <textarea
                    id="pnote"
                    rows={2}
                    className="w-full px-3 py-2 glass-input text-slate-800 text-xs"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="E.g., paid for June via PhonePe"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition duration-150 border-none cursor-pointer"
                >
                  Record Payment
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Extras / Price Dialog Modal (Attendance Row Specific) */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel glow-crimson space-y-5 no-print">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#871a1d]/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#871a1d] uppercase">Adjust Delivery Options</h3>
                <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                  Customer: {editingCustomer.id} &bull; {editingCustomer.name || 'Anonymous'}
                </span>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-1 text-slate-400 hover:text-[#871a1d] rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              {/* Plan parameters overrides */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-medium mb-1.5">Pack Type</label>
                  <select
                    className="w-full px-3 py-2.5 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800"
                    value={tempPackType}
                    onChange={(e) => setTempPackType(e.target.value)}
                  >
                    <option value="SINGLE">Single Pack</option>
                    <option value="DOUBLE">Double Pack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1.5">Rice Preference</label>
                  <select
                    className="w-full px-3 py-2.5 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800"
                    value={String(tempWithRice)}
                    onChange={(e) => setTempWithRice(e.target.value === 'true')}
                  >
                    <option value="false">Without Rice</option>
                    <option value="true">With Rice</option>
                  </select>
                </div>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-slate-600 font-medium mb-1.5">Billing / Payment Mode</label>
                <select
                  className="w-full px-3 py-2.5 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800"
                  value={tempPaymentStatus}
                  onChange={(e) => setTempPaymentStatus(e.target.value)}
                >
                  <option value="PENDING">Add to Invoice (Pending)</option>
                  <option value="PAID">Paid Instantly (Cash)</option>
                </select>
              </div>

              {/* Extras quantity adjustment */}
              <div className="space-y-2.5 pt-2 border-t border-[#871a1d]/10">
                <span className="block text-xs font-semibold text-slate-500 uppercase">Daily Add-on Extras</span>
                {Object.keys(tempExtrasQty).map((extra) => (
                  <div key={extra} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-800 block">{extra}</span>
                      <span className="text-[9px] text-[#b59410]">
                        +₹{settings[extra === 'Extra Curry' ? 'extra_curry_price' : extra === 'Extra Rice' ? 'extra_rice_price' : extra === 'Sweet' ? 'sweet_price' : 'fry_price'] || '0'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setTempExtrasQty(prev => ({ ...prev, [extra]: Math.max(0, prev[extra] - 1) }))}
                        className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center border-none text-slate-800 text-sm font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-4 text-center font-bold text-slate-800 text-xs">{tempExtrasQty[extra]}</span>
                      <button
                        onClick={() => setTempExtrasQty(prev => ({ ...prev, [extra]: prev[extra] + 1 }))}
                        className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center border-none text-slate-800 text-sm font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total projection */}
              <div className="p-3 bg-[#871a1d]/5 border border-[#871a1d]/10 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                <span className="font-bold text-slate-700">Calculated Cost:</span>
                <span className="font-bold text-base text-[#871a1d]">
                  ₹{getRowCalculatedTotal(editingCustomer, tempPackType, tempWithRice, tempExtrasQty)}
                </span>
              </div>

              {/* Confirm row save */}
              <button
                onClick={handleSaveTempExtras}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition border-none cursor-pointer"
              >
                Apply Options to Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal Overlay */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel glow-crimson space-y-4 no-print">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#871a1d]/10 pb-3">
              <h3 className="text-base font-bold text-[#871a1d] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#871a1d]" /> Register Subscriber
              </h3>
              <button
                onClick={() => setShowAddCustomer(false)}
                className="p-1 text-slate-450 hover:text-[#871a1d] rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/5 border border-red-500/20 text-red-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddCustomerSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Subscriber Code</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 glass-input text-slate-800 text-sm"
                    value={newCustId}
                    onChange={(e) => setNewCustId(e.target.value)}
                    placeholder="LP0005"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 glass-input text-slate-800 text-sm"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="E.g. Raju Verma"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 glass-input text-slate-800 text-sm"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="E.g. 9848012345"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Route / Area</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 glass-input text-slate-800 text-sm"
                    value={newCustRoute}
                    onChange={(e) => setNewCustRoute(e.target.value)}
                    placeholder="E.g. Srinagar"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 glass-input text-slate-800 text-xs"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Enter full physical address for delivery routing..."
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Plan Mode</label>
                  <select
                    className="w-full px-2 py-2 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800 font-medium"
                    value={newCustMode}
                    onChange={(e) => setNewCustMode(e.target.value)}
                  >
                    <option value="DAILY">Daily Plan</option>
                    <option value="MONTHLY">Monthly Plan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Pack Type</label>
                  <select
                    className="w-full px-2 py-2 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800 font-medium"
                    value={newCustPack}
                    onChange={(e) => setNewCustPack(e.target.value)}
                  >
                    <option value="SINGLE">Single Pack</option>
                    <option value="DOUBLE">Double Pack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Rice Preference</label>
                  <select
                    className="w-full px-2 py-2 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800 font-medium"
                    value={String(newCustRice)}
                    onChange={(e) => setNewCustRice(e.target.value === 'true')}
                  >
                    <option value="false">No Rice</option>
                    <option value="true">With Rice</option>
                  </select>
                </div>
              </div>

              {newCustMode === 'MONTHLY' && (
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Monthly Subscription Price (₹)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 glass-input text-slate-800 text-sm font-semibold"
                    value={newCustMonthlyPrice}
                    onChange={(e) => setNewCustMonthlyPrice(e.target.value)}
                    placeholder="Enter manual monthly price, e.g. 3000"
                    required
                  />
                </div>
              )}

              {/* Removed customer dynamic overrides */}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition duration-150 border-none cursor-pointer"
                >
                  Register Subscriber Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Profile Modal Overlay */}
      {editingCustProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel glow-crimson space-y-4 no-print">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#871a1d]/10 pb-3">
              <h3 className="text-base font-bold text-[#871a1d] flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#871a1d]" /> Edit Subscriber Profile
              </h3>
              <button
                onClick={() => setEditingCustProfile(null)}
                className="p-1 text-slate-450 hover:text-[#871a1d] rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditCustProfileSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Subscriber Code</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-sm font-semibold cursor-not-allowed"
                    value={editingCustProfile.id}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 glass-input text-slate-800 text-sm"
                    value={editCustName}
                    onChange={(e) => setEditCustName(e.target.value)}
                    placeholder="E.g. Raju Verma"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 glass-input text-slate-800 text-sm"
                    value={editCustPhone}
                    onChange={(e) => setEditCustPhone(e.target.value)}
                    placeholder="E.g. 9848012345"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Route / Area</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 glass-input text-slate-800 text-sm"
                    value={editCustRoute}
                    onChange={(e) => setEditCustRoute(e.target.value)}
                    placeholder="E.g. Srinagar"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 glass-input text-slate-800 text-xs"
                  value={editCustAddress}
                  onChange={(e) => setEditCustAddress(e.target.value)}
                  placeholder="Enter full physical address for delivery routing..."
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Plan Mode</label>
                  <select
                    className="w-full px-2 py-2 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800 font-medium"
                    value={editCustMode}
                    onChange={(e) => setEditCustMode(e.target.value)}
                  >
                    <option value="DAILY">Daily Plan</option>
                    <option value="MONTHLY">Monthly Plan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Pack Type</label>
                  <select
                    className="w-full px-2 py-2 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800 font-medium"
                    value={editCustPack}
                    onChange={(e) => setEditCustPack(e.target.value)}
                  >
                    <option value="SINGLE">Single Pack</option>
                    <option value="DOUBLE">Double Pack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Rice Preference</label>
                  <select
                    className="w-full px-2 py-2 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800 font-medium"
                    value={String(editCustRice)}
                    onChange={(e) => setEditCustRice(e.target.value === 'true')}
                  >
                    <option value="false">No Rice</option>
                    <option value="true">With Rice</option>
                  </select>
                </div>
              </div>

              {editCustMode === 'MONTHLY' && (
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Monthly Subscription Price (₹)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 glass-input text-slate-800 text-sm font-semibold"
                    value={editCustMonthlyPrice}
                    onChange={(e) => setEditCustMonthlyPrice(e.target.value)}
                    placeholder="Enter manual monthly price, e.g. 3000"
                    required
                  />
                </div>
              )}

              {/* Removed customer dynamic overrides */}

              <div>
                <label className="block text-slate-600 font-medium mb-1">Status</label>
                <select
                  className="w-full px-2 py-2 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800 font-medium"
                  value={String(editCustActive)}
                  onChange={(e) => setEditCustActive(e.target.value === 'true')}
                >
                  <option value="true">Active Subscriber</option>
                  <option value="false">Inactive / Suspended</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition duration-150 border-none cursor-pointer"
                >
                  Save Profile Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Pricing Plan Modal Overlay */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel glow-crimson space-y-4 no-print">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#871a1d]/10 pb-3">
              <h3 className="text-base font-bold text-[#871a1d] flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#871a1d]" /> Edit Pricing Plan
              </h3>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-1 text-slate-450 hover:text-[#871a1d] rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditPlanSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Plan Configuration</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-100 text-slate-505 border border-slate-200 rounded-lg text-sm font-semibold cursor-not-allowed uppercase"
                  value={`${editingPlan.mode} - ${editingPlan.packType} - ${editingPlan.withRice ? 'WITH RICE' : 'NO RICE'}`}
                  disabled
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Base Price (₹)</label>
                <input
                  type="number"
                  step="any"
                  className="w-full px-3 py-2 glass-input text-slate-800 text-sm font-bold"
                  value={editPlanPrice}
                  onChange={(e) => setEditPlanPrice(e.target.value)}
                  placeholder="E.g. 130"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Status</label>
                <select
                  className="w-full px-2 py-2 bg-[#faf6ee] border border-[#871a1d]/15 rounded-lg text-xs text-slate-800 font-medium"
                  value={String(editPlanActive)}
                  onChange={(e) => setEditPlanActive(e.target.value === 'true')}
                >
                  <option value="true">Active Configuration</option>
                  <option value="false">Inactive / Suspended</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition duration-150 border-none cursor-pointer"
                >
                  Save Pricing Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LunchPacksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#871a1d]"></div>
      </div>
    }>
      <LunchPacksContent />
    </Suspense>
  );
}
