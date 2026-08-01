'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { clearToken, getToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { Icon } from './Icon';

export function AppShell({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; phone: string; organization: { name: string } } | null>(null);
  const isDemo = pathname.includes('/demo');

  useEffect(() => {
    if (isDemo) return;
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api.me().then(setUser).catch(() => router.replace('/login'));
  }, [isDemo, router]);

  function logout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <div className={`app-shell ${compact ? 'app-shell-compact' : ''}`}>
      {!compact && (
        <aside className="sidebar">
          <Link className="sidebar-brand" href="/studio">
            <img src="/logo-mark.svg" width={36} height={36} alt="" />
            <span><strong>PropertyTour360</strong><small>Designer Studio</small></span>
          </Link>
          <nav className="sidebar-nav" aria-label="Main navigation">
            <Link className={pathname === '/studio' ? 'active' : ''} href="/studio"><Icon name="projects"/>Projects</Link>
            <a href="#" aria-disabled="true"><Icon name="layers"/>Material library<span className="soon">Soon</span></a>
            <a href="#" aria-disabled="true"><Icon name="sofa"/>Furniture library<span className="soon">Soon</span></a>
          </nav>
          <div className="sidebar-footer">
            <div className="user-chip">
              <span className="avatar">{(user?.name || user?.phone || 'D').slice(0, 1).toUpperCase()}</span>
              <span><strong>{user?.name || 'Designer'}</strong><small>{user?.organization.name || (isDemo ? 'Demo workspace' : 'Loading…')}</small></span>
            </div>
            <button className="icon-button" onClick={logout} title="Sign out"><Icon name="logout"/></button>
          </div>
        </aside>
      )}
      <div className="shell-content">{children}</div>
    </div>
  );
}
