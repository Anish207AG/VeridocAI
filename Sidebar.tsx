import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck2,
  FolderPlus,
  Inbox,
  Scale,
  History,
  FileText,
  ShieldCheck,
  ShieldAlert,
  GitFork
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/applications', label: 'Applications', icon: FileCheck2 },
    { to: '/applications/new', label: 'Create Application', icon: FolderPlus },
    { to: '/review-queue', label: 'Manual Review Queue', icon: Inbox },
    { to: '/rules', label: 'Compliance Rules', icon: Scale },
    { to: '/audit', label: 'Audit Trail', icon: History },
    { to: '/reports', label: 'Reports Center', icon: FileText },
    { to: '/verification-centre', label: 'Verification Centre', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Platform Navigation
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Audit & Security Status Widget in Sidebar footer */}
      <div className="mt-auto p-4 border-t border-slate-800">
        <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60">
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Cryptographic Audit Ledger</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Tamper-evident verification active.
          </p>
        </div>
      </div>
    </aside>
  );
};
