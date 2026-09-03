import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ReportsOverview, TeamMemberWorkload } from '../types';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  CheckSquare,
  Flag,
  FileCheck,
  Users,
  RefreshCw,
  Award,
  FileSpreadsheet,
  FileText,
  Download,
} from 'lucide-react';

interface ReportsPageProps {
  onNavigate?: (path: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'TEAM_MEMBER';
  const isClient = role === 'CLIENT';

  const [reports, setReports] = useState<ReportsOverview | null>(null);
  const [teamWorkload, setTeamWorkload] = useState<TeamMemberWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsData, workloadData] = await Promise.all([
        api.getReportsOverview(),
        !isClient ? api.getTeamWorkload() : Promise.resolve([]),
      ]);
      setReports(reportsData);
      setTeamWorkload(workloadData);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      setExportError(null);
      const blob = await api.exportReportsCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planforge-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting CSV:', err);
      setExportError(err.message || 'Failed to export CSV report');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      setExportError(null);
      const blob = await api.exportReportsPdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planforge-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      setExportError(err.message || 'Failed to export PDF report');
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
        <p className="text-sm font-medium">Generating performance and analytics reports...</p>
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-800">Unable to load report data</p>
        <button
          type="button"
          onClick={loadData}
          className="mt-3 px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  const projects = (reports as any).projects || (reports as any).projectMetrics || {
    total: 0,
    active: 0,
    inProgress: 0,
    completed: 0,
    onHold: 0,
    planning: 0,
    averageProgress: 0,
  };
  const tasks = (reports as any).tasks || (reports as any).taskMetrics || {
    total: 0,
    todo: 0,
    inProgress: 0,
    review: 0,
    completed: 0,
    overdue: 0,
  };
  const milestones = (reports as any).milestones || (reports as any).milestoneMetrics || {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  };
  const approvals = (reports as any).approvals || (reports as any).approvalMetrics || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  const attendance = (reports as any).attendance || (reports as any).attendanceSummary || {
    presentToday: 0,
    activeOnBreak: 0,
    totalTrackedHours: 0,
  };

  const projectCompletionRate =
    projects.total > 0 ? Math.round(((projects.completed || 0) / projects.total) * 100) : 0;
  const taskCompletionRate =
    tasks.total > 0 ? Math.round(((tasks.completed || 0) / tasks.total) * 100) : 0;
  const milestoneCompletionRate =
    milestones.total > 0 ? Math.round(((milestones.completed || 0) / milestones.total) * 100) : 0;
  const approvalRate =
    approvals.total > 0 ? Math.round(((approvals.approved || 0) / approvals.total) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            Executive Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time delivery progress, milestone health, client approvals, and team capacity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {exportingCsv ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {exportingPdf ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            Export PDF
          </button>

          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Metrics
          </button>
        </div>
      </div>

      {exportError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between">
          <span>{exportError}</span>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="text-red-500 hover:text-red-700 font-semibold ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top 4 Metric Ratio Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Project Rate */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Project Delivery
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{projectCompletionRate}%</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {projects.completed} of {projects.total} projects completed
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all"
                style={{ width: `${projectCompletionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Task Velocity */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Task Velocity
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{taskCompletionRate}%</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {tasks.completed} of {tasks.total} tasks resolved
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${taskCompletionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Milestone Rate */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Milestone Sign-Off
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Flag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{milestoneCompletionRate}%</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {milestones.completed} of {milestones.total} milestones achieved
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{ width: `${milestoneCompletionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Deliverables Approval */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Client Acceptance
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{approvalRate}%</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {approvals.approved} approved ({approvals.pending} awaiting review)
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-amber-600 h-full rounded-full transition-all"
                style={{ width: `${approvalRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Pipeline Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-indigo-600" />
              Project Pipeline Breakdown
            </h3>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {projects.total} Total
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-medium text-gray-700 mb-1">
                <span>In Progress / Active</span>
                <span className="font-bold">{projects.inProgress}</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full"
                  style={{
                    width: `${projects.total ? (projects.inProgress / projects.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium text-gray-700 mb-1">
                <span>Planning & Scoping</span>
                <span className="font-bold">{projects.planning}</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full"
                  style={{
                    width: `${projects.total ? (projects.planning / projects.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium text-gray-700 mb-1">
                <span>Completed</span>
                <span className="font-bold">{projects.completed}</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full"
                  style={{
                    width: `${projects.total ? (projects.completed / projects.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium text-gray-700 mb-1">
                <span>On Hold / Delayed</span>
                <span className="font-bold">{projects.onHold}</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full"
                  style={{
                    width: `${projects.total ? (projects.onHold / projects.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Task Velocity Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-emerald-600" />
              Task Execution Status
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {tasks.total} Tasks
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-xl font-bold text-gray-800">{tasks.todo}</div>
              <div className="text-[11px] text-gray-500 font-medium mt-0.5">To Do Backlog</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="text-xl font-bold text-blue-700">{tasks.inProgress}</div>
              <div className="text-[11px] text-blue-600 font-medium mt-0.5">In Development</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
              <div className="text-xl font-bold text-purple-700">{tasks.review}</div>
              <div className="text-[11px] text-purple-600 font-medium mt-0.5">In Code Review</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-xl font-bold text-emerald-700">{tasks.completed}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Resolved & Closed</div>
            </div>
          </div>

          {tasks.overdue > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{tasks.overdue} tasks are currently past their due date</span>
            </div>
          )}
        </div>
      </div>

      {/* Attendance & Team Workload Section (For Non-Clients) */}
      {!isClient && (
        <div className="space-y-6">
          {/* Attendance KPI banner */}
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-xl p-5 text-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                Attendance & Working Time
              </div>
              <div className="text-lg font-bold">
                {attendance.presentToday} Team Members Present Today
              </div>
              <p className="text-xs text-indigo-200">
                {attendance.activeOnBreak} on active break • {attendance.totalTrackedHours} total tracked hours across all shifts
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('/attendance')}
              className="px-4 py-2 bg-white text-indigo-900 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors shrink-0"
            >
              Open Attendance Center →
            </button>
          </div>

          {/* Team Workload Matrix */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                Team Member Workload & Capacity
              </h3>
              <span className="text-xs text-gray-400">Task distribution balance</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 bg-gray-50/50">
                    <th className="py-2.5 px-3 font-semibold">Team Member</th>
                    <th className="py-2.5 px-3 font-semibold">Role</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Active Projects</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Assigned Tasks</th>
                    <th className="py-2.5 px-3 font-semibold text-center">In Progress</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Workload Index</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teamWorkload.map((m) => {
                    const workloadScore = m.activeTasksCount * 2 + m.inProgressTasksCount * 3;
                    const isHeavy = workloadScore > 10;

                    return (
                      <tr key={m.user.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            {m.user.profileImage ? (
                              <img
                                src={m.user.profileImage}
                                alt={m.user.name}
                                className="h-7 w-7 rounded-full object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                                {m.user.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-gray-900">{m.user.name}</div>
                              <div className="text-[11px] text-gray-400">{m.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-medium text-[10px]">
                            {m.user.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-gray-800">
                          {m.activeProjectsCount}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-gray-800">
                          {m.assignedTasksCount}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-blue-600">
                          {m.inProgressTasksCount}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              isHeavy
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isHeavy ? 'High Load' : 'Balanced'} ({m.activeTasksCount} active)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              m.todayAttendanceStatus === 'WORKING'
                                ? 'bg-emerald-50 text-emerald-700'
                                : m.todayAttendanceStatus === 'ON_BREAK'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {m.todayAttendanceStatus.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
