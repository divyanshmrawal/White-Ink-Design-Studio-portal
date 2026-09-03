import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  DashboardStats,
  RecentProject,
  RecentTask,
  TaskStatus,
  Attendance,
  AttendanceStats,
  Milestone,
  ClientApproval,
} from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AttendanceStatusBadge } from '../components/attendance/AttendanceStatusBadge';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Plus,
  RotateCw,
  Play,
  Coffee,
  Flag,
  FileCheck,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
  onOpenNewProject: () => void;
  onOpenClientProject: () => void;
  onOpenNewTask: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenNewProject,
  onOpenClientProject,
  onOpenNewTask,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [upcomingMilestones, setUpcomingMilestones] = useState<Milestone[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ClientApproval[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdminOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isTeamMemberOrAdmin = user?.role !== 'CLIENT';

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const promises: Promise<any>[] = [
        api.getDashboardStats(),
        api.getRecentProjects(),
        api.getRecentTasks(),
        api.getMilestones().catch(() => []),
        api.getApprovals().catch(() => []),
      ];

      if (user?.role !== 'CLIENT') {
        promises.push(api.getTodayAttendance().catch(() => ({ attendance: null })));
        promises.push(api.getAttendanceStats().catch(() => null));
      }

      const results = await Promise.all(promises);
      setStats(results[0]);
      setRecentProjects(results[1]);
      setRecentTasks(results[2]);
      setUpcomingMilestones(results[3].slice(0, 4));
      setPendingApprovals(results[4].filter((a: any) => a.status === 'PENDING').slice(0, 3));

      if (user?.role !== 'CLIENT') {
        setTodayAttendance(results[5]?.attendance || null);
        setAttendanceStats(results[6] || null);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard metrics:', err);
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleQuickTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  if (isLoading && !stats) {
    return <LoadingSpinner message="Calculating workspace analytics..." size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-gold-300 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-black">
              Welcome back, {user?.name.split(' ')[0]}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-gold-100 text-black border border-gold-400">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-black/70 font-medium">
            {user?.role === 'CLIENT'
              ? 'Real-time overview of your contracted projects and deliverable progress'
              : 'Workspace operations, active deliverables, and cross-team project tracking'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadDashboardData}
            className="p-2 text-black hover:bg-gold-100 rounded-lg border border-gold-300 transition-colors cursor-pointer"
            title="Refresh statistics"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {isSuperAdminOrAdmin && (
            <>
              <button
                type="button"
                onClick={onOpenNewTask}
                className="px-3.5 py-2 text-xs font-bold text-black bg-white hover:bg-gold-100 border border-gold-300 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                Add Task
              </button>
              <button
                type="button"
                onClick={onOpenNewProject}
                className="px-4 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 rounded-lg shadow-sm border border-gold-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                New Project
              </button>
            </>
          )}

          {user?.role === 'CLIENT' && (
            <button
              type="button"
              onClick={onOpenClientProject}
              className="px-4 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 rounded-lg shadow-sm border border-gold-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              Create New Project
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-gold-100 border border-gold-400 text-black text-sm flex items-center gap-2 font-medium">
          <AlertCircle className="h-5 w-5 text-gold-700 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Projects */}
          <div className="bg-white p-5 rounded-xl border border-gold-300 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-black mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-black/75">Projects</span>
              <div className="p-2 bg-gold-100 text-black border border-gold-300 rounded-lg">
                <FolderKanban className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-black tracking-tight">
                {stats.totalProjects}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-black/70 font-medium">
                <span className="text-black font-bold">{stats.activeProjects} active</span>
                <span>•</span>
                <span className="text-black/75">{stats.completedProjects} done</span>
              </div>
            </div>
          </div>

          {/* Total Tasks */}
          <div className="bg-white p-5 rounded-xl border border-gold-300 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-black mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-black/75">Total Tasks</span>
              <div className="p-2 bg-gold-100 text-black border border-gold-300 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-black tracking-tight">
                {stats.totalTasks}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-black/70 font-medium">
                <span className="text-black font-bold">{stats.inProgressTasks} in progress</span>
                <span>•</span>
                <span className="text-black/75">{stats.completedTasks} done</span>
              </div>
            </div>
          </div>

          {/* Pending / Review Tasks */}
          <div className="bg-white p-5 rounded-xl border border-gold-300 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-black mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-black/75">Backlog & Review</span>
              <div className="p-2 bg-gold-100 text-black border border-gold-300 rounded-lg">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-black tracking-tight">
                {stats.pendingTasks + stats.reviewTasks}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-black/70 font-medium">
                <span className="text-black font-bold">{stats.pendingTasks} to do</span>
                <span>•</span>
                <span className="text-black/75">{stats.reviewTasks} in review</span>
              </div>
            </div>
          </div>

          {/* Clients or Team Members */}
          <div className="bg-white p-5 rounded-xl border border-gold-300 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-black mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-black/75">
                {user?.role === 'CLIENT' ? 'Avg. Progress' : 'Clients & Team'}
              </span>
              <div className="p-2 bg-gold-100 text-black border border-gold-300 rounded-lg">
                {user?.role === 'CLIENT' ? <TrendingUp className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              </div>
            </div>
            <div>
              {user?.role === 'CLIENT' ? (
                <div>
                  <div className="text-2xl font-extrabold text-black tracking-tight">
                    {stats.averageProjectProgress}%
                  </div>
                  <div className="mt-1">
                    <ProgressBar progress={stats.averageProjectProgress} size="sm" showLabel={false} />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-extrabold text-black tracking-tight">
                    {stats.totalClients} <span className="text-sm font-normal text-black/70">clients</span>
                  </div>
                  <div className="text-xs text-black/70 font-medium mt-1">
                    {stats.totalTeamMembers} active team members
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Quick Punch & Status Bar (Internal Team & Admins) */}
      {isTeamMemberOrAdmin && (
        <div className="bg-gold-50/80 rounded-xl border border-gold-300 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-black text-gold-400 rounded-xl shadow-xs border border-gold-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-black">Today's Attendance</h3>
                {todayAttendance?.status && (
                  <AttendanceStatusBadge status={todayAttendance.status} size="xs" />
                )}
                {todayAttendance?.activeBreak && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold-200 text-black border border-gold-400 animate-pulse">
                    On Break
                  </span>
                )}
              </div>
              <p className="text-xs text-black/70 mt-0.5 font-medium">
                {!todayAttendance?.clockIn
                  ? "You haven't clocked in for today yet."
                  : todayAttendance.clockOut
                  ? `Shift completed with ${Math.round(todayAttendance.effectiveWorkingMinutes / 60)}h ${todayAttendance.effectiveWorkingMinutes % 60}m worked.`
                  : `Clocked in at ${new Date(todayAttendance.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${todayAttendance.breaks?.length || 0} break session(s)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {attendanceStats && (
              <div className="hidden lg:flex items-center gap-4 text-xs text-black font-semibold pr-4 border-r border-gold-300">
                <div>
                  <span className="font-extrabold text-black">{attendanceStats.presentToday}</span> Present
                </div>
                <div>
                  <span className="font-extrabold text-black">{attendanceStats.currentlyWorking}</span> Working
                </div>
                <div>
                  <span className="font-extrabold text-black">{attendanceStats.onBreak}</span> On Break
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => onNavigate('/attendance')}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 rounded-lg shadow-sm border border-gold-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap btn-hover-lift"
            >
              <span>Manage Attendance</span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* Progress & Overview Bento */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall Project Completion Gauge */}
          <div className="bg-white p-6 rounded-xl border border-gold-300 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-black">Project Completion</h3>
                <span className="text-xs font-extrabold text-black">{stats.averageProjectProgress}%</span>
              </div>
              <p className="text-xs text-black/70 font-medium mb-4">
                Average deliverable completion across all active and completed project pipelines
              </p>
              <ProgressBar progress={stats.averageProjectProgress} size="lg" />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-gold-200 text-xs">
              <div className="p-3 bg-gold-50 rounded-lg border border-gold-200">
                <div className="text-black/70 font-medium">Planning</div>
                <div className="text-base font-extrabold text-black">{stats.planningProjects}</div>
              </div>
              <div className="p-3 bg-gold-100 rounded-lg border border-gold-300">
                <div className="text-black font-semibold">Active</div>
                <div className="text-base font-extrabold text-black">{stats.activeProjects}</div>
              </div>
            </div>
          </div>

          {/* Task Status Breakdown */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gold-300 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-black">Task Lifecycle Distribution</h3>
                <p className="text-xs text-black/70 font-medium">Breakdown of current task deliverables</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/kanban')}
                className="text-xs font-bold text-black hover:text-gold-700 flex items-center gap-1 cursor-pointer"
              >
                Open Kanban <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg border border-gold-200 bg-white">
                <div className="text-xs font-bold text-black/75">To Do</div>
                <div className="text-xl font-extrabold text-black mt-1">{stats.pendingTasks}</div>
                <div className="text-[10px] text-black/60 mt-0.5 font-medium">
                  {stats.totalTasks ? Math.round((stats.pendingTasks / stats.totalTasks) * 100) : 0}% of tasks
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-gold-300 bg-gold-50">
                <div className="text-xs font-bold text-black">In Progress</div>
                <div className="text-xl font-extrabold text-black mt-1">{stats.inProgressTasks}</div>
                <div className="text-[10px] text-black/70 mt-0.5 font-medium">
                  {stats.totalTasks ? Math.round((stats.inProgressTasks / stats.totalTasks) * 100) : 0}% of tasks
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-gold-400 bg-gold-100">
                <div className="text-xs font-bold text-black">In Review</div>
                <div className="text-xl font-extrabold text-black mt-1">{stats.reviewTasks}</div>
                <div className="text-[10px] text-black/70 mt-0.5 font-medium">
                  {stats.totalTasks ? Math.round((stats.reviewTasks / stats.totalTasks) * 100) : 0}% of tasks
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-gold-500 bg-gold-200">
                <div className="text-xs font-bold text-black">Completed</div>
                <div className="text-xl font-extrabold text-black mt-1">{stats.completedTasks}</div>
                <div className="text-[10px] text-black/75 mt-0.5 font-medium">
                  {stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% of tasks
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Milestones and Pending Approvals Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approvals Widget */}
        <div className="bg-white rounded-xl border border-gold-300 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between p-4 border-b border-gold-200 bg-gold-50/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gold-100 text-black border border-gold-300 rounded-lg">
                  <FileCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black">
                    {user?.role === 'CLIENT' ? 'Deliverables Awaiting Your Review' : 'Client Approval Requests'}
                  </h3>
                  <p className="text-[11px] text-black/70 font-medium">
                    {pendingApprovals.length} pending client sign-off
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/approvals')}
                className="text-xs font-bold text-black hover:text-gold-700 flex items-center gap-1 cursor-pointer"
              >
                View all <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div className="divide-y divide-gold-100">
              {pendingApprovals.length === 0 ? (
                <div className="p-6 text-center text-xs text-black/60 font-medium">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-gold-600 mb-1" />
                  All deliverables have been reviewed and approved.
                </div>
              ) : (
                pendingApprovals.map((appr) => (
                  <div
                    key={appr.id}
                    onClick={() => onNavigate('/approvals')}
                    className="p-3.5 hover:bg-gold-50/70 cursor-pointer transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-black truncate">{appr.title}</div>
                      <div className="text-[11px] text-black/70 mt-0.5 truncate font-medium">
                        {appr.project?.name} • Submitted {new Date(appr.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold-100 text-black border border-gold-300">
                      Pending Review
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Milestones Widget */}
        <div className="bg-white rounded-xl border border-gold-300 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between p-4 border-b border-gold-200 bg-gold-50/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gold-100 text-black border border-gold-300 rounded-lg">
                  <Flag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black">Key Milestones</h3>
                  <p className="text-[11px] text-black/70 font-medium">Major target dates and completion goals</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/milestones')}
                className="text-xs font-bold text-black hover:text-gold-700 flex items-center gap-1 cursor-pointer"
              >
                View all <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div className="divide-y divide-gold-100">
              {upcomingMilestones.length === 0 ? (
                <div className="p-6 text-center text-xs text-black/60 font-medium">
                  <Flag className="h-6 w-6 mx-auto text-gold-400 mb-1" />
                  No upcoming milestones configured yet.
                </div>
              ) : (
                upcomingMilestones.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onNavigate('/milestones')}
                    className="p-3.5 hover:bg-gold-50/70 cursor-pointer transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-black truncate">{m.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          m.status === 'COMPLETED'
                            ? 'bg-gold-200 text-black border-gold-400'
                            : m.status === 'DELAYED'
                            ? 'bg-white text-black border-gold-400 font-extrabold'
                            : 'bg-gold-100 text-black border-gold-300'
                        }`}
                      >
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-black/70 font-medium">
                      <span className="truncate max-w-[160px]">{m.project?.name}</span>
                      <span>
                        {m.dueDate ? `Target: ${new Date(m.dueDate).toLocaleDateString()}` : 'No date'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects Table & Recent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-white rounded-xl border border-gold-300 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gold-200">
            <div>
              <h3 className="text-sm font-bold text-black">Recent Projects</h3>
              <p className="text-xs text-black/70 font-medium">Track latest status and milestones</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/projects')}
              className="text-xs font-bold text-black hover:text-gold-700 flex items-center gap-1 cursor-pointer"
            >
              View all <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>

          <div className="divide-y divide-gold-200">
            {recentProjects.length === 0 ? (
              <div className="p-8 text-center text-xs text-black/60 font-medium">
                <p>No projects found.</p>
                {user?.role === 'CLIENT' && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={onOpenClientProject}
                      className="px-3.5 py-1.5 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 rounded-lg shadow-2xs border border-gold-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      Create New Project
                    </button>
                  </div>
                )}
              </div>
            ) : (
              recentProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => onNavigate(`/projects/${project.id}`)}
                  className="p-4 hover:bg-gold-50/70 cursor-pointer transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-black hover:text-gold-700 transition-colors truncate">
                        {project.name}
                      </h4>
                      <p className="text-xs text-black/70 flex items-center gap-1.5 mt-0.5 font-medium">
                        <Building2 className="h-3 w-3 text-gold-600" />
                        {project.clientName}
                      </p>
                    </div>
                    <StatusBadge status={project.status} size="sm" />
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="w-44">
                      <ProgressBar progress={project.progress} size="sm" />
                    </div>
                    <div className="text-[11px] text-black/60 font-medium shrink-0">
                      {project.dueDate ? `Due ${new Date(project.dueDate).toLocaleDateString()}` : 'No deadline'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-gold-300 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gold-200">
            <div>
              <h3 className="text-sm font-bold text-black">Recent Tasks</h3>
              <p className="text-xs text-black/70 font-medium">Active tasks and assigned deliverables</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/tasks')}
              className="text-xs font-bold text-black hover:text-gold-700 flex items-center gap-1 cursor-pointer"
            >
              View all <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>

          <div className="divide-y divide-gold-200">
            {recentTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-black/60 font-medium">No tasks found.</div>
            ) : (
              recentTasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-gold-50/70 transition-colors flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <PriorityBadge priority={task.priority} size="sm" />
                      <span className="text-xs text-black/70 font-medium truncate">
                        {task.projectName}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-black truncate">{task.title}</p>
                    {task.assignedTo && (
                      <p className="text-[11px] text-black/70 mt-1 flex items-center gap-1 font-medium">
                        Assigned to: <span className="font-bold text-black">{task.assignedTo.name}</span>
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {user?.role !== 'CLIENT' ? (
                      <select
                        value={task.status}
                        onChange={(e) => handleQuickTaskStatus(task.id, e.target.value as TaskStatus)}
                        className="text-xs py-1 px-2.5 border border-gold-300 rounded-lg bg-white font-bold text-black focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="REVIEW">Review</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    ) : (
                      <StatusBadge status={task.status} size="sm" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

};
