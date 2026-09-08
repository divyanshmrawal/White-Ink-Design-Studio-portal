import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IssuedCredential, Role } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import {
  KeyRound,
  Search,
  Copy,
  Check,
  Eye,
  EyeOff,
  Mail,
  Building2,
  Shield,
  User,
  ShieldAlert,
  Info,
} from 'lucide-react';

export const CredentialsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [credentials, setCredentials] = useState<IssuedCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadCredentials = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getIssuedCredentials();
      setCredentials(data || []);
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = (cred: IssuedCredential) => {
    const text = `White Ink Portal Login Credentials\nEmail: ${cred.email}\nPassword: ${cred.plaintextPassword}`;
    navigator.clipboard.writeText(text);
    setCopiedId(cred.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  const filtered = credentials.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = c.user?.name?.toLowerCase().includes(q) || false;
    const emailMatch = c.email.toLowerCase().includes(q);
    const companyMatch = (c.user as any)?.companyName?.toLowerCase().includes(q) || false;
    return nameMatch || emailMatch || companyMatch;
  });

  const getRoleBadge = (role?: Role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-black text-gold-400 border border-gold-600 shadow-2xs">
            Super Admin
          </span>
        );
      case 'ADMIN':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-gold-200 text-black border border-gold-400">
            Admin
          </span>
        );
      case 'CLIENT_ADMIN':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-gold-400 text-black border border-gold-600 shadow-2xs">
            Client Admin
          </span>
        );
      case 'TEAM_MEMBER':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gold-100 text-black border border-gold-300">
            Team Member
          </span>
        );
      case 'CLIENT':
        return (
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-white text-black border border-gold-300">
            Client Partner
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gold-50 text-black border border-gold-200">
            User
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-gold-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gold-100 rounded-lg border border-gold-300 text-gold-700">
              <KeyRound className="h-5 w-5 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-heading">Credentials Vault</h1>
          </div>
          <p className="text-sm text-neutral-600 mt-1">
            {currentUser?.role === 'SUPER_ADMIN'
              ? 'Comprehensive vault of all system credentials auto-generated for Admins, Client Admins, and Staff'
              : currentUser?.role === 'CLIENT_ADMIN'
              ? 'Retrieve auto-generated login credentials for your company team members'
              : 'Retrieve auto-generated login credentials for your team members'}
          </p>
        </div>
      </div>

      {/* Info notice */}
      <div className="p-4 bg-gold-50/70 border border-gold-300 rounded-xl flex items-start gap-3 text-xs text-neutral-800 leading-relaxed font-medium">
        <Info className="h-4 w-4 text-gold-700 shrink-0 mt-0.5" />
        <div>
          The credentials below record the initial temporary passwords auto-generated upon account provisioning or request approval. Use the copy button to safely hand out access to your members. Once a user logs in and updates their password, their permanent password is encrypted with bcrypt and cannot be displayed here.
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-card p-3.5 rounded-xl border border-gold-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-700" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search credentials by name, email, or company..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-gold-50/50 border border-gold-200 rounded-lg text-heading focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        <div className="text-xs font-semibold text-neutral-600">
          Total Issued: <span className="font-bold text-black">{filtered.length}</span>
        </div>
      </div>

      {/* Credentials Table */}
      {isLoading ? (
        <LoadingSpinner message="Retrieving credentials vault..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No credentials found"
          description={
            search
              ? 'No issued credentials matched your search query.'
              : 'No member credentials have been generated yet.'
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gold-300 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gold-50 border-b border-gold-200 text-xs uppercase tracking-wider text-black/80 font-bold">
                <tr>
                  <th className="px-5 py-3.5">Recipient</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Organization</th>
                  <th className="px-5 py-3.5">Password</th>
                  {currentUser?.role === 'SUPER_ADMIN' && <th className="px-5 py-3.5">Issued By</th>}
                  <th className="px-5 py-3.5">Generated On</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-200 text-heading">
                {filtered.map((cred) => {
                  const isRevealed = revealedIds.has(cred.id);
                  const isJustCopied = copiedId === cred.id;

                  return (
                    <tr key={cred.id} className="hover:bg-gold-50/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-black">{cred.user?.name || 'Authorized Member'}</div>
                        <div className="text-xs text-neutral-600 flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-gold-600" />
                          {cred.email}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {getRoleBadge(cred.user?.role)}
                      </td>

                      <td className="px-5 py-4">
                        {(cred.user as any)?.companyName ? (
                          <span className="font-medium text-black flex items-center gap-1.5 text-xs">
                            <Building2 className="h-3.5 w-3.5 text-neutral-500" />
                            {(cred.user as any).companyName}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-500 italic">White Ink Design Studio</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm bg-gold-50/60 px-3 py-1.5 rounded-lg border border-gold-300 text-black select-all min-w-[150px] tracking-wider">
                            {isRevealed ? cred.plaintextPassword : '••••••••••••'}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleReveal(cred.id)}
                            className="p-1.5 text-neutral-600 hover:text-black hover:bg-gold-100 rounded-md transition-colors cursor-pointer"
                            title={isRevealed ? 'Mask password' : 'Show password'}
                          >
                            {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>

                      {currentUser?.role === 'SUPER_ADMIN' && (
                        <td className="px-5 py-4 text-xs text-neutral-700">
                          {cred.createdBy ? (
                            <div>
                              <div className="font-semibold text-black">{cred.createdBy.name}</div>
                              <div className="text-[11px] text-neutral-500">{cred.createdBy.role}</div>
                            </div>
                          ) : (
                            <span className="text-neutral-400 italic">System Auto</span>
                          )}
                        </td>
                      )}

                      <td className="px-5 py-4 text-xs text-neutral-600 whitespace-nowrap">
                        <div>{new Date(cred.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                        <div className="text-[11px] text-neutral-500">
                          {new Date(cred.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCopy(cred)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                            isJustCopied
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                              : 'bg-gold-400 hover:bg-gold-500 text-black border-gold-600 btn-hover-lift'
                          }`}
                        >
                          {isJustCopied ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : <Copy className="h-3.5 w-3.5" />}
                          {isJustCopied ? 'Copied' : 'Copy'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
