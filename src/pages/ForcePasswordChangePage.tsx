import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { BrandLogo } from '../components/common/BrandLogo';
import { KeyRound, ShieldAlert, Eye, EyeOff, Lock, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';

export const ForcePasswordChangePage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Your new password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.changePassword({ newPassword });
      // Reload user profile so mustChangePassword becomes false
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F4E5] flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-gold-fade-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <BrandLogo className="mx-auto h-auto w-48 max-w-full object-contain mb-4" />
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-200 border border-gold-400 text-black text-xs font-bold mb-3 shadow-2xs">
          <KeyRound className="h-3.5 w-3.5 text-gold-800" />
          First-Time Login Security Setup
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
          Set Permanent Password
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-black/70 font-medium max-w-sm mx-auto">
          Your account was provisioned with an initial generated password. Please create your personal permanent password to proceed to your workspace.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white border-2 border-gold-300 py-8 px-6 shadow-xl rounded-2xl sm:px-10">
          {/* User badge */}
          <div className="mb-5 p-3 bg-gold-50/60 border border-gold-200 rounded-xl flex items-center justify-between text-xs">
            <span className="text-neutral-600 font-medium">Logged in as:</span>
            <span className="font-bold text-black font-mono">{user?.email}</span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 text-xs text-rose-800 bg-rose-50 border border-rose-300 rounded-lg font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                New Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gold-600">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-gold-300 text-black rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-gold-500 focus:border-gold-600"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black p-1 cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                Confirm New Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gold-600">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-gold-300 text-black rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-gold-500 focus:border-gold-600"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black p-1 cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold text-black bg-gold-500 hover:bg-gold-600 transition-all duration-150 shadow-sm border border-gold-600 disabled:opacity-50 cursor-pointer btn-hover-lift"
              >
                {isLoading ? 'Saving Password...' : 'Save Password & Enter Workspace'}
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-gold-200 text-center">
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black font-semibold cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out and return later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
