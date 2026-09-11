import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Shield, Mail, CheckCircle2, FolderKanban, CheckSquare, Key, Eye, EyeOff, AlertCircle, Loader2, User } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [assignedProjectsCount, setAssignedProjectsCount] = useState<number>(0);
  const [assignedTasksCount, setAssignedTasksCount] = useState<number>(0);
  const [completedTasksCount, setCompletedTasksCount] = useState<number>(0);

  // Edit Profile Details State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImage || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileImageUrl(user.profileImage || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    if (!profileName.trim()) {
      setProfileError('Name is required.');
      return;
    }
    if (!user?.id) {
      setProfileError('User session not found.');
      return;
    }
    setProfileLoading(true);
    try {
      await api.updateUser(user.id, {
        name: profileName.trim(),
        profileImage: profileImageUrl.trim() || undefined,
      });
      await refreshUser();
      setProfileSuccess('Profile details updated successfully.');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile details.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Voluntary Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setPasswordSuccess(res.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

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
      case 'CLIENT_ADMIN':
        return 'Client administrator portal. Manage your company team members, oversee contracted design projects, review drawings, and approve deliverables.';
      case 'CLIENT':
        return 'External client stakeholder portal. Monitor linked design stages, review drawings and specification packages, and approve project phases.';
      default:
        return 'Standard studio workspace access.';
    }
  };

  const permissionsList = [
    { name: 'View Dashboard & Analytics', allowed: true },
    { name: 'Create & Manage Projects', allowed: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' },
    { name: 'Create & Manage Tasks', allowed: user?.role !== 'CLIENT' && user?.role !== 'CLIENT_ADMIN' },
    { name: 'Update Task Progress & Move Kanban', allowed: user?.role !== 'CLIENT' && user?.role !== 'CLIENT_ADMIN' },
    { name: 'Post Comments in Projects', allowed: true },
    { name: 'Manage Client Accounts', allowed: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' },
    { name: 'Manage User Accounts & Roles', allowed: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'CLIENT_ADMIN' },
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
      {user?.role !== 'CLIENT' && user?.role !== 'CLIENT_ADMIN' && (
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

      {/* Edit Profile Card */}
      <div className="bg-card rounded-xl border border-gold-200 shadow-xs">
        <div className="px-6 py-4 border-b border-gold-200">
          <h2 className="text-sm font-bold text-black flex items-center gap-2">
            <User className="h-4 w-4 text-gold-600 stroke-[2.5]" />
            Edit Profile
          </h2>
          <p className="text-xs text-neutral-600 mt-0.5">
            Update your display name and profile picture
          </p>
        </div>

        <form onSubmit={handleProfileUpdate} className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-2">
            <img
              src={
                profileImageUrl.trim() ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  profileName.trim() || 'User'
                )}`
              }
              alt="Profile Preview"
              className="h-14 w-14 rounded-xl border border-gold-300 object-cover shadow-xs"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  profileName.trim() || 'User'
                )}`;
              }}
            />
            <div className="text-xs text-neutral-600 flex-1">
              <span className="font-semibold text-black block mb-0.5">Avatar Preview</span>
              <span>Displays in the top navigation bar, sidebar, project comments, and team activity.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Alex Vance"
                className="w-full pl-3.5 pr-3.5 py-2 text-sm bg-gold-50/30 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Profile Image URL (optional)
              </label>
              <input
                type="url"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full pl-3.5 pr-3.5 py-2 text-sm bg-gold-50/30 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
          </div>

          {/* Feedback */}
          {profileSuccess && (
            <div className="flex items-center gap-2 p-3 text-sm text-black bg-gold-50 border border-gold-300 font-medium rounded-lg">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-gold-700" />
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="flex items-center gap-2 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {profileError}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={profileLoading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-gold-500 hover:bg-gold-600 text-black border border-gold-600 disabled:opacity-60 shadow-xs cursor-pointer btn-hover-lift"
            >
              {profileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      {user?.role !== 'CLIENT' && user?.role !== 'CLIENT_ADMIN' && (
      <div className="bg-card rounded-xl border border-gold-200 shadow-xs">
        <div className="px-6 py-4 border-b border-gold-200">
          <h2 className="text-sm font-bold text-black flex items-center gap-2">
            <Key className="h-4 w-4 text-gold-600 stroke-[2.5]" />
            Change Password
          </h2>
          <p className="text-xs text-neutral-600 mt-0.5">
            Confirm your current password before setting a new one
          </p>
        </div>

        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-3.5 pr-10 py-2 text-sm bg-gold-50/30 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black p-0.5 cursor-pointer"
                title={showCurrentPassword ? 'Hide password' : 'Show password'}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className="w-full pl-3.5 pr-10 py-2 text-sm bg-gold-50/30 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black p-0.5 cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  className="w-full pl-3.5 pr-10 py-2 text-sm bg-gold-50/30 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black p-0.5 cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {passwordSuccess && (
            <div className="flex items-center gap-2 p-3 text-sm text-black bg-gold-50 border border-gold-300 font-medium rounded-lg">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-gold-700" />
              {passwordSuccess}
            </div>
          )}
          {passwordError && (
            <div className="flex items-center gap-2 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {passwordError}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={passwordLoading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-gold-500 hover:bg-gold-600 text-black border border-gold-600 disabled:opacity-60 shadow-xs cursor-pointer btn-hover-lift"
            >
              {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
};
