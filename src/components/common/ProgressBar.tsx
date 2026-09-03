import React from 'react';

interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  colorScheme?: 'indigo' | 'emerald' | 'amber' | 'dynamic';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  showLabel = true,
  colorScheme = 'dynamic',
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress || 0));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  const getColorClass = () => {
    if (colorScheme === 'emerald') return 'bg-gold-600';
    if (colorScheme === 'amber') return 'bg-gold-500';
    if (colorScheme === 'indigo') return 'bg-gold-500';

    // Dynamic based on completion percentage
    if (clampedProgress >= 100) return 'bg-gold-600';
    if (clampedProgress >= 60) return 'bg-gold-500';
    if (clampedProgress >= 25) return 'bg-gold-400';
    return 'bg-gold-300';
  };

  return (
    <div className="w-full flex items-center gap-2.5">
      <div className={`w-full bg-gold-100 rounded-full overflow-hidden ${heightClasses} border border-gold-300`}>
        <div
          className={`${heightClasses} rounded-full transition-all duration-500 ease-out ${getColorClass()}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-bold text-black min-w-[2.5rem] text-right">
          {clampedProgress}%
        </span>
      )}
    </div>
  );
};
