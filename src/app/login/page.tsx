'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UtensilsCrossed } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@ssc.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error || 'Invalid credentials');
      } else {
        router.refresh();
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#fdfbf7]">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#871a1d]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#b59410]/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md p-8 rounded-2xl glass-panel glow-crimson relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-20 h-20 mb-4 bg-gradient-to-br from-[#871a1d] to-[#b59410] rounded-2xl flex items-center justify-center shadow-lg shadow-[#b59410]/20 transform rotate-3">
            <div className="bg-white/10 w-full h-full absolute rounded-2xl backdrop-blur-sm"></div>
            <span className="text-3xl font-black text-white tracking-wider relative z-10 drop-shadow-md -rotate-3">SSC</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#871a1d] mb-1">Sri Sandilyasa</h1>
          <p className="text-[#b59410] font-bold tracking-wider font-sans uppercase text-sm">Caterers</p>
          <p className="text-slate-600 text-sm mt-2 font-sans">Smart Management System</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 text-red-800 text-sm rounded-xl flex items-center font-sans">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 font-sans">
          <div>
            <label className="block text-slate-700 text-sm font-medium mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-3 glass-input text-slate-800 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 text-sm font-medium mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-3 glass-input text-slate-800 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-red-950 text-white font-medium text-sm rounded-xl transition duration-150 shadow-lg shadow-primary/20 flex items-center justify-center cursor-pointer border-none"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Logging in
              </span>
            ) : (
              'Access Dashboard'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 font-sans">
          📍 Kakinada, Andhra Pradesh &bull; Version 1.0
        </div>
      </div>
    </div>
  );
}
