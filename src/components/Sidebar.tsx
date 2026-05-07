import React from 'react';
import {
  LayoutDashboard, ClipboardList, Truck, Receipt, PackageSearch,
  BarChart3, Settings, ChevronLeft, ChevronRight, UtensilsCrossed
} from 'lucide-react';
import type { NavPage } from '../types';

interface SidebarProps {
  activeNav?: NavPage;
  onNavigate?: (page: NavPage) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

interface NavItem {
  id: NavPage;
  icon: React.ElementType;
  label: string;
  accent?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'daily-orders', icon: ClipboardList, label: 'PO Harian', accent: 'blue' },
  { id: 'delivery-notes', icon: Truck, label: 'Surat Jalan', accent: 'emerald' },
  { id: 'invoices', icon: Receipt, label: 'Invoice', accent: 'amber' },
  { id: 'catalog', icon: PackageSearch, label: 'Katalog' },
  { id: 'reports', icon: BarChart3, label: 'Laporan' },
  { id: 'settings', icon: Settings, label: 'Pengaturan' },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeNav = 'dashboard', 
  onNavigate = () => {}, 
  collapsed = false, 
  onToggle = () => {} 
}) => {
  return (
    <aside
      className={`${collapsed ? 'w-[72px]' : 'w-64'} bg-[#0d1117]/80 backdrop-blur-xl border-r border-white/6 flex flex-col h-full transition-all duration-300 ease-in-out relative z-50`}
    >
      {/* Logo */}
      <div className={`${collapsed ? 'px-3 py-5' : 'px-5 py-5'} border-b border-white/6 flex items-center gap-3`}>
        <div className="p-2 bg-linear-to-br from-emerald-500/20 to-green-500/20 rounded-xl text-emerald-400 shrink-0">
          <UtensilsCrossed size={collapsed ? 20 : 22} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-black tracking-tight bg-linear-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent truncate">
              ZEN SUPPLIER
            </h1>
            <p className="text-[10px] text-slate-500 font-medium -mt-0.5">Manajemen Supply MBG</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeNav === item.id || (activeNav === 'daily-order-detail' && item.id === 'daily-orders');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group
                ${isActive
                  ? 'bg-white/8 text-white shadow-lg shadow-black/10 border border-white/8'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/4'
                }`}
            >
              <item.icon
                size={20}
                className={`shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-white/6">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/4 transition-colors text-sm"
        >
          {collapsed ? <ChevronRight size={18} /> : (
            <>
              <ChevronLeft size={18} />
              <span className="text-xs font-medium">Kecilkan</span>
            </>
          )}
        </button>

        {/* Status */}
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Offline Mode • SQLite</span>
          </div>
        )}
      </div>
    </aside>
  );
};

