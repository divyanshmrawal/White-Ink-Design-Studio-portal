import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Menu } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { BrandLogo } from '../common/BrandLogo';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNavigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onNavigate }) => {
  const { user, logout } = useAuth();

  const roleBadgeMap: Record<string, string> = {
    SUPER_ADMIN: 'bg-black text-gold-400 border-gold-600 font-semibold',
    ADMIN: 'bg-gold-200 text-black border-gold-400 font-semibold',
    TEAM_MEMBER: 'bg-white text-black border-gold-300 font-medium',
    CLIENT_ADMIN: 'bg-gold-300 text-black border-gold-500 font-bold',
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

