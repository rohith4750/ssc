'use client';

import React, { useState, useEffect } from 'react';
import { getMenuItems, createCurryPointOrder } from '@/actions/db';
import {
  Soup,
  Trash2,
  DollarSign,
  Printer,
  X,
  Check,
  CreditCard,
  PhoneCall,
  UtensilsCrossed,
  User,
  ShoppingBag
} from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CurryPointPage() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');

  // Cash change calculator states
  const [cashReceived, setCashReceived] = useState('');
  const [changeDue, setChangeDue] = useState(0);

  // Success state for print receipt preview
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  // Load Menu Items on mount
  useEffect(() => {
    async function load() {
      try {
        const items = await getMenuItems('CURRY_POINT');
        setMenuItems(items);
      } catch (err) {
        console.error('Failed to load menu items', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Recalculate change due
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    if (paymentMethod === 'CASH' && cashReceived) {
      const received = parseFloat(cashReceived) || 0;
      setChangeDue(received - totalAmount);
    } else {
      setChangeDue(0);
    }
  }, [cashReceived, totalAmount, paymentMethod]);

  // Add Item to POS Cart
  const handleAddToOrder = (item: any) => {
    setCart((prevCart) => {
      const existing = prevCart.find((ci) => ci.id === item.id);
      if (existing) {
        return prevCart.map((ci) =>
          ci.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prevCart, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  // Modify quantities inside Cart
  const updateQty = (id: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((ci) => (ci.id === id ? { ...ci, quantity: ci.quantity + delta } : ci))
        .filter((ci) => ci.quantity > 0)
    );
  };

  const handleClearCart = () => {
    setCart([]);
    setCashReceived('');
  };

  // Submit checkout
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (paymentMethod === 'CASH') {
      const received = parseFloat(cashReceived) || 0;
      if (received < totalAmount) {
        alert('Received cash is less than total amount!');
        return;
      }
    }

    try {
      const order = await createCurryPointOrder({
        items: cart.map((ci) => ({ name: ci.name, price: ci.price, quantity: ci.quantity })),
        totalAmount,
        paymentMethod,
      });

      // Save order context for printing
      setCompletedOrder({
        id: order.id,
        date: order.createdAt,
        items: cart,
        total: totalAmount,
        paymentMethod,
        cashReceived: paymentMethod === 'CASH' ? parseFloat(cashReceived) : 0,
        changeDue: paymentMethod === 'CASH' ? parseFloat(cashReceived) - totalAmount : 0,
      });

      // Clear states
      setCart([]);
      setCashReceived('');
    } catch (err) {
      console.error(err);
      alert('Failed to process checkout transaction');
    }
  };

  // Trigger Receipt Printing (Thermal 80mm layout)
  const handlePrintReceipt = () => {
    if (!completedOrder) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsRows = completedOrder.items
      .map(
        (item: any) => `
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span>${item.name} x${item.quantity}</span>
        <span>₹${item.price * item.quantity}</span>
      </div>
    `
      )
      .join('');

    const formattedDate = new Date(completedOrder.date).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - SSC Curry Point</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 10px;
              color: #000;
              width: 76mm;
              font-size: 12px;
              line-height: 1.4;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .title { font-size: 16px; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center bold title">SRI SANDILYASA CATERERS</div>
          <div class="center">Traditional Catering • Curry Point</div>
          <div class="center">📍 Kakinada, Andhra Pradesh</div>
          <div class="center">📞 +91 76615 88676</div>
          <div class="divider"></div>
          <div><strong>Receipt ID:</strong> cp_${completedOrder.id.slice(0, 8)}</div>
          <div><strong>Date:</strong> ${formattedDate}</div>
          <div><strong>Type:</strong> Curry Point Walk-In</div>
          <div class="divider"></div>
          <div class="bold" style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>Item Description</span>
            <span>Subtotal</span>
          </div>
          ${itemsRows}
          <div class="divider"></div>
          <div class="bold" style="display: flex; justify-content: space-between; font-size: 14px;">
            <span>GRAND TOTAL</span>
            <span>₹${completedOrder.total}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px;">
            <span>Payment Method</span>
            <span>${completedOrder.paymentMethod}</span>
          </div>
          ${
            completedOrder.paymentMethod === 'CASH'
              ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Cash Tendered</span>
            <span>₹${completedOrder.cashReceived}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Change Returned</span>
            <span>₹${completedOrder.changeDue}</span>
          </div>
          `
              : ''
          }
          <div class="divider"></div>
          <div class="center bold" style="margin-top: 15px;">AUTHENTIC HOMEMADE TASTE</div>
          <div class="center">Thank you for visiting! Come again.</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="no-print">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Soup className="w-8 h-8 text-emerald-400" /> Curry Point POS Checkout
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Fast-billing POS checkouts for walk-in curry point orders. Instant cash calculator and print receipts.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start no-print">
        {/* Left Grid: Menu registry */}
        <div className="xl:col-span-8 p-6 rounded-2xl glass-panel relative">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-400" /> Select Curry Pack Sizes & Items
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading curry point menu items...</div>
          ) : menuItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleAddToOrder(item)}
                  className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/5 active:scale-95 transition cursor-pointer text-center flex flex-col justify-between h-32"
                >
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20 mx-auto mb-2 text-emerald-400 font-bold">
                    🍲
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 text-xs block truncate" title={item.name}>
                      {item.name}
                    </span>
                    <span className="text-emerald-400 text-sm font-bold block mt-1">
                      ₹{item.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">
              No active items configured under Curry Point menu category. Update menu items in settings.
            </div>
          )}
        </div>

        {/* Right Columns: POS Checkout basket */}
        <div className="xl:col-span-4 p-6 rounded-2xl glass-panel relative flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              🛒 Current Order Cart
            </h3>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 border-none bg-transparent cursor-pointer font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Cart
              </button>
            )}
          </div>

          {/* Cart list */}
          <div className="max-h-60 overflow-y-auto space-y-3 divide-y divide-white/5 pr-1 scrollbar-thin">
            {cart.length > 0 ? (
              cart.map((ci) => (
                <div key={ci.id} className="flex justify-between items-center py-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-200 block truncate">{ci.name}</span>
                    <span className="text-slate-400">₹{ci.price} each</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(ci.id, -1)}
                      className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border-none cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold text-white">{ci.quantity}</span>
                    <button
                      onClick={() => updateQty(ci.id, 1)}
                      className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border-none cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">Basket is empty. Select items.</div>
            )}
          </div>

          {/* Total & Checkout Form */}
          {cart.length > 0 && (
            <form onSubmit={handleCheckoutSubmit} className="space-y-4 pt-4 border-t border-white/5">
              {/* Payment selector tabs */}
              <div className="grid grid-cols-3 gap-2 bg-[#090d16] p-1 rounded-xl border border-white/5">
                {(['CASH', 'UPI', 'CARD'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer border-none ${
                      paymentMethod === method
                        ? 'bg-emerald-500 text-white'
                        : 'bg-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* Cash Inputs */}
              {paymentMethod === 'CASH' && (
                <div className="space-y-3 pt-2">
                  <div className="flex gap-2">
                    {[50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashReceived(String(amt))}
                        className="flex-1 py-1 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">
                      Cash Tendered (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="w-full px-3 py-2 glass-input text-white text-sm"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="Amount given by customer..."
                      required
                    />
                  </div>
                </div>
              )}

              {/* Bill Details */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Grand Total</span>
                  <span className="font-bold text-white">₹{totalAmount}</span>
                </div>
                {paymentMethod === 'CASH' && (
                  <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                    <span>Change Due</span>
                    <span
                      className={`font-bold ${
                        changeDue >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      ₹{changeDue.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition duration-150 border-none cursor-pointer"
              >
                Checkout & Print Receipt
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Success Receipt Print View Dialog */}
      {completedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="w-full max-w-sm p-6 rounded-2xl glass-panel glow-green space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" /> Transaction Complete!
              </h3>
              <button
                onClick={() => setCompletedOrder(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Summary representation */}
            <div className="p-4 rounded-xl bg-[#090d16] border border-white/5 space-y-4 font-mono text-[11px] text-slate-300">
              <div className="text-center text-white font-bold text-sm">SRI SANDILYASA CATERERS</div>
              <div className="text-center text-[10px] text-slate-400">Curry Point Receipt Summary</div>
              <div className="border-t border-dashed border-white/10 my-2"></div>
              <div>ID: cp_${completedOrder.id.slice(0, 8)}</div>
              <div>Date: {new Date(completedOrder.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
              <div className="border-t border-dashed border-white/10 my-2"></div>
              {completedOrder.items.map((i: any) => (
                <div key={i.id} className="flex justify-between">
                  <span>{i.name} x{i.quantity}</span>
                  <span>₹{i.price * i.quantity}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-white/10 my-2"></div>
              <div className="flex justify-between text-white font-bold text-sm">
                <span>TOTAL PAID</span>
                <span>₹{completedOrder.total}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payment Mode</span>
                <span>{completedOrder.paymentMethod}</span>
              </div>
              {completedOrder.paymentMethod === 'CASH' && (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>Cash Tendered</span>
                    <span>₹{completedOrder.cashReceived}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Change Returned</span>
                    <span>₹{completedOrder.changeDue}</span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handlePrintReceipt}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 border-none cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Thermal Receipt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
