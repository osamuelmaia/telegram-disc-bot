'use client';

import { useState } from 'react';
import { AlertCircle, X, ChevronRight } from 'lucide-react';
import ProfileCompleteModal from './ProfileCompleteModal';

export default function OnboardingBanner() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <>
      <div className="bg-amber-500 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertCircle size={18} className="text-amber-900 shrink-0" />
          <p className="text-amber-900 text-sm font-medium truncate">
            Complete seu cadastro para habilitar saques e funcionalidades completas.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 bg-amber-900 hover:bg-amber-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Completar agora
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-800 hover:text-amber-900 transition-colors p-0.5 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {open && <ProfileCompleteModal onClose={() => setOpen(false)} />}
    </>
  );
}
