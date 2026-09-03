import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Client } from '../../types';
import { api } from '../../services/api';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: Client | null;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  client,
}) => {
  const isEditing = Boolean(client);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setName(client.name || '');
      setCompany(client.company || '');
      setEmail(client.email || '');
      setPhone(client.phone || '');
      setAddress(client.address || '');
    } else {
      setName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setAddress('');
    }
    setError(null);
  }, [client, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !company.trim() || !email.trim()) {
      setError('Contact name, company name, and email are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && client) {
        await api.updateClient(client.id, {
          name: name.trim(),
          company: company.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        });
      } else {
        await api.createClient({
          name: name.trim(),
          company: company.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save client organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Client Organization' : 'Add New Client'}
      subtitle={isEditing ? 'Update client contact details and company profile' : 'Register a new client company for project associations'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Company / Organization Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g., Acme Corporation"
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black focus:outline-hidden focus:ring-2 focus:ring-gold-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Primary Contact Person <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Marcus Brody"
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black focus:outline-hidden focus:ring-2 focus:ring-gold-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g., client@demo.com"
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black focus:outline-hidden focus:ring-2 focus:ring-gold-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g., +1 (555) 234-5678"
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black focus:outline-hidden focus:ring-2 focus:ring-gold-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Office Address
          </label>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 100 Innovation Way, Suite 400, San Francisco, CA"
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black focus:outline-hidden focus:ring-2 focus:ring-gold-500 font-medium"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gold-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-bold text-black bg-gold-100 hover:bg-gold-200 border border-gold-300 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg transition-colors disabled:opacity-50 shadow-xs cursor-pointer btn-hover-lift"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Client' : 'Add Client'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
