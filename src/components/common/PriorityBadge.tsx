import React from 'react';
import { ProjectPriority, TaskPriority } from '../../types';
import { AlertCircle, AlertTriangle, ArrowUp, Minus } from 'lucide-react';

interface PriorityBadgeProps {
  priority: ProjectPriority | TaskPriority | string;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  switch (priority) {
    case 'URGENT':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full border border-gold-600 bg-gold-300 text-black font-extrabold ${sizeClasses} whitespace-nowrap shadow-2xs`}>
          <AlertCircle className="h-3 w-3 text-black shrink-0" />
          Urgent
        </span>
      );
    case 'HIGH':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full border border-gold-400 bg-gold-200 text-black font-bold ${sizeClasses} whitespace-nowrap`}>
          <ArrowUp className="h-3 w-3 text-black shrink-0" />
          High
        </span>
      );
    case 'MEDIUM':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full border border-gold-300 bg-gold-100 text-black font-semibold ${sizeClasses} whitespace-nowrap`}>
          <Minus className="h-3 w-3 text-black shrink-0" />
          Medium
        </span>
      );
    case 'LOW':
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full border border-gold-200 bg-white text-black font-medium ${sizeClasses} whitespace-nowrap`}>
          <Minus className="h-3 w-3 text-gold-600 shrink-0" />
          Low
        </span>
      );
  }
};
