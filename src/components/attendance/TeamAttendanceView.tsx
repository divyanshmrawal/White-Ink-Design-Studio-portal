import React, { useState, useEffect } from 'react';
import { Attendance, User } from '../../types';
import { api } from '../../services/api';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import { AttendanceHistoryTable } from './AttendanceHistoryTable';
import {
  Users,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Coffee,
  AlertCircle,
  PlayCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

interface TeamAttendanceViewProps {
  teamMembers: User[];
}

export const TeamAttendanceView: React.FC<TeamAttendanceViewProps> = ({ teamMembers }) => {
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTeamData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTeamAttendance({
        range,
        startDate: range === 'custom' ? startDate : undefined,
        endDate: range === 'custom' ? endDate : undefined,
        employeeId: selectedEmployeeId !== 'ALL' ? selectedEmployeeId : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        search: search.trim() || undefined,
      });
      setRecords(data);
    } catch (err) {
      console.error('Failed to load team attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [range, selectedEmployeeId, selectedStatus, startDate, endDate]);

  // Compute live team glance metrics for Today
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((r) => r.date === todayStr);

  const workingNow = todayRecords.filter((r) => r.isCurrentlyWorking || (r.clockIn && !r.clockOut && !r.activeBreak));
  const onBreakNow = todayRecords.filter((r) => !!r.activeBreak);
  const shiftCompleted = todayRecords.filter((r) => !!r.clockOut);
  const clockedInTotal = todayRecords.filter((r) => !!r.clockIn);

  return (
    <div className="space-y-6">
      {/* Top Live Team Glance (Today) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gold-300 shadow-sm">
          <div className="flex items-center justify-between text-xs text-black/70 font-bold mb-1">
            <span>Currently Working</span>
            <PlayCircle className="h-4 w-4 text-gold-600 animate-pulse stroke-[2.5]" />
          </div>
          <div className="text-2xl font-extrabold text-black">{workingNow.length}</div>
          <div className="text-[11px] text-black/60 font-semibold mt-1">Active on duty right now</div>
        </div>

        <div className="bg-gold-50/60 p-4 rounded-xl border border-gold-300 shadow-sm">
          <div className="flex items-center justify-between text-xs text-black/70 font-bold mb-1">
            <span>On Break</span>
            <Coffee className="h-4 w-4 text-gold-700 stroke-[2.5]" />
          </div>
          <div className="text-2xl font-extrabold text-black">{onBreakNow.length}</div>
          <div className="text-[11px] text-black/60 font-semibold mt-1">Temporary pause</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gold-300 shadow-sm">
          <div className="flex items-center justify-between text-xs text-black/70 font-bold mb-1">
            <span>Completed Shift</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-700 stroke-[2.5]" />
          </div>
          <div className="text-2xl font-extrabold text-black">{shiftCompleted.length}</div>
          <div className="text-[11px] text-black/60 font-semibold mt-1">Clocked out today</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gold-300 shadow-sm">
          <div className="flex items-center justify-between text-xs text-black/70 font-bold mb-1">
            <span>Total Clocked-In</span>
            <Users className="h-4 w-4 text-gold-600 stroke-[2.5]" />
          </div>
          <div className="text-2xl font-extrabold text-black">
            {clockedInTotal.length}{' '}
            <span className="text-xs font-semibold text-black/60">
              / {teamMembers.length} team members
            </span>
          </div>
          <div className="text-[11px] text-black/60 font-semibold mt-1">
            {teamMembers.length - clockedInTotal.length} not yet arrived
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-xl border border-gold-300 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Preset Range Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gold-50/70 border border-gold-200 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setRange('today')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                range === 'today' ? 'bg-gold-500 text-black shadow-xs font-extrabold' : 'text-black/70 hover:text-black'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setRange('week')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                range === 'week' ? 'bg-gold-500 text-black shadow-xs font-extrabold' : 'text-black/70 hover:text-black'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setRange('month')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                range === 'month' ? 'bg-gold-500 text-black shadow-xs font-extrabold' : 'text-black/70 hover:text-black'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setRange('custom')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                range === 'custom' ? 'bg-gold-500 text-black shadow-xs font-extrabold' : 'text-black/70 hover:text-black'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={fetchTeamData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-black bg-gold-100 hover:bg-gold-200 border border-gold-300 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gold-700 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Data</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gold-200 text-xs">
          {/* Employee Filter */}
          <div>
            <label className="block text-[11px] font-bold text-black uppercase mb-1">
              Filter by Employee
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gold-300 bg-white text-black font-medium focus:outline-hidden focus:ring-2 focus:ring-gold-500"
            >
              <option value="ALL">All Team Members ({teamMembers.length})</option>
              {teamMembers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-black uppercase mb-1">
              Status Filter
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gold-300 bg-white text-black font-medium focus:outline-hidden focus:ring-2 focus:ring-gold-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>

          {/* Custom Date Pickers if custom selected */}
          {range === 'custom' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-black uppercase mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gold-300 bg-white text-black font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-black uppercase mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gold-300 bg-white text-black font-medium"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Team Attendance Table */}
      <AttendanceHistoryTable
        records={records}
        isLoading={isLoading}
        showUserColumn={true}
        onFilterChange={(filters) => {
          if (filters.search !== undefined) setSearch(filters.search);
          if (filters.status !== undefined) setSelectedStatus(filters.status);
          if (filters.startDate !== undefined) setStartDate(filters.startDate);
          if (filters.endDate !== undefined) setEndDate(filters.endDate);
        }}
      />
    </div>
  );
};
