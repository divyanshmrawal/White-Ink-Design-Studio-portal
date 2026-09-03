import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { User, Role } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: User | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
}) => {
  const { user: currentUser } = useAuth();
  const isEditing = Boolean(user);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('TEAM_MEMBER');
  const [profileImage, setProfileImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPassword('');
      setRole(user.role || 'TEAM_MEMBER');
      setProfileImage(user.profileImage || '');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('TEAM_MEMBER');
      setProfileImage('');
    }
    setError(null);
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (!isEditing && !password) {
      setError('Password is required for new accounts.');
      return;
    }
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && user) {
        await api.updateUser(user.id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          password: password || undefined,
          profileImage: profileImage.trim() || undefined,
        });
      } else {
        await api.createUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          profileImage: profileImage.trim() || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit User Account' : 'Add New System User'}
      subtitle={isEditing ? 'Update user credentials and authorization roles' : 'Create an internal team member, manager, or client login'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Alex Vance"
            className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g., alex@company.com"
            className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
            {isEditing ? 'Password (leave blank to keep current)' : 'Password *'}
          </label>
          <input
            type="password"
            required={!isEditing}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEditing ? '••••••••' : 'Minimum 6 characters'}
            className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
            System Role <span className="text-rose-500">*</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 cursor-pointer"
          >
            {isSuperAdmin && <option value="SUPER_ADMIN">SUPER ADMIN (Full root access)</option>}
            <option value="ADMIN">ADMIN (Project & Team management)</option>
            <option value="TEAM_MEMBER">TEAM MEMBER (Assigned projects & tasks)</option>
            <option value="CLIENT">CLIENT (External viewer)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
            Profile Image URL (optional)
          </label>
          <input
            type="url"
            value={profileImage}
            onChange={(e) => setProfileImage(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-[#374151] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
