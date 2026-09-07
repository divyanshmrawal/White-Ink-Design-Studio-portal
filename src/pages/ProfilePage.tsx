import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Shield, Mail, CheckCircle2, FolderKanban, CheckSquare, Key } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [assignedProjectsCount, setAssignedProjectsCount] = useState<number>(0);
  const [assignedTasksCount, setAssignedTasksCount] = useState<number>(0);
  const [completedTasksCount, setCompletedTasksCount] = useState<number>(0);

  useEffect(() => {
    async function loadUserStats() {
      try {
        const [projects, tasks] = await Promise.all([
          api.getProjects(),
          api.getTasks(),
        ]);
        setAssignedProjectsCount(projects.length);
        const myTasks = tasks.filter((t) => t.assignedToId === user?.id);
        setAssignedTasksCount(myTasks.length);
        setCompletedTasksCount(myTasks.filter((t) => t.status === 'COMPLETED').length);
      } catch (err) {
        console.error('Failed to load user stats:', err);
      }
    }
    if (user) {
      loadUserStats();
    }
  }, [user]);

  const getRoleDescription = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return 'Full unrestricted administrative privileges across the entire database, user authorization management, projects, clients, and system configurations.';
      case 'ADMIN':
        return 'Project manager permissions allowing project creation, task management, client management, and team assignment.';
      case 'TEAM_MEMBER':
        return 'Internal engineering and design access. Can view assigned projects, create and update tasks, log progress, and participate in discussion threads.';
      case 'CLIENT':
        return 'External stakeholder visibility. Allows monitoring linked project progress, reviewing active deliverables, and posting feedback.';
      default:
        return 'Standard system access.';
    }
  };

  const permissionsList = [
    { name: 'View Dashboard & Analytics', allowed: true },
    { name: 'Create & Manage Projects', allowed: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' },
    { name: 'Create & Manage Tasks', allowed: user?.role !== 'CLIENT' },
    { name: 'Update Task Progress & Move Kanban', allowed: user?.role !== 'CLIENT' },
    { name: 'Post Comments in Projects', allowed: true },
    { name: 'Manage Client Accounts', allowed: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' },
    { name: 'Manage User Accounts & Roles', allowed: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">User Profile</h1>
        <p className="text-sm text-[#6B7280]">
          Account credentials, role permissions, and active workspace deliverables
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <img
            src={
              user?.profileImage ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                user?.name || 'User'
              )}`
            }
            alt={user?.name}
            className="h-16 w-16 rounded-xl border border-[#E5E7EB] object-cover shadow-xs"
          />

          <div className="text-center sm:text-left space-y-1 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl font-bold text-[#111827]">{user?.name}</h2>
              <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] flex items-center justify-center sm:justify-start gap-1.5 pt-1">
              <Mail className="h-3.5 w-3.5 text-[#9CA3AF]" />
              {user?.email}
            </p>
            <p className="text-xs text-[#4B5563] pt-2 leading-relaxed max-w-xl">
              {getRoleDescription()}
            </p>
          </div>
        </div>

        {/* User Workspace Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E5E7EB]">
          <div className="bg-gray-50 p-4 rounded-xl border border-[#E5E7EB] flex items-center gap-3">
            <div className="p-2 bg-indigo-100/70 text-indigo-700 rounded-lg">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-[#111827]">{assignedProjectsCount}</div>
              <div className="text-xs text-[#6B7280]">Accessible Projects</div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-[#E5E7EB] flex items-center gap-3">
            <div className="p-2 bg-sky-100/70 text-sky-700 rounded-lg">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-[#111827]">{assignedTasksCount}</div>
              <div className="text-xs text-[#6B7280]">Assigned Tasks</div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-[#E5E7EB] flex items-center gap-3">
            <div className="p-2 bg-emerald-100/70 text-emerald-700 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-[#111827]">{completedTasksCount}</div>
              <div className="text-xs text-[#6B7280]">Completed Tasks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Permissions Matrix */}
      {user?.role !== 'CLIENT' && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-600" />
            Role Permissions Matrix
          </h3>

          <div className="divide-y divide-[#E5E7EB]">
            {permissionsList.map((perm) => (
              <div
                key={perm.name}
                className="py-3 flex items-center justify-between text-xs text-[#374151]"
              >
                <span>{perm.name}</span>
                {perm.allowed ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Granted
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[#9CA3AF] font-medium border border-gray-200">
                    Restricted
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
