import React from 'react';
import { AttendanceStats } from '../../types';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  Activity,
} from 'lucide-react';

interface AttendanceOverviewChartProps {
  stats: AttendanceStats | null;
}

export const AttendanceOverviewChart: React.FC<AttendanceOverviewChartProps> = ({ stats }) => {
  if (!stats) return null;

  const total = stats.totalTeamMembers || 1;
  const presentPct = Math.round(((stats.presentToday || 0) / total) * 100);
  const latePct = Math.round(((stats.lateToday || 0) / total) * 100);
  const absentPct = Math.round(((stats.absentToday || 0) / total) * 100);
  const onLeavePct = Math.round(((stats.onLeaveToday || 0) / total) * 100);

  const maxWeeklyAttendance = Math.max(
    ...stats.weeklyTrend.map((w) => w.present + w.onLeave + w.late),
    total,
    1
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Today's Rate & Status Breakdown Card */}
      <div className="bg-white rounded-xl border border-gold-300 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-black flex items-center gap-2">
            <Activity className="h-4 w-4 text-gold-600 stroke-[2.5]" />
            Today's Attendance Rate
          </h3>
          <span className="text-xs text-black font-extrabold px-2.5 py-0.5 rounded-full bg-gold-200 border border-gold-400">
            {presentPct}% Present
          </span>
        </div>

        {/* Progress Bar Breakdown */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-gold-100 rounded-full overflow-hidden flex border border-gold-200">
            <div
              style={{ width: `${presentPct}%` }}
              className="bg-gold-500 h-full transition-all duration-500"
              title={`Present: ${stats.presentToday}`}
            />
            <div
              style={{ width: `${latePct}%` }}
              className="bg-amber-400 h-full transition-all duration-500"
              title={`Late: ${stats.lateToday}`}
            />
            <div
              style={{ width: `${onLeavePct}%` }}
              className="bg-neutral-400 h-full transition-all duration-500"
              title={`On Leave: ${stats.onLeaveToday}`}
            />
            <div
              style={{ width: `${absentPct}%` }}
              className="bg-rose-400 h-full transition-all duration-500"
              title={`Absent: ${stats.absentToday}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gold-50 border border-gold-300">
              <span className="flex items-center gap-1.5 text-black font-bold">
                <span className="w-2 h-2 rounded-full bg-gold-600" /> Present
              </span>
              <span className="font-extrabold text-black">{stats.presentToday}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200">
              <span className="flex items-center gap-1.5 text-amber-900 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Late
              </span>
              <span className="font-extrabold text-amber-950">{stats.lateToday}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-100 border border-neutral-200">
              <span className="flex items-center gap-1.5 text-neutral-800 font-bold">
                <span className="w-2 h-2 rounded-full bg-neutral-500" /> On Leave
              </span>
              <span className="font-extrabold text-black">{stats.onLeaveToday}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50 border border-rose-200">
              <span className="flex items-center gap-1.5 text-rose-900 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Absent
              </span>
              <span className="font-extrabold text-rose-950">{stats.absentToday}</span>
            </div>
          </div>
        </div>

        {/* Avg Working Hours */}
        <div className="p-3 bg-gold-50/60 rounded-lg border border-gold-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gold-700" />
            <span className="text-black/80 font-bold">Avg Effective Working Time:</span>
          </div>
          <span className="font-extrabold text-black">{stats.avgWorkingHours} hrs / day</span>
        </div>
      </div>

      {/* 7-Day Attendance Trend Chart */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gold-300 p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-black flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gold-600 stroke-[2.5]" />
              7-Day Attendance Trend
            </h3>
            <p className="text-xs text-black/70 font-medium mt-0.5">
              Daily turnout across all active team members
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-black">
              <span className="w-2.5 h-2.5 rounded-xs bg-gold-500 border border-gold-600" /> Present
            </span>
            <span className="flex items-center gap-1 text-black">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" /> Late
            </span>
            <span className="flex items-center gap-1 text-black">
              <span className="w-2.5 h-2.5 rounded-xs bg-neutral-400" /> Leave
            </span>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        <div className="pt-4 pb-2">
          <div className="h-40 flex items-end justify-between gap-3 px-2">
            {stats.weeklyTrend.map((item, idx) => {
              const presentHeight = Math.round((item.present / maxWeeklyAttendance) * 100);
              const lateHeight = Math.round((item.late / maxWeeklyAttendance) * 100);
              const leaveHeight = Math.round((item.onLeave / maxWeeklyAttendance) * 100);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 bg-black text-white text-[10px] font-bold px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-gold-500">
                    {item.day} ({item.date}): {item.present} Present, {item.late} Late
                  </div>

                  {/* Bars Stack */}
                  <div className="w-full max-w-8 bg-gold-100/60 rounded-t-md overflow-hidden flex flex-col justify-end h-32 border-b border-gold-400">
                    {leaveHeight > 0 && (
                      <div
                        style={{ height: `${leaveHeight}%` }}
                        className="w-full bg-neutral-400"
                        title={`Leave: ${item.onLeave}`}
                      />
                    )}
                    {lateHeight > 0 && (
                      <div
                        style={{ height: `${lateHeight}%` }}
                        className="w-full bg-amber-400"
                        title={`Late: ${item.late}`}
                      />
                    )}
                    <div
                      style={{ height: `${presentHeight}%` }}
                      className="w-full bg-gold-500 rounded-t-xs border-t border-gold-600"
                      title={`Present: ${item.present}`}
                    />
                  </div>

                  {/* Label */}
                  <div className="text-[11px] font-bold text-black/70 group-hover:text-black">
                    {item.day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer meta */}
        <div className="text-[11px] text-black/60 font-semibold border-t border-gold-200 pt-3 flex items-center justify-between">
          <span>Target Standard: 90%+ daily workforce presence</span>
          <span>Updated automatically</span>
        </div>
      </div>
    </div>
  );
};
