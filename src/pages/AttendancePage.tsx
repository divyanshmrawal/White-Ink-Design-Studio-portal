import React, { useState, useEffect } from 'react';
import { User, Attendance, AttendanceStats } from '../types';
import { api } from '../services/api';
import { ClockActionCard } from '../components/attendance/ClockActionCard';
import { AttendanceHistoryTable } from '../components/attendance/AttendanceHistoryTable';
import { TeamAttendanceView } from '../components/attendance/TeamAttendanceView';
import { AttendanceOverviewChart } from '../components/attendance/AttendanceOverviewChart';
import {
  Clock,
  Calendar,
  Users,
  TrendingUp,
  History,
  CheckCircle2,
  AlertCircle,
  Coffee,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

interface AttendancePageProps {
  currentUser: User | null;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'punch' | 'history' | 'team' | 'analytics'>('punch');
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [historyRecords, setHistoryRecords] = useState<Attendance[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdminOrSuperAdmin =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';
  const isClient = currentUser?.role === 'CLIENT' || currentUser?.role === 'CLIENT_ADMIN';

  const fetchAttendanceData = async () => {
    if (isClient) return;
    setIsLoading(true);
    try {
      // Fetch today's record
      const todayRes = await api.getTodayAttendance();
      setTodayAttendance(todayRes.attendance);

      // Fetch personal history
      const historyRes = await api.getAttendanceHistory();
      setHistoryRecords(historyRes);

      // Fetch stats
      const statsRes = await api.getAttendanceStats();
      setStats(statsRes);

      // If admin, fetch users for team filter
      if (isAdminOrSuperAdmin) {
        const users = await api.getUsers();
        setTeamMembers(users.filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN'));
      }
    } catch (err) {
      console.error('Failed to load attendance data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [currentUser]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAttendanceData();
  };

  if (isClient) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-[#111827]">Internal Staff Portal</h2>
        <p className="text-sm text-[#4B5563]">
          Attendance and work-hour tracking is restricted to internal team members and administrators. As a client, you can view project milestones, deliverables, and tasks in the Projects section.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-gold-600 stroke-[2.5]" />
            Attendance Management
          </h1>
          <p className="text-xs text-black/70 font-medium mt-0.5">
            Track daily work hours, break sessions, and team presence in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-black bg-white border border-gold-300 rounded-lg hover:bg-gold-100 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gold-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gold-300 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('punch')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'punch'
              ? 'border-gold-600 text-black bg-gold-100/50 rounded-t-lg'
              : 'border-transparent text-black/60 hover:text-black'
          }`}
        >
          <Clock className="h-4 w-4 text-gold-600" />
          <span>Clock In / Out</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'history'
              ? 'border-gold-600 text-black bg-gold-100/50 rounded-t-lg'
              : 'border-transparent text-black/60 hover:text-black'
          }`}
        >
          <History className="h-4 w-4 text-gold-600" />
          <span>My History</span>
        </button>

        {isAdminOrSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'team'
                ? 'border-gold-600 text-black bg-gold-100/50 rounded-t-lg'
                : 'border-transparent text-black/60 hover:text-black'
            }`}
          >
            <Users className="h-4 w-4 text-gold-600" />
            <span>Team Attendance</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gold-200 text-black font-extrabold border border-gold-300">
              Admin
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-gold-600 text-black bg-gold-100/50 rounded-t-lg'
              : 'border-transparent text-black/60 hover:text-black'
          }`}
        >
          <TrendingUp className="h-4 w-4 text-gold-600" />
          <span>Analytics & Trends</span>
        </button>
      </div>

      {/* TAB CONTENT: CLOCK IN / OVERVIEW */}
      {activeTab === 'punch' && (
        <div className="space-y-6">
          <ClockActionCard
            attendance={todayAttendance}
            onAttendanceChange={fetchAttendanceData}
          />

          {/* Analytics Snapshot Strip */}
          <AttendanceOverviewChart stats={stats} />

          {/* Quick Recent Activity preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-black">Your Recent Attendance Records</h3>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="text-xs font-bold text-black hover:text-gold-700 cursor-pointer underline"
              >
                View Full History
              </button>
            </div>
            <AttendanceHistoryTable
              records={historyRecords.slice(0, 5)}
              isLoading={isLoading}
              showUserColumn={false}
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT: MY HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-black">Personal Attendance Logs</h2>
              <p className="text-xs text-black/70 font-medium">
                Review all your previous punch-in timestamps, working durations, and break history.
              </p>
            </div>
          </div>
          <AttendanceHistoryTable
            records={historyRecords}
            isLoading={isLoading}
            showUserColumn={false}
            onFilterChange={async (filters) => {
              setIsLoading(true);
              try {
                const filtered = await api.getAttendanceHistory(filters);
                setHistoryRecords(filtered);
              } catch (e) {
                console.error(e);
              } finally {
                setIsLoading(false);
              }
            }}
          />
        </div>
      )}

      {/* TAB CONTENT: TEAM ATTENDANCE (ADMIN) */}
      {activeTab === 'team' && isAdminOrSuperAdmin && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-black">Workforce Attendance Oversight</h2>
            <p className="text-xs text-black/70 font-medium">
              Monitor team presence, identify absences, review break durations, and audit shifts.
            </p>
          </div>
          <TeamAttendanceView teamMembers={teamMembers} />
        </div>
      )}

      {/* TAB CONTENT: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <AttendanceOverviewChart stats={stats} />
          {isAdminOrSuperAdmin && (
            <TeamAttendanceView teamMembers={teamMembers} />
          )}
        </div>
      )}
    </div>
  );
};
