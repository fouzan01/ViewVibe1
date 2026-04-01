import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SidebarLinkProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string | number;
}

export const SidebarLink = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick,
  badge
}: SidebarLinkProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-6 py-4 transition-all duration-300 group relative ${
      active 
        ? 'bg-orange-500/10 text-white border-l-4 border-orange-500' 
        : 'text-slate-500 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
    }`}
  >
    <div className="flex items-center gap-4">
      <Icon size={20} className={`transition-transform duration-300 group-hover:scale-110 ${active ? 'text-orange-500' : ''}`} />
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    </div>
    {badge && (
      <span className="px-2 py-0.5 bg-orange-500 text-white text-[8px] font-black rounded-full">
        {badge}
      </span>
    )}
  </button>
);
