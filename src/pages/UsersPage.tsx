import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Role } from '../types';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { UserModal } from '../components/users/UserModal';
import {
  Users,
  Search,
  Plus,
  Shield,
  Edit2,
  Trash2,
  Mail,
  Calendar,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers({ search, role: roleFilter });
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await api.deleteUser(deletingUser.id);
      setDeletingUser(null);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
            Super Admin
          </span>
        );
      case 'ADMIN':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
            Admin
          </span>
        );
      case 'TEAM_MEMBER':
        return (
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            Team Member
          </span>
        );
      case 'CLIENT':
        return (
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            Client Partner
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">User Management</h1>
          <p className="text-sm text-[#6B7280]">
            Manage system access credentials, role-based authorizations, and staff profiles
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-1.5 text-xs font-medium bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#374151] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 cursor-pointer"
        >
          <option value="ALL">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="TEAM_MEMBER">Team Member</option>
          <option value="CLIENT">Client</option>
        </select>
      </div>

      {/* User List Table */}
      {isLoading ? (
        <LoadingSpinner message="Fetching user directory..." />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users found"
          description="No users matched your query. Add a new user to invite them to the platform."
          icon={Users}
          actionLabel="Add User"
          onAction={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs divide-y divide-[#E5E7EB] overflow-hidden">
          {users.map((u) => (
            <div
              key={u.id}
              className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={
                    u.profileImage ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`
                  }
                  alt={u.name}
                  className="h-10 w-10 rounded-lg border border-[#E5E7EB] object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#111827] truncate">{u.name}</h3>
                    {u.id === currentUser?.id && (
                      <span className="text-[10px] bg-gray-100 text-[#4B5563] px-1.5 py-0.5 rounded font-medium">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6B7280] flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3 text-[#9CA3AF]" />
                    {u.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5E7EB]">
                {getRoleBadge(u.role)}

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(u);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-[#9CA3AF] hover:text-[#111827] hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                    title="Edit User"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingUser(u)}
                    disabled={u.id === currentUser?.id}
                    className="p-1.5 text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#9CA3AF] cursor-pointer"
                    title="Delete User"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadUsers}
        user={editingUser}
      />

      {/* Delete User Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteUser}
        title="Delete User Account?"
        message={`Are you sure you want to delete "${deletingUser?.name}" (${deletingUser?.email})? This action cannot be undone.`}
        isLoading={isDeleting}
      />
    </div>
  );
};
