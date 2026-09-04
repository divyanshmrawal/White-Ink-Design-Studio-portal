import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Client } from '../types';
import { User, Mail, Phone, Building2, Camera, Key, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const ClientSettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  // Profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [clientRecord, setClientRecord] = useState<Client | null>(null);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Load current user data
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setProfileImage(user.profileImage || '');
    }
  }, [user]);

  // Load linked client record for phone/company
  useEffect(() => {
    api.getClients().then((clients) => {
      const own = clients[0] ?? null;
      setClientRecord(own);
      if (own) {
        setPhone(own.phone || '');
        setCompany(own.company || '');
      }
    }).catch(() => {});
  }, []);

  // Profile save handler
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileLoading(true);
    setProfileSuccess(null);
    setProfileError(null);
    try {
      await api.updateUser(user.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        profileImage: profileImage.trim() || undefined,
      });
      if (clientRecord) {
        await api.updateClient(clientRecord.id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          company: company.trim() || clientRecord.company,
        });
      }
      await refreshUser();
      setProfileSuccess('Profile updated successfully.');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Password change handler
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

  const avatarSrc =
    profileImage ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'User')}`;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Account Settings</h1>
        <p className="text-sm text-[#6B7280]">
          Manage your profile details and account security
        </p>
      </div>

      {/* Profile Details Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs">
        <div className="px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-bold text-[#111827] flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-600" />
            Profile Details
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Update your name, contact info, company, and profile picture
          </p>
        </div>

        <form onSubmit={handleProfileSave} className="p-6 space-y-5">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <img
              src={avatarSrc}
              alt={name || 'Profile'}
              className="h-16 w-16 rounded-xl border border-[#E5E7EB] object-cover shadow-xs bg-gray-100"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#374151] flex items-center gap-1.5 mb-1">
                <Camera className="h-3.5 w-3.5 text-[#9CA3AF]" />
                Profile Picture URL
              </p>
              <input
                type="url"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Full Name <span className="text-rose-500">*</span>
                </span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Jonathan Miller"
                className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Email Address <span className="text-rose-500">*</span>
                </span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., jonathan@acme.com"
                className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Phone + Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Phone Number
                </span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., +1 (555) 000-0000"
                className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Company Name
                </span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Acme Corporation"
                className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Feedback */}
          {profileSuccess && (
            <div className="flex items-center gap-2 p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
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
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {profileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs">
        <div className="px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-bold text-[#111827] flex items-center gap-2">
            <Key className="h-4 w-4 text-indigo-600" />
            Change Password
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Confirm your current password before setting a new one
          </p>
        </div>

        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Feedback */}
          {passwordSuccess && (
            <div className="flex items-center gap-2 p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
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
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
