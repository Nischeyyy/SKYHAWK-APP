import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, MapPin, Calendar, Briefcase,
  ArrowLeftRight, Clock, FileText, AlertTriangle, DollarSign,
  Megaphone, ShieldCheck, Radio, LogOut, Menu, X, Bird
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { to: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: 'sos',         icon: AlertTriangle,   label: 'SOS Alerts',    alert: true },
  { to: 'live',        icon: Radio,           label: 'Live Locations' },
  { to: 'guards',      icon: Users,           label: 'Guards' },
  { to: 'sites',       icon: MapPin,          label: 'Sites' },
  { to: 'shifts',      icon: Calendar,        label: 'Shifts' },
  { to: 'open-shifts', icon: Briefcase,       label: 'Open Shifts' },
  { to: 'swaps',       icon: ArrowLeftRight,  label: 'Shift Swaps' },
  { to: 'timeclock',   icon: Clock,           label: 'Timeclock' },
  { to: 'incidents',   icon: FileText,        label: 'Incidents' },
  { to: 'payroll',     icon: DollarSign,      label: 'Payroll' },
  { to: 'announcements', icon: Megaphone,     label: 'Announcements' },
  { to: 'compliance',  icon: ShieldCheck,     label: 'Compliance' },
];

function NavItem({ item, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'bg-brand-500 text-black'
            : 'text-slate-400 hover:text-white hover:bg-surface-700'
        } ${item.alert ? 'relative' : ''}`
      }
    >
      <Icon size={18} />
      <span>{item.label}</span>
      {item.alert && (
        <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
    </NavLink>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('mgr_user') || '{}');

  function logout() {
    localStorage.removeItem('mgr_token');
    localStorage.removeItem('mgr_user');
    navigate('/manager/');
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-700">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
          <Bird size={18} className="text-black" />
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight">Skyhawk</p>
          <p className="text-xs text-slate-400">Manager Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV.map(item => (
          <NavItem key={item.to} item={item} onClick={() => setSidebarOpen(false)} />
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-surface-700">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
            {(user.full_name || 'A')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.full_name || 'Admin'}</p>
            <p className="text-xs text-slate-400 truncate">{user.email || ''}</p>
          </div>
          <button onClick={logout} title="Sign out" className="text-slate-400 hover:text-red-400 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 bg-surface-800 border-r border-surface-700">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 flex flex-col w-56 bg-surface-800 border-r border-surface-700">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-surface-800 border-b border-surface-700">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-500 rounded flex items-center justify-center">
              <Bird size={14} className="text-black" />
            </div>
            <span className="font-semibold text-white text-sm">Skyhawk Manager</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
