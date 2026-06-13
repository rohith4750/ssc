import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      {/* Sidebar navigation */}
      <Suspense fallback={<div className="w-64 bg-[#faf6ee] border-r border-[#871a1d]/10 shrink-0 no-print"></div>}>
        <Sidebar user={session.user} />
      </Suspense>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto no-print">
          {children}
        </main>
      </div>
    </div>
  );
}
