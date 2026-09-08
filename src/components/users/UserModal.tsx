import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { User, Role, Client } from '../../types';
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

  const getAllowedRoles = (): Role[] => {
    switch (currentUser?.role) {
      case 'SUPER_ADMIN':
        return ['ADMIN', 'CLIENT_ADMIN'];
      case 'ADMIN':
        return ['TEAM_MEMBER'];
      case 'CLIENT_ADMIN':
        return ['CLIENT'];
      default:
        return [];
    }
  };

  const allowedRoles = getAllowedRoles();
  const defaultRole = allowedRoles[0] || 'TEAM_MEMBER';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(defaultRole);
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [profileImage, setProfileImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getClients()
        .then((data) => setClients(data || []))
        .catch((err) => console.error('Failed to load clients in UserModal:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPassword('');
      setRole(user.role || defaultRole);
      setClientId(user.clientId || '');
      setProfileImage(user.profileImage || '');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole(defaultRole);
      setClientId('');
      setProfileImage('');
    }
    setError(null);
  }, [user, isOpen, defaultRole]);

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
    if (role === 'CLIENT_ADMIN' && !clientId) {
      setError('Please select a client company.');
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
          clientId: role === 'CLIENT_ADMIN' ? clientId : undefined,
          password: password || undefined,
          profileImage: profileImage.trim() || undefined,
        });
      } else {
        await api.createUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          clientId: role === 'CLIENT_ADMIN' ? clientId : undefined,
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

  const getRoleLabel = (r: Role) => {
    switch (r) {
      case 'ADMIN':
        return 'ADMIN (Internal Company Admin)';
      case 'CLIENT_ADMIN':
        return 'CLIENT ADMIN (Client Company Admin)';
      case 'TEAM_MEMBER':
        return 'TEAM MEMBER (Internal Staff)';
      case 'CLIENT':
        return 'CLIENT (Client Company Member)';
      default:
        return r;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit User Account' : currentUser?.role === 'CLIENT_ADMIN' ? 'Add Company Team Member' : 'Add New User'}
      subtitle={
        isEditing
          ? 'Update user credentials and profile details'
          : currentUser?.role === 'CLIENT_ADMIN'
          ? 'Add a member to your client company team'
          : 'Create an authorized system user account'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="form-label block mb-1 text-heading">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Alex Vance"
            className="w-full px-3.5 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        <div>
          <label className="form-label block mb-1 text-heading">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g., alex@company.com"
            className="w-full px-3.5 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        <div>
          <label className="form-label block mb-1 text-heading">
            {isEditing ? 'Password (leave blank to keep current)' : 'Password *'}
          </label>
          <input
            type="password"
            required={!isEditing}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEditing ? '••••••••' : 'Minimum 6 characters'}
            className="w-full px-3.5 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        <div>
          <label className="form-label block mb-1 text-heading">
            System Role <span className="text-rose-500">*</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={allowedRoles.length <= 1}
            className="w-full px-3.5 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {allowedRoles.map((r) => (
              <option key={r} value={r}>
                {getRoleLabel(r)}
              </option>
            ))}
          </select>
        </div>

        {role === 'CLIENT_ADMIN' && (
          <div>
            <label className="form-label block mb-1 text-heading">
              Client Company <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 cursor-pointer"
            >
              <option value="">Select a client company...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company ? `${c.company} (${c.name})` : c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="form-label block mb-1 text-heading">
            Profile Image URL (optional)
          </label>
          <input
            type="url"
            value={profileImage}
            onChange={(e) => setProfileImage(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            className="w-full px-3.5 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gold-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-heading bg-white border border-gold-300 hover:bg-gold-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary btn-hover-lift px-5 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
