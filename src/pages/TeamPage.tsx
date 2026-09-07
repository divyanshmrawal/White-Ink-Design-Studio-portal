import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User, Project, TeamMemberWorkload, Role } from '../types';
import {
  Users,
  Plus,
  Search,
  Filter,
  Mail,
  Shield,
  FolderKanban,
  CheckSquare,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';

interface TeamPageProps {
  onNavigate?: (path: string) => void;
}

export const TeamPage: React.FC<TeamPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'TEAM_MEMBER';
  const canManage = role === 'SUPER_ADMIN' || role === 'ADMIN';

  const [teamWorkload, setTeamWorkload] = useState<TeamMemberWorkload[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');

  // Add Member Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TEAM_MEMBER' as Role,
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [workloadRes, projectsRes] = await Promise.all([
        api.getTeamMembersWorkload(),
        api.getProjects(),
      ]);
      setTeamWorkload(workloadRes);
      setProjects(projectsRes);
    } catch (err) {
      console.error('Error loading team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      setAddError('All fields are required.');
      return;
    }

    try {
      setAddSubmitting(true);
      setAddError('');
      await api.createUser({
        name: addForm.name.trim(),
        email: addForm.email.trim().toLowerCase(),
        password: addForm.password,
        role: addForm.role,
      });

      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      setAddError(err.message || 'Failed to create user account');
    } finally {
      setAddSubmitting(false);
    }
  };

  const filteredMembers = teamWorkload.filter((m) => {
    const matchesSearch =
      m.user.name.toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRole === 'ALL' || m.user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getAttendanceBadge = (status: string) => {
    switch (status) {
      case 'WORKING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Working
          </span>
        );
      case 'ON_BREAK':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" />
            On Break
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            Not Clocked In
          </span>
        );
    }
  };

  const getRoleBadge = (userRole: Role) => {
    switch (userRole) {
      case 'SUPER_ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ADMIN':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'TEAM_MEMBER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CLIENT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-indigo-600" />
            Team Management & Capacity
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor team members, workload distribution, active assignments, and attendance
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setAddForm({
                name: '',
                email: '',
                password: '',
                role: 'TEAM_MEMBER',
              });
              setAddError('');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Team Member
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="text-xs font-medium py-2 px-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="TEAM_MEMBER">Team Member</option>
          </select>
        </div>
      </div>

      {/* Team Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
          <p className="text-sm font-medium">Loading team members...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">No team members match</h3>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((m) => {
            const isHeavy = m.activeTasksCount >= 5;

            return (
              <div
                key={m.user.id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Profile Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {m.user.profileImage ? (
                        <img
                          src={m.user.profileImage}
                          alt={m.user.name}
                          className="h-11 w-11 rounded-full object-cover border border-gray-200 shadow-xs"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                          {m.user.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{m.user.name}</h3>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="truncate max-w-[150px]">{m.user.email}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getRoleBadge(
                        m.user.role
                      )}`}
                    >
                      {m.user.role.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Attendance Status */}
                  <div className="bg-gray-50 rounded-lg p-2.5 flex items-center justify-between text-xs mb-4">
                    <span className="text-gray-500 font-medium">Today's Status:</span>
                    {getAttendanceBadge(m.todayAttendanceStatus)}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="p-2 bg-gray-50/80 rounded-lg border border-gray-100">
                      <div className="text-base font-bold text-gray-900">{m.assignedProjectCount}</div>
                      <div className="text-[10px] text-gray-500 font-medium">Projects</div>
                    </div>
                    <div className="p-2 bg-gray-50/80 rounded-lg border border-gray-100">
                      <div className="text-base font-bold text-gray-900">{m.totalTasksCount}</div>
                      <div className="text-[10px] text-gray-500 font-medium">Tasks</div>
                    </div>
                    <div className="p-2 bg-blue-50/80 rounded-lg border border-blue-100">
                      <div className="text-base font-bold text-blue-700">{m.activeTasksCount}</div>
                      <div className="text-[10px] text-blue-600 font-medium">In Progress</div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isHeavy
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {isHeavy ? 'High Load' : 'Available Capacity'}
                  </span>

                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate(`/tasks?assignedTo=${m.user.id}`)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    View Tasks <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Add Team Member
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Miller"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="jordan@company.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Role Assignment *
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value as Role })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="TEAM_MEMBER">Team Member (Developer, Designer, QA)</option>
                  <option value="ADMIN">Admin (Project Manager)</option>
                  {role === 'SUPER_ADMIN' && (
                    <option value="SUPER_ADMIN">Super Admin (Full System Access)</option>
                  )}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {addSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
