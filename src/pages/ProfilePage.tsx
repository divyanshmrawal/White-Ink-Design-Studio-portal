import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Shield, Mail, CheckCircle2, FolderKanban, CheckSquare } from 'lucide-react';

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
        return 'Full unrestricted administrative privileges across the entire studio platform, team authorization management, project pipelines, client portals, and system settings.';
      case 'ADMIN':
        return 'Studio manager permissions allowing project initiation, task delegation, client collaboration, and milestone sign-offs.';
      case 'TEAM_MEMBER':
        return 'Architectural and interior design studio access. View assigned projects, track tasks, update deliverables, and log attendance.';
      case 'CLIENT':
        return 'External client stakeholder portal. Monitor linked design stages, review drawings and specification packages, and approve project phases.';
      default:
        return 'Standard studio workspace access.';
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
        <h1 className="section-heading text-heading">User Profile</h1>
        <p className="muted mt-1">
          Account credentials, studio role permissions, and active workspace deliverables
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-card rounded-xl border border-gold-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <img
            src={
              user?.profileImage ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                user?.name || 'User'
              )}`
            }
            alt={user?.name}
            className="h-16 w-16 rounded-xl border border-gold-300 object-cover shadow-xs"
          />

          <div className="text-center sm:text-left space-y-1 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl font-bold text-heading">{user?.name}</h2>
              <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-gold-200 text-black border border-gold-400">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
            <p className="muted flex items-center justify-center sm:justify-start gap-1.5 pt-1 text-xs">
              <Mail className="h-3.5 w-3.5 text-gold-700" />
              {user?.email}
            </p>
            <p className="text-xs text-gold-900/80 pt-2 leading-relaxed max-w-xl">
              {getRoleDescription()}
            </p>
          </div>
        </div>

        {/* User Workspace Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gold-200">
          <div className="bg-gold-50/60 p-4 rounded-xl border border-gold-200 flex items-center gap-3">
            <div className="p-2.5 bg-gold-200 text-black border border-gold-300 rounded-lg">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-heading">{assignedProjectsCount}</div>
              <div className="text-xs text-gold-800">Accessible Projects</div>
            </div>
          </div>

          <div className="bg-gold-50/60 p-4 rounded-xl border border-gold-200 flex items-center gap-3">
            <div className="p-2.5 bg-gold-100 text-gold-800 border border-gold-300 rounded-lg">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-heading">{assignedTasksCount}</div>
              <div className="text-xs text-gold-800">Assigned Tasks</div>
            </div>
          </div>

          <div className="bg-gold-50/60 p-4 rounded-xl border border-gold-200 flex items-center gap-3">
            <div className="p-2.5 bg-gold-200 text-black border border-gold-300 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-gold-800" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-heading">{completedTasksCount}</div>
              <div className="text-xs text-gold-800">Completed Tasks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Permissions Matrix */}
      {user?.role !== 'CLIENT' && (
        <div className="bg-card rounded-xl border border-gold-200 shadow-xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-heading flex items-center gap-2">
            <Shield className="h-4 w-4 text-gold-600" />
            Role Permissions Matrix
          </h3>

          <div className="divide-y divide-gold-100">
            {permissionsList.map((perm) => (
              <div
                key={perm.name}
                className="py-3 flex items-center justify-between text-xs text-heading font-medium"
              >
                <span>{perm.name}</span>
                {perm.allowed ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-gold-200 text-black font-bold border border-gold-400">
                    Granted
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-gold-50 text-gold-700/60 font-medium border border-gold-200">
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
