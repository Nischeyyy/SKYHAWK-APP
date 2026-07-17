import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, MapPin, Calendar, Briefcase,
  ArrowLeftRight, Clock, FileText, AlertTriangle, DollarSign,
  Megaphone, ShieldCheck, Radio, LogOut, Menu, X, Bird, Search,
  ChevronDown, PhoneCall
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client.js';

// --- Audio alarm using Web Audio API (no external files needed) ---
function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const times = [0, 0.35, 0.7];
    times.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime + t);
      osc.frequency.setValueAtTime(660, ctx.currentTime + t + 0.15);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.28);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
  } catch (_) {
    // Audio not available — silent fallback
  }
}

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
      { to: 'sos',         icon: AlertTriangle,   label: 'SOS Alerts',    isSos: true },
      { to: 'live',        icon: Radio,           label: 'Live Locations' },
    ]
  },
  {
    label: 'Operations',
    items: [
      { to: 'guards',      icon: Users,           label: 'Guards' },
      { to: 'sites',       icon: MapPin,          label: 'Sites' },
      { to: 'shifts',      icon: Calendar,        label: 'Shifts' },
      { to: 'open-shifts', icon: Briefcase,       label: 'Open Shifts' },
      { to: 'swaps',       icon: ArrowLeftRight,  label: 'Shift Swaps' },
      { to: 'timeclock',   icon: Clock,           label: 'Timeclock' },
    ]
  },
  {
    label: 'Management',
    items: [
      { to: 'incidents',   icon: FileText,        label: 'Incidents' },
      { to: 'payroll',     icon: DollarSign,      label: 'Payroll' },
    ]
  },
  {
    label: 'Admin',
    items: [
      { to: 'announcements', icon: Megaphone,     label: 'Announcements' },
      { to: 'compliance',  icon: ShieldCheck,     label: 'Compliance' },
    ]
  }
];

function NavItem({ item, sosCount, onClick }) {
  const Icon = item.icon;
  const showBadge = item.isSos && sosCount > 0;
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'bg-gray-900 text-white'
            : item.isSos && sosCount > 0
              ? 'text-red-700 bg-red-50 hover:bg-red-100'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`
      }
    >
      <Icon size={18} className={showBadge ? 'animate-pulse' : ''} />
      <span>{item.label}</span>
      {showBadge && (
        <span className="ml-auto min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center animate-pulse">
          {sosCount}
        </span>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [sosBannerDismissed, setSosBannerDismissed] = useState(false);
  const prevSosCount = useRef(0);
  const user = JSON.parse(localStorage.getItem('mgr_user') || '{}');

  // Reset banner dismiss when new alert comes in
  const sosCount = sosAlerts.length;
  useEffect(() => {
    if (sosCount > prevSosCount.current) {
      setSosBannerDismissed(false);
      playAlarm();
    }
    prevSosCount.current = sosCount;
  }, [sosCount]);

  // Global SOS poll — every 4 seconds, always, regardless of which page is open
  const pollSos = useCallback(async () => {
    try {
      const data = await api.sosActive();
      setSosAlerts(data.alerts || []);
    } catch (_) {
      // network error — keep last state
    }
  }, []);

  useEffect(() => {
    pollSos();
    const t = setInterval(pollSos, 4000);
    return () => clearInterval(t);
  }, [pollSos]);

  function logout() {
    localStorage.removeItem('mgr_token');
    localStorage.removeItem('mgr_user');
    navigate('/');
  }

  // Find current page title for breadcrumb
  let currentPageTitle = 'Dashboard';
  for (const group of NAV_GROUPS) {
    const found = group.items.find(item => location.pathname.includes(item.to));
    if (found) { currentPageTitle = found.label; break; }
  }

  const onSosPage = location.pathname.includes('sos');
  const showBanner = sosCount > 0 && !sosBannerDismissed && !onSosPage;

  const sidebar = (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
          <Bird size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-sm leading-tight">Skyhawk</p>
          <p className="text-xs text-gray-500">Manager Portal</p>
        </div>
        <ChevronDown size={14} className="text-gray-400" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {NAV_GROUPS.map((group, i) => (
          <div key={i} className="space-y-1">
            {group.label && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                {group.label}
              </p>
            )}
            {group.items.map(item => (
              <NavItem
                key={item.to}
                item={item}
                sosCount={sosCount}
                onClick={() => setSidebarOpen(false)}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {(user.full_name || 'A')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.full_name || 'Admin'}</p>
            <p className="text-xs text-gray-500 truncate">{user.email || ''}</p>
          </div>
          <button onClick={logout} title="Sign out" className="text-gray-400 hover:text-red-500 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[220px] flex-shrink-0 bg-white border-r border-gray-200 shadow-sm z-10">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 flex flex-col w-64 bg-white shadow-xl">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900">
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

        {/* === GLOBAL SOS EMERGENCY BANNER === */}
        {showBanner && (
          <div className="flex-shrink-0 bg-red-600 text-white px-4 py-3 flex items-center gap-3 z-30 animate-pulse">
            <PhoneCall size={20} className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-bold">
                EMERGENCY — {sosCount} active SOS alert{sosCount > 1 ? 's' : ''}
              </span>
              <span className="text-red-200 text-sm ml-2 hidden sm:inline">
                {sosAlerts.map(a => a.guard_name || a.user_id).filter(Boolean).join(', ')}
              </span>
            </div>
            <button
              onClick={() => { navigate('sos'); setSosBannerDismissed(false); }}
              className="flex-shrink-0 bg-white text-red-700 font-bold text-sm px-4 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              Respond now
            </button>
            <button
              onClick={() => setSosBannerDismissed(true)}
              className="flex-shrink-0 text-red-200 hover:text-white transition-colors"
              title="Dismiss banner (alert still active)"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900">
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-900 rounded flex items-center justify-center">
                <Bird size={14} className="text-white" />
              </div>
              <span className="font-semibold text-gray-900 text-sm">Skyhawk</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sosCount > 0 && (
              <button
                onClick={() => navigate('sos')}
                className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse"
              >
                <AlertTriangle size={12} />
                {sosCount} SOS
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm">
              {(user.full_name || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Desktop Top Header */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Skyhawk</span>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900">{currentPageTitle}</span>
          </div>
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-white border-none rounded-full py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 shadow-sm"
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:px-8 lg:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
