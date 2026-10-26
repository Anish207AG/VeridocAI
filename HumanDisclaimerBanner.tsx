import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export const HumanDisclaimerBanner: React.FC = () => {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between shadow-xs">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          <strong>Preliminary Verification Assistance Notice:</strong> VeriDoc AI automates cross-document checks to flag potential inconsistencies for qualified review. Automated evaluations assist human discretion and do <em>not</em> constitute a final regulatory decision or conclusive proof of fraud.
        </span>
      </div>
      <div className="hidden md:flex items-center space-x-1.5 text-amber-800 font-medium pl-4 flex-shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Human-in-the-Loop Mode Active</span>
      </div>
    </div>
  );
};
