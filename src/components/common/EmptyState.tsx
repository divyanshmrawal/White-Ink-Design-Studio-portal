import React from 'react';
import { FolderKanban, LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = FolderKanban,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed border-gold-300 rounded-xl bg-white shadow-xs">
      <div className="p-3.5 bg-gold-100 border border-gold-300 rounded-xl text-gold-700 mb-4 shadow-2xs">
        <Icon className="h-7 w-7 text-gold-700" />
      </div>
      <h3 className="text-base font-bold text-black mb-1">{title}</h3>
      <p className="text-sm text-black/70 max-w-sm mb-5 leading-relaxed font-normal">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black text-sm font-bold rounded-lg shadow-sm border border-gold-600 transition-all duration-150 cursor-pointer btn-hover-lift"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

