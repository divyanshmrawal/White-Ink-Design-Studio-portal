import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Menu, ChevronDown, RotateCcw } from 'lucide-react';
import { api } from '../../services/api';
import { NotificationDropdown } from './NotificationDropdown';
import { BrandLogo } from '../common/BrandLogo';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNavigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onNavigate }) => {
  const { user, logout, quickSwitchAccount, refreshUser } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const demoAccounts = [
    { email: 'alex@planforge.io', password: 'Admin@123', role: 'SUPER_ADMIN', label: 'Alex Vance (Super Admin)' },
    { email: 'sarah@planforge.io', password: 'Admin@123', role: 'ADMIN', label: 'Sarah Connor (Admin)' },
    { email: 'david@planforge.io', password: 'User@123', role: 'TEAM_MEMBER', label: 'David Kim (Dev)' },
    { email: 'elena@planforge.io', password: 'User@123', role: 'TEAM_MEMBER', label: 'Elena Rostova (Designer)' },
    { email: 'jonathan@acmecorp.com', password: 'Client@123', role: 'CLIENT', label: 'Jonathan Sterling (Client)' },
  ];

  const handleResetData = async () => {
    if (!window.confirm('Reset all demo data back to initial seed state?')) return;
    setIsResetting(true);
    try {
      await api.resetDemoDatabase();
      await refreshUser();
      window.location.reload();
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const roleBadgeMap: Record<string, string> = {
    SUPER_ADMIN: 'bg-gold-200 text-black border-gold-400 font-semibold',
    ADMIN: 'bg-gold-100 text-black border-gold-300 font-semibold',
    TEAM_MEMBER: 'bg-white text-black border-gold-300 font-medium',
    CLIENT: 'bg-gold-50 text-black border-gold-300 font-medium',
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 border-b border-gold-600 shadow-sm transition-colors duration-200">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-black hover:bg-gold-600/20 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <BrandLogo className="h-12 w-auto max-w-[10rem] object-contain" />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Quick Demo Role Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-black bg-white hover:bg-gold-50 rounded-lg border border-gold-600/40 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer"
            title="Quick switch demo user role"
          >
            <span className="hidden sm:inline text-black/70 font-normal">Role:</span>
            <span className="font-bold text-black">{user?.role?.replace('_', ' ')}</span>
            <ChevronDown className="h-3.5 w-3.5 text-black" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border-2 border-gold-300 py-1.5 z-50 animate-gold-fade-in">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-black bg-gold-50 border-b border-gold-200">
                Switch Demo User
              </div>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    quickSwitchAccount(acc.email, acc.password);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gold-100/60 transition-colors duration-150 cursor-pointer ${
                    user?.email === acc.email ? 'bg-gold-200 font-bold text-black border-l-3 border-gold-600' : 'text-black'
                  }`}
                >
                  <span className="truncate">{acc.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${roleBadgeMap[acc.role] || ''}`}>
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reset Database Button */}
        <button
          type="button"
          onClick={handleResetData}
          disabled={isResetting}
          className="hidden md:flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-black bg-white/90 hover:bg-white rounded-lg border border-gold-600/40 shadow-2xs transition-all duration-200 cursor-pointer"
          title="Reset sample database"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin text-gold-700' : 'text-black'}`} />
          <span>Reset Demo</span>
        </button>

        {/* Notification Bell Dropdown */}
        <NotificationDropdown onNavigate={onNavigate} />

        {/* User profile & Logout */}
        {user && (
          <div className="flex items-center gap-3 pl-2 border-l border-gold-600/40">
            <div className="flex items-center gap-2">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="h-8 w-8 rounded-full border-2 border-gold-600 object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center text-gold-300 font-bold text-xs ring-2 ring-gold-600/60">
                  {userInitials}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-black leading-tight truncate max-w-[120px]">
                  {user.name}
                </div>
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded border shadow-2xs ${roleBadgeMap[user.role] || 'bg-white text-black border-gold-300'}`}>
                  {user.role}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-1.5 text-black hover:text-black hover:bg-gold-600/20 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

