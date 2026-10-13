import {
  BarChart3,
  Home,
  LogOut,
  Package,
  Plus,
  Settings as SettingsIcon,
  UserCircle,
  Users,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '@pool-quote/shared';
import { useAuth } from '@/auth/AuthContext';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { useSettings } from '@/lib/queries';
import { LinkButton } from '../ui/Button';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: Home, end: true },
  { to: '/quotes', label: 'Quotations', icon: FileText },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products', label: 'Products & services', icon: Package },
  { to: '/reports', label: 'Reports', icon: BarChart3, adminOnly: true },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, adminOnly: true },
];

function Brand({ inverted }: { inverted?: boolean }) {
  const { data: settings } = useSettings();
  return (
    <Link to="/" className="flex items-center gap-3 rounded-lg outline-offset-4">
      {settings?.logoUrl ? (
        <img src={settings.logoUrl} alt="" className="h-9 w-9 rounded-lg bg-white object-contain p-0.5" />
      ) : (
        <img src="/favicon.svg" alt="" className="h-9 w-9 rounded-lg" />
      )}
      <div className="min-w-0 leading-tight">
        <div className={cn('truncate font-display text-[15px] font-extrabold', inverted ? 'text-white' : 'text-brand-900')}>
          {settings?.companyName ?? 'Pool Quotation'}
        </div>
        <div className={cn('text-xs', inverted ? 'text-brand-200' : 'text-ink-muted')}>Quotation desk</div>
      </div>
    </Link>
  );
}

function UserMenu({ placement }: { placement: 'top' | 'bottom' }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;
  const items = [
    ...(isAdmin ? [{ to: '/reports', label: 'Reports', icon: BarChart3 }, { to: '/settings', label: 'Settings', icon: SettingsIcon }] : []),
    { to: '/account', label: 'My account', icon: UserCircle },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/10 lg:hover:bg-white/10"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
          {initials(user.name)}
        </span>
        <span className="hidden min-w-0 flex-1 lg:block">
          <span className="block truncate text-sm font-semibold text-white">{user.name}</span>
          <span className="block truncate text-xs text-brand-200">{ROLE_LABELS[user.role]}</span>
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-40 w-56 rounded-xl border border-surface-line bg-white p-1.5 shadow-lift',
            placement === 'top' ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2',
          )}
        >
          <div className="border-b border-surface-line px-3 py-2">
            <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
            <div className="truncate text-xs text-ink-muted">{user.email}</div>
          </div>
          {items.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} role="menuitem" className="mt-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-surface-alt">
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

const MOBILE_TABS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/quotes', label: 'Quotes', icon: FileText },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
];

export function AppShell() {
  const { isAdmin } = useAuth();
  const nav = NAV.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gradient-to-b from-brand-900 via-brand-900 to-brand-800 px-4 py-5 lg:flex">
        <Brand inverted />
        <LinkButton to="/quotes/new" size="lg" icon={<Plus className="h-5 w-5" />} className="mt-7 w-full !from-aqua-500 !to-aqua-600 shadow-lift hover:!from-aqua-400">
          New quotation
        </LinkButton>
        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Main">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition',
                  isActive ? 'bg-white/12 text-white shadow-inner' : 'text-brand-200 hover:bg-white/8 hover:text-white',
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-3">
          <UserMenu placement="top" />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-surface-line bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <Brand />
        <div className="rounded-full bg-brand-900 text-white">
          <UserMenu placement="bottom" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8 lg:pb-12">
        <Outlet />
      </main>

      {/* Mobile bottom navigation — New Quote is always one tap away */}
      <nav aria-label="Primary" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-surface-line bg-white/95 backdrop-blur lg:hidden">
        <ul className="relative mx-auto grid max-w-lg grid-cols-5 items-end px-2 pt-1.5">
          {MOBILE_TABS.slice(0, 2).map((tab) => <MobileTab key={tab.to} {...tab} />)}
          <li className="flex justify-center">
            <Link
              to="/quotes/new"
              aria-label="New quotation"
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-aqua-400 to-aqua-600 text-white shadow-lift ring-4 ring-white active:scale-95"
            >
              <Plus className="h-7 w-7" />
            </Link>
          </li>
          {MOBILE_TABS.slice(2).map((tab) => <MobileTab key={tab.to} {...tab} />)}
        </ul>
      </nav>
    </div>
  );
}

function MobileTab({ to, label, icon: Icon, end }: NavItem) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cn('flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-semibold', isActive ? 'text-brand-600' : 'text-ink-muted')
        }
      >
        <Icon className="h-5 w-5" />
        {label}
      </NavLink>
    </li>
  );
}
