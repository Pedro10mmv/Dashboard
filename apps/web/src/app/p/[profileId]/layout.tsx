'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  name: string;
  domainsEnabled: string[];
}

const NAV_ITEMS = [
  { href: 'dashboard', label: 'Dashboard', icon: '📊' },
  { href: 'studio', label: 'Studio', icon: '🎮', domain: 'studio' },
  { href: 'studio/initiatives', label: 'Initiatives', icon: '🎯', domain: 'studio', indent: true },
  { href: 'weekly', label: 'Weekly Plan', icon: '📋' },
  { href: 'daily', label: 'Daily Check-in', icon: '☀️' },
  { href: 'training', label: 'Training', icon: '💪', domain: 'ironman' },
  { href: 'ironman', label: 'Ironman', icon: '🏊', domain: 'ironman' },
  { href: 'nutrition', label: 'Nutrition', icon: '🥗', domain: 'nutrition' },
  { href: 'finance', label: 'Finance', icon: '💰', domain: 'finance' },
  { href: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const profileId = params.profileId as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && profileId) {
      api.get<Profile>(`/api/profiles/${profileId}`)
        .then(setProfile)
        .catch(() => router.push('/profiles'));
    }
  }, [user, authLoading, profileId, router]);

  if (authLoading || !profile) {
    return <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">Loading...</div>;
  }

  const basePath = `/p/${profileId}`;
  const visibleItems = NAV_ITEMS.filter(item => !item.domain || profile.domainsEnabled.includes(item.domain));

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static z-50 top-0 left-0 h-full w-64 bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col transition-transform lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-4 border-b border-[var(--border)]">
          <Link href="/profiles" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            ← Profiles
          </Link>
          <h2 className="text-lg font-bold mt-1">🚀 {profile.name}</h2>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {visibleItems.map(item => {
            const href = `${basePath}/${item.href}`;
            const isActive = pathname === href || (item.href !== 'dashboard' && pathname.startsWith(href + '/'));
            const isDashActive = item.href === 'dashboard' && pathname === href;
            return (
              <Link
                key={item.href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  item.indent && 'ml-4',
                  (isActive || isDashActive) ? 'bg-brand-600/20 text-brand-300' : 'text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text)]'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-[var(--border)]">
          <button onClick={() => setSidebarOpen(true)} className="text-xl">☰</button>
          <span className="font-semibold">{profile.name}</span>
          <div className="w-6" />
        </div>

        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
