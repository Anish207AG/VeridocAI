import React from 'react';
import { Shield, Bell, User, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  systemHealthy?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ systemHealthy = true }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                VeriDoc <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded border border-blue-500/30 font-semibold tracking-wider">AI</span>
              </span>
              <p className="text-[10px] text-slate-400 leading-none">Intelligent Document Verification</p>
            </div>
          </Link>
        </div>

        {/* Right side: System Status & Reviewer Profile */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Verification Service: <strong className="text-white">Operational</strong></span>
          </div>

          <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
            <div className="w-8 h-8 rounded-full bg-blue-950 border border-blue-700/50 flex items-center justify-center text-blue-300 font-medium text-xs">
              AS
            </div>
            <div className="hidden md:block text-left text-xs leading-tight">
              <div className="font-medium text-slate-200">Ananya Sharma</div>
              <div className="text-[10px] text-slate-400">Senior Compliance Officer</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
