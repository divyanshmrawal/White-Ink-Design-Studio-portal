import React from 'react';
import { ProjectStatus, TaskStatus } from '../../types';

interface StatusBadgeProps {
  status: ProjectStatus | TaskStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  const configMap: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    // Project statuses
    PENDING: {
      bg: 'bg-gold-100 border-gold-400',
      text: 'text-gold-900 font-bold',
      dot: 'bg-gold-600 animate-pulse',
      label: 'Pending Setup',
    },
    PLANNING: {
      bg: 'bg-gold-100 border-gold-300',
      text: 'text-black font-semibold',
      dot: 'bg-gold-500',
      label: 'Planning',
    },
    ACTIVE: {
      bg: 'bg-gold-200 border-gold-400',
      text: 'text-black font-bold',
      dot: 'bg-gold-600',
      label: 'Active',
    },
    ON_HOLD: {
      bg: 'bg-white border-gold-300',
      text: 'text-black/80 font-medium',
      dot: 'bg-gold-400',
      label: 'On Hold',
    },
    COMPLETED: {
      bg: 'bg-gold-300 border-gold-500',
      text: 'text-black font-bold',
      dot: 'bg-gold-700',
      label: 'Completed',
    },
    CANCELLED: {
      bg: 'bg-white border-gold-200',
      text: 'text-black/60 font-medium',
      dot: 'bg-gold-300',
      label: 'Cancelled',
    },
    // Task statuses
    TODO: {
      bg: 'bg-white border-gold-300',
      text: 'text-black/80 font-medium',
      dot: 'bg-gold-400',
      label: 'To Do',
    },
    IN_PROGRESS: {
      bg: 'bg-gold-200 border-gold-400',
      text: 'text-black font-bold',
      dot: 'bg-gold-600',
      label: 'In Progress',
    },
    REVIEW: {
      bg: 'bg-gold-100 border-gold-400',
      text: 'text-black font-semibold',
      dot: 'bg-gold-500',
      label: 'In Review',
    },
  };

  const current = configMap[status] || {
    bg: 'bg-white border-gold-300',
    text: 'text-black font-medium',
    dot: 'bg-gold-400',
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${current.bg} ${current.text} ${sizeClasses} whitespace-nowrap font-medium transition-colors`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
};
