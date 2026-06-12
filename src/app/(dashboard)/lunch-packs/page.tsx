'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  getLunchCustomers,
  addLunchCustomer,
  getSettings,
  recordLunchTransaction,
  generateMonthlyInvoice,
  recordLunchPayment,
  toggleLunchCustomerStatus
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
  AlertCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';

export default function LunchPacksPage() {
  // Core lists
  const [customers, setCustomers] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Active Scanner & Quick Select
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<any>(null);

  // Active Billing Transaction State
  const [packType, setPackType] = useState('SINGLE');
  const [withRice, setWithRice] = useState(false);
  const [extraQty, setExtraQty] = useState<Record<string, number>>({
    'Extra Curry': 0,
    'Extra Rice': 0,
    'Sweet': 0,
    'Fry': 0,
  });
  const [paymentStatus, setPaymentStatus] = useState('PENDING'); // PENDING or PAID (for daily walk-ins)
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);

  // Invoice / Payment State
  const [selectedInvoiceCustomer, setSelectedInvoiceCustomer] = useState<any | null>(null);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [invoiceMonth, setInvoiceMonth] = useState(new Date().getMonth() + 1);
  const [invoiceYear, setInvoiceYear] = useState(new Date().getFullYear());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  // UI Modals
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showQRModal, setShowQRModal] = useState<any | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // New Customer Form State
  const [newCustId, setNewCustId] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustPack, setNewCustPack] = useState('SINGLE');
  const [newCustRice, setNewCustRice] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load Initial Data
  useEffect(() => {
    async function init() {
      try {
        const custs = await getLunchCustomers();
        const sets = await getSettings();
        setCustomers(custs);
        setSettings(sets);
        
        // Auto-increment Next Customer ID LPXXXX
        const activeIds = custs.map(c => parseInt(c.id.replace('LP', ''))).filter(n => !isNaN(n));
        const maxId = activeIds.length > 0 ? Math.max(...activeIds) : 0;
        const nextId = 'LP' + String(maxId + 1).padStart(4, '0');
        setNewCustId(nextId);
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Sync pricing values based on options
  const calculatePriceBreakdown = () => {
    let basePrice = 0;
    if (packType === 'SINGLE') {
      basePrice = parseFloat(settings[withRice ? 'single_pack_rice_price' : 'single_pack_price'] || '120');
    } else {
      basePrice = parseFloat(settings[withRice ? 'double_pack_rice_price' : 'double_pack_price'] || '200');
    }

    const extCurryPrice = parseFloat(settings['extra_curry_price'] || '40') * (extraQty['Extra Curry'] || 0);
    const extRicePrice = parseFloat(settings['extra_rice_price'] || '30') * (extraQty['Extra Rice'] || 0);
    const sweetPrice = parseFloat(settings['sweet_price'] || '25') * (extraQty['Sweet'] || 0);
    const fryPrice = parseFloat(settings['fry_price'] || '35') * (extraQty['Fry'] || 0);

    const extrasTotal = extCurryPrice + extRicePrice + sweetPrice + fryPrice;
    const total = basePrice + extrasTotal;

    return {
      basePrice,
      extras: [
        { name: 'Extra Curry', qty: extraQty['Extra Curry'], total: extCurryPrice },
        { name: 'Extra Rice', qty: extraQty['Extra Rice'], total: extRicePrice },
        { name: 'Sweet', qty: extraQty['Sweet'], total: sweetPrice },
        { name: 'Fry', qty: extraQty['Fry'], total: fryPrice },
      ].filter(e => e.qty > 0),
      total,
    };
  };

  const priceBreakdown = calculatePriceBreakdown();

  // Load customer defaults when selected
  const handleSelectCustomer = (customer: any) => {
    setActiveCustomer(customer);
    setPackType(customer.defaultPackType);
    setWithRice(customer.defaultWithRice);
    setExtraQty({
      'Extra Curry': 0,
      'Extra Rice': 0,
      'Sweet': 0,
      'Fry': 0,
    });
    setPaymentStatus('PENDING'); // standard monthly customers pay later
  };

  // Launch Webcam QR Scanner
  const startScanning = async () => {
    setIsScanning(true);
    // Delay initialization until DOM renders readers div
    setTimeout(() => {
      try {
        const { Html5QrcodeScanner } = require('html5-qrcode');
        const scanner = new Html5QrcodeScanner(
          'reader',
          { fps: 15, qrbox: { width: 220, height: 220 } },
          false
        );
        
        scanner.render(
          (decodedText: string) => {
            const cleanedText = decodedText.trim();
            const matched = customers.find(c => c.id === cleanedText || c.qrCode === cleanedText);
            if (matched) {
              handleSelectCustomer(matched);
              scanner.clear();
              setIsScanning(false);
            }
          },
          (error: any) => {
            // silent scan errors
          }
        );
        scannerRef.current = scanner;
      } catch (err) {
        console.error('Scanner init error', err);
      }
    }, 300);
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) {}
    }
    setIsScanning(false);
  };

  // Record daily transaction log
  const handleSaveTransaction = async () => {
    if (!activeCustomer) return;
    try {
      const formattedExtras = priceBreakdown.extras.map(e => ({
        name: e.name,
        price: parseFloat(settings[e.name === 'Extra Curry' ? 'extra_curry_price' : e.name === 'Extra Rice' ? 'extra_rice_price' : e.name === 'Sweet' ? 'sweet_price' : 'fry_price'] || '0'),
        quantity: e.qty
      }));

      await recordLunchTransaction({
        customerId: activeCustomer.id,
        packType,
        withRice,
        extras: formattedExtras,
        totalAmount: priceBreakdown.total,
        date: transactionDate,
        paymentStatus,
      });

      // Clear selection & alert success
      alert(`Recorded transaction of ₹${priceBreakdown.total} for ${activeCustomer.id}`);
      setActiveCustomer(null);
      // Reload customers to refresh ledger status if page was displaying invoice
      if (selectedInvoiceCustomer?.id === activeCustomer.id) {
        handleLoadInvoice(activeCustomer);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save transaction');
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

    if (customers.some(c => c.id.toLowerCase() === newCustId.trim().toLowerCase())) {
      setFormError('Customer Code already exists.');
      return;
    }

    try {
      const newCustomer = await addLunchCustomer({
        id: newCustId.trim().toUpperCase(),
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        defaultPackType: newCustPack,
        defaultWithRice: newCustRice,
      });

      const updatedCusts = await getLunchCustomers();
      setCustomers(updatedCusts);
      
      // Auto increment next ID
      const activeIds = updatedCusts.map(c => parseInt(c.id.replace('LP', ''))).filter(n => !isNaN(n));
      const maxId = activeIds.length > 0 ? Math.max(...activeIds) : 0;
      const nextId = 'LP' + String(maxId + 1).padStart(4, '0');
      
      setNewCustId(nextId);
      setNewCustName('');
      setNewCustPhone('');
      setShowAddCustomer(false);
      
      // Open QR print view automatically
      handleShowQR(newCustomer);
    } catch (err) {
      setFormError('Failed to create customer record.');
    }
  };

  // Generate & Preview Customer QR Modal
  const handleShowQR = async (customer: any) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(customer.id, { width: 300, margin: 2 });
      setQrCodeUrl(qrDataUrl);
      setShowQRModal(customer);
    } catch (err) {
      console.error('QR code generation failed', err);
    }
  };

  // Print QR Code Card
  const printQRCode = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code Card - ${showQRModal?.id}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
            }
            .card {
              border: 2px solid #10b981;
              border-radius: 12px;
              padding: 24px;
              width: 80mm;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .title {
              font-size: 16px;
              font-weight: bold;
              color: #0d1423;
              margin-bottom: 2px;
            }
            .subtitle {
              font-size: 10px;
              color: #10b981;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 15px;
            }
            .qr {
              width: 180px;
              height: 180px;
            }
            .code {
              font-size: 24px;
              font-weight: bold;
              color: #000;
              margin-top: 10px;
              letter-spacing: 1px;
            }
            .info {
              font-size: 11px;
              color: #666;
              margin-top: 6px;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="card">
            <div class="title">SRI SANDILYASA CATERERS</div>
            <div class="subtitle">Lunch Pack Card</div>
            <img class="qr" src="${qrCodeUrl}" />
            <div class="code">${showQRModal?.id}</div>
            <div class="info">${showQRModal?.name || 'Customer Profile'}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Compile monthly invoice
  const handleLoadInvoice = async (customer: any) => {
    setSelectedInvoiceCustomer(customer);
    try {
      const data = await generateMonthlyInvoice(customer.id, invoiceYear, invoiceMonth);
      setInvoiceData(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Record payment log
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
      // Reload billing statement
      handleLoadInvoice(selectedInvoiceCustomer);
      alert('Payment logged successfully');
    } catch (err) {
      alert('Failed to record payment');
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
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #10b981; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .info-table td { padding: 6px 0; }
            .ledger-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .ledger-table th, .ledger-table td { border-bottom: 1px solid #ddd; padding: 12px 10px; text-align: left; }
            .ledger-table th { background: #f8fafc; color: #475569; }
            .summary { margin-left: auto; width: 300px; border-top: 2px solid #000; padding-top: 15px; }
            .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
            .summary-total { font-weight: bold; font-size: 18px; color: #10b981; }
            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #666; }
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
              <h2 style="margin: 0; font-size: 20px;">LUNCH PACK INVOICE</h2>
              <div style="font-size: 14px; font-weight: bold; color: #10b981; margin-top: 5px;">${invoiceMonthName.toUpperCase()} ${invoiceYear}</div>
            </div>
          </div>

          <table class="info-table">
            <tr>
              <td style="width: 50%; vertical-align: top;">
                <strong>CUSTOMER DETAILS</strong><br/>
                Customer Code: ${invoiceData.customer.id}<br/>
                Name: ${invoiceData.customer.name || 'N/A'}<br/>
                Phone: ${invoiceData.customer.phone || 'N/A'}
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
            <div class="summary-row">
              <span>Total Accrued:</span>
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
            <p>For support, contact +91 76615 88676 or +91 98491 05886</p>
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

  // Filter customer list
  const filteredCustomers = customers.filter(
    (c) =>
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Beef className="w-8 h-8 text-emerald-400" /> Lunch Pack Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage daily lunch pack check-ins, register customers, scan QR codes, and generate monthly ledger sheets.
          </p>
        </div>
        <button
          onClick={() => setShowAddCustomer(true)}
          className="flex items-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/10 border-none transition duration-150 cursor-pointer"
        >
          <UserPlus className="w-4 h-4 shrink-0" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start no-print">
        
        {/* Left Column (8 cols): QR Scan & Transaction Entry */}
        <div className="xl:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl glass-panel relative overflow-hidden">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-400" /> Daily Transaction Check-In
            </h3>

            {/* Scanning Panel */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={isScanning ? stopScanning : startScanning}
                  className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isScanning
                      ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>{isScanning ? 'Close Camera' : 'Start QR Camera'}</span>
                </button>
              </div>

              {isScanning && (
                <div className="max-w-md mx-auto overflow-hidden rounded-xl border border-white/10 bg-black/40 p-2 relative">
                  <div id="reader" className="w-full h-auto overflow-hidden rounded-lg"></div>
                </div>
              )}
            </div>

            {/* Quick search input overlay */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search code or name to check-in manually (e.g. LP0001 Raju)..."
                className="w-full pl-10 pr-4 py-3 glass-input text-white text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {filteredCustomers.length > 0 && searchQuery && (
                <div className="absolute top-12 left-0 right-0 max-h-48 overflow-y-auto glass-panel rounded-xl z-20 shadow-xl border border-white/10 mt-1 divide-y divide-white/5">
                  {filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        handleSelectCustomer(c);
                        setSearchQuery('');
                      }}
                      className="p-3 hover:bg-emerald-500/10 cursor-pointer flex justify-between items-center text-sm"
                    >
                      <div>
                        <span className="font-bold text-white mr-3">{c.id}</span>
                        <span className="text-slate-300">{c.name || 'Anonymous'}</span>
                      </div>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase">
                        {c.defaultPackType}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Billing Compilation Card */}
            {activeCustomer ? (
              <div className="p-6 rounded-xl bg-white/5 border border-white/5 space-y-6">
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div>
                    <h4 className="text-lg font-bold text-emerald-400">{activeCustomer.id}</h4>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      Name: {activeCustomer.name || 'Anonymous'} &bull; Phone: {activeCustomer.phone || 'N/A'}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveCustomer(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg border-none bg-transparent cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left sub */}
                  <div className="space-y-4">
                    {/* Pack select */}
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pack Type</span>
                      <div className="grid grid-cols-2 gap-3">
                        {['SINGLE', 'DOUBLE'].map((p) => (
                          <button
                            key={p}
                            onClick={() => setPackType(p)}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                              packType === p
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-transparent border-white/5 text-slate-300 hover:bg-white/5'
                            }`}
                          >
                            {p} Pack
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rice switch */}
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Rice Option</span>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Without Rice', value: false },
                          { label: 'With Rice', value: true },
                        ].map((o) => (
                          <button
                            key={String(o.value)}
                            onClick={() => setWithRice(o.value)}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                              withRice === o.value
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-transparent border-white/5 text-slate-300 hover:bg-white/5'
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Transaction Date */}
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Transaction Date</span>
                      <input
                        type="date"
                        className="w-full px-3 py-2 glass-input text-sm text-white"
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                      />
                    </div>

                    {/* Payment status toggle */}
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Billing Method</span>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Add to Monthly Bill', value: 'PENDING' },
                          { label: 'Pay Cash Instantly', value: 'PAID' },
                        ].map((pm) => (
                          <button
                            key={pm.value}
                            onClick={() => setPaymentStatus(pm.value)}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                              paymentStatus === pm.value
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-transparent border-white/5 text-slate-300 hover:bg-white/5'
                            }`}
                          >
                            {pm.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right sub - Extras */}
                  <div className="space-y-4">
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Add-on Extras</span>
                    <div className="space-y-2">
                      {Object.keys(extraQty).map((extra) => (
                        <div key={extra} className="flex justify-between items-center p-2.5 rounded-xl bg-white/5 border border-white/5 text-sm">
                          <div>
                            <span className="font-semibold text-white block">{extra}</span>
                            <span className="text-[10px] text-emerald-400">
                              +₹{settings[extra === 'Extra Curry' ? 'extra_curry_price' : extra === 'Extra Rice' ? 'extra_rice_price' : extra === 'Sweet' ? 'sweet_price' : 'fry_price'] || '0'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setExtraQty(prev => ({ ...prev, [extra]: Math.max(0, prev[extra] - 1) }))}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center border-none text-white text-lg font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-4 text-center font-bold text-white text-sm">{extraQty[extra]}</span>
                            <button
                              onClick={() => setExtraQty(prev => ({ ...prev, [extra]: prev[extra] + 1 }))}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center border-none text-white text-lg font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Amount breakdown panel */}
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-3 font-sans">
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Price Details</span>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>Base Pack ({packType} {withRice ? '+ Rice' : ''})</span>
                      <span>₹{priceBreakdown.basePrice}</span>
                    </div>
                    {priceBreakdown.extras.map((e) => (
                      <div key={e.name} className="flex justify-between text-slate-400">
                        <span>{e.name} (x{e.qty})</span>
                        <span>+₹{e.total}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-base font-bold text-emerald-400 border-t border-white/5 pt-2.5 mt-2.5">
                      <span>Total Amount</span>
                      <span>₹{priceBreakdown.total}</span>
                    </div>
                  </div>
                </div>

                {/* Save action */}
                <button
                  onClick={handleSaveTransaction}
                  className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition duration-150 shadow-lg shadow-emerald-500/10 border-none cursor-pointer"
                >
                  Confirm Check-In & Save
                </button>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">
                <QrCode className="w-12 h-12 text-slate-500/80 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">No Customer Selected</p>
                <p className="text-xs text-slate-500 mt-1">Scan a QR Card or search code to compile transaction</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Customer Directory */}
        <div className="xl:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl glass-panel relative">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" /> Customer List & Billing Ledgers
            </h3>

            {/* Quick search filter */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers..."
                className="w-full pl-9 pr-4 py-2 glass-input text-xs text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto space-y-2 divide-y divide-white/5 scrollbar-thin">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center py-3 px-2 text-xs hover:bg-white/5 transition rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400 text-sm">{c.id}</span>
                        {c.name && <span className="text-slate-200 font-semibold">{c.name}</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Default: {c.defaultPackType} Pack ({c.defaultWithRice ? 'With Rice' : 'No Rice'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShowQR(c)}
                        title="Generate QR code card"
                        className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-lg cursor-pointer transition shrink-0"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleLoadInvoice(c)}
                        title="View monthly statement"
                        className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-lg cursor-pointer transition shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">No customer records matching query</div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Invoice Ledger overlay (if loaded) */}
      {selectedInvoiceCustomer && invoiceData && (
        <div className="p-6 rounded-2xl glass-panel relative overflow-hidden font-sans space-y-6 no-print">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" /> Account Statement for {invoiceData.customer.id}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Profile: {invoiceData.customer.name || 'Anonymous'} &bull; Phone: {invoiceData.customer.phone || 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <select
                className="px-2.5 py-1.5 bg-[#0d1423] text-white border border-white/10 rounded-lg text-xs"
                value={invoiceMonth}
                onChange={(e) => {
                  setInvoiceMonth(parseInt(e.target.value));
                  // Auto reload with newly selected parameters
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
                className="px-2.5 py-1.5 bg-[#0d1423] text-white border border-white/10 rounded-lg text-xs"
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
                className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-lg border-none cursor-pointer transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
              <button
                onClick={handleExportLedgerExcel}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-white/10 cursor-pointer transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Invoice summary cards */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">Total Accrued</span>
                  <span className="text-xl font-bold text-white">₹{invoiceData.totalAmount}</span>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">Total Paid</span>
                  <span className="text-xl font-bold text-emerald-400">₹{invoiceData.totalPaid}</span>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">Outstanding Balance</span>
                  <span className="text-xl font-bold text-amber-400">₹{invoiceData.balance}</span>
                </div>
              </div>

              {/* Transactions log table */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <h4 className="text-sm font-semibold text-white mb-3">Daily logs in selected period</h4>
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
                    <tbody className="divide-y divide-white/5 text-slate-200">
                      {invoiceData.transactions.length > 0 ? (
                        invoiceData.transactions.map((t: any) => (
                          <tr key={t.id}>
                            <td className="py-2.5">{new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td className="py-2.5">{t.packType} Pack</td>
                            <td className="py-2.5">{t.withRice ? 'Yes' : 'No'}</td>
                            <td className="py-2.5 text-slate-400">
                              {t.extras && Array.isArray(t.extras) 
                                ? t.extras.map((e: any) => `${e.name}(${e.quantity})`).join(', ') 
                                : '-'}
                            </td>
                            <td className="py-2.5 text-right font-semibold text-white">₹{t.totalAmount}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">No daily transactions logged in this month</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Quick Record Payment Form */}
            <div className="lg:col-span-1 p-6 rounded-xl bg-white/5 border border-white/5">
              <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Record Billing Payment
              </h4>
              <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-slate-300 font-medium mb-1" htmlFor="pamt">
                    Payment Amount (₹)
                  </label>
                  <input
                    id="pamt"
                    type="number"
                    step="any"
                    className="w-full px-3 py-2 glass-input text-white text-sm"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount, e.g. 1500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1" htmlFor="pmthd">
                    Payment Method
                  </label>
                  <select
                    id="pmthd"
                    className="w-full px-3 py-2 bg-[#0d1423] text-white border border-white/10 rounded-lg text-xs"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / Digital</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1" htmlFor="pnote">
                    Payment Reference / Notes
                  </label>
                  <textarea
                    id="pnote"
                    rows={2}
                    className="w-full px-3 py-2 glass-input text-white text-xs"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="E.g., paid for June via PhonePe"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition duration-150 border-none cursor-pointer"
                >
                  Record Payment
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* Add Customer Modal Overlay */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel glow-green space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" /> Add New Lunch Customer
              </h3>
              <button
                onClick={() => setShowAddCustomer(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddCustomerSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Customer Code (e.g. LP0005)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 glass-input text-white text-sm"
                  value={newCustId}
                  onChange={(e) => setNewCustId(e.target.value)}
                  placeholder="LP0005"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Customer Name (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 glass-input text-white text-sm"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="E.g. Raju Verma"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 glass-input text-white text-sm"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="E.g. 9848012345"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Default Pack Type</label>
                  <select
                    className="w-full px-3 py-2 bg-[#0d1423] text-white border border-white/10 rounded-lg text-sm"
                    value={newCustPack}
                    onChange={(e) => setNewCustPack(e.target.value)}
                  >
                    <option value="SINGLE">Single Pack</option>
                    <option value="DOUBLE">Double Pack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Default Rice Preference</label>
                  <select
                    className="w-full px-3 py-2 bg-[#0d1423] text-white border border-white/10 rounded-lg text-sm"
                    value={String(newCustRice)}
                    onChange={(e) => setNewCustRice(e.target.value === 'true')}
                  >
                    <option value="false">Without Rice (Dry)</option>
                    <option value="true">With Rice</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition duration-150 border-none cursor-pointer"
              >
                Register Customer & Generate QR
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR Display / Print Modal Overlay */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="w-full max-w-sm p-6 rounded-2xl glass-panel glow-amber text-center space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white">QR Code Generated</h3>
              <button
                onClick={() => setShowQRModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-xl inline-block">
              <img src={qrCodeUrl} alt="Customer QR Code" className="w-48 h-48 mx-auto" />
            </div>

            <div>
              <span className="text-xl font-bold text-white block">{showQRModal.id}</span>
              <span className="text-xs text-slate-400 block mt-0.5">{showQRModal.name || 'Lunch Pack Customer'}</span>
            </div>

            <button
              onClick={printQRCode}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 border-none cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Card</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
