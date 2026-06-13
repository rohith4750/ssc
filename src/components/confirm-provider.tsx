'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    danger: false,
  });
  const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const confirm: ConfirmFn = useCallback((opts) => {
    setOptions({
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || 'Confirm',
      cancelText: opts.cancelText || 'Cancel',
      danger: opts.danger || false,
    });
    setIsOpen(true);

    return new Promise((resolve) => {
      setResolver({ resolve });
    });
  }, []);

  const handleConfirm = () => {
    if (resolver) resolver.resolve(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolver) resolver.resolve(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div 
            className={`w-full max-w-sm p-6 rounded-2xl glass-panel shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 ${
              options.danger ? 'glow-amber' : 'glow-green'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border ${
                  options.danger 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                }`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">{options.title}</h3>
              </div>
              <button 
                onClick={handleCancel}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-slate-300 text-sm">{options.message}</p>
            
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
              <button
                onClick={handleCancel}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold text-sm border border-white/10 hover:bg-white/5 text-slate-300 transition"
              >
                {options.cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-sm text-white transition shadow-lg ${
                  options.danger 
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' 
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                }`}
              >
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
