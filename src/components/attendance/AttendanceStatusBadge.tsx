import React from 'react';
import { AttendanceStatus } from '../../types';
import { CheckCircle2, Clock, AlertCircle, CalendarX, Coffee, PlayCircle } from 'lucide-react';

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus | 'WORKING' | 'ON_BREAK';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const AttendanceStatusBadge: React.FC<AttendanceStatusBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = true,
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'PRESENT':
        return {
          label: 'Present',
          bg: 'bg-gold-200 text-black border-gold-400 font-bold',
          dot: 'bg-gold-600',
          Icon: CheckCircle2,
        };
      case 'LATE':
        return {
          label: 'Late',
          bg: 'bg-gold-100 text-black border-gold-300 font-semibold',
          dot: 'bg-gold-500',
          Icon: Clock,
        };
      case 'HALF_DAY':
        return {
          label: 'Half Day',
          bg: 'bg-white text-black/80 border-gold-300 font-semibold',
          dot: 'bg-gold-400',
          Icon: AlertCircle,
        };
      case 'ON_LEAVE':
        return {
          label: 'On Leave',
          bg: 'bg-gold-100 text-black border-gold-300 font-medium',
          dot: 'bg-gold-500',
          Icon: CalendarX,
        };
      case 'ABSENT':
        return {
          label: 'Absent',
          bg: 'bg-white text-black/70 border-gold-200 font-medium',
          dot: 'bg-gold-300',
          Icon: AlertCircle,
        };
      case 'WORKING':
        return {
          label: 'Working Now',
          bg: 'bg-gold-300 text-black border-gold-500 font-extrabold animate-pulse',
          dot: 'bg-gold-700',
          Icon: PlayCircle,
        };
      case 'ON_BREAK':
        return {
          label: 'On Break',
          bg: 'bg-gold-100 text-black border-gold-400 font-bold animate-pulse',
          dot: 'bg-gold-600',
          Icon: Coffee,
        };
      default:
        return {
          label: status,
          bg: 'bg-white text-black border-gold-200 font-medium',
          dot: 'bg-gold-400',
          Icon: CheckCircle2,
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.Icon;

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3.5 py-1.5 gap-2 font-semibold',
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md font-medium border ${config.bg} ${sizeClasses[size]} whitespace-nowrap shadow-2xs`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} shrink-0`} />}
      <span>{config.label}</span>
    </span>
  );
};
