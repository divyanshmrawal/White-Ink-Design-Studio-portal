import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SOPDocument } from '../types';
import { exportToCsv } from '../utils/csvExport';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Tag,
  Edit2,
  Trash2,
  Download,
  Calendar,
  User as UserIcon,
  X,
  FileText,
  Bookmark,
  Layers,
  Sparkles,
} from 'lucide-react';

export const SOPPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'TEAM_MEMBER';
  const canManageSOP = role === 'SUPER_ADMIN' || role === 'ADMIN';

  const [sops, setSops] = useState<SOPDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeSOP, setActiveSOP] = useState<SOPDocument | null>(null);

  // Authoring Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    category: 'Engineering',
    version: '1.0',
    tags: '',
    content: '',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const categories = [
    'All',
    'Engineering',
    'Design & UX',
    'HR & Onboarding',
    'Project Delivery',
    'Security & Compliance',
    'Quality Assurance',
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getSOPs({
        category: selectedCategory,
        search: search || undefined,
      });
      setSops(res);
      if (res.length > 0 && !activeSOP) {
        setActiveSOP(res[0]);
      }
    } catch (err) {
      console.error('Error loading SOPs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, search]);

  const handleOpenCreate = () => {
    setForm({
      title: '',
      category: selectedCategory === 'All' ? 'Engineering' : selectedCategory,
      version: '1.0',
      tags: 'Process, Guidelines',
      content: '',
    });
    setIsEditing(false);
    setCurrentId(null);
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sop: SOPDocument) => {
    setForm({
      title: sop.title,
      category: sop.category,
      version: sop.version,
      tags: sop.tags || '',
      content: sop.content,
    });
    setIsEditing(true);
    setCurrentId(sop.id);
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setModalError('Title and content are required.');
      return;
    }

    try {
      setModalLoading(true);
      setModalError('');

      if (isEditing && currentId) {
        const updated = await api.updateSOP(currentId, {
          title: form.title.trim(),
          category: form.category,
          version: form.version.trim(),
          tags: form.tags.trim() || undefined,
          content: form.content.trim(),
        });
        setActiveSOP(updated.sop);
      } else {
        const created = await api.createSOP({
          title: form.title.trim(),
          category: form.category,
          version: form.version.trim() || '1.0',
          tags: form.tags.trim() || undefined,
          content: form.content.trim(),
        });
        setActiveSOP(created.sop);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save SOP document');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete SOP "${title}"?`)) return;
    try {
      await api.deleteSOP(id);
      const remaining = sops.filter((s) => s.id !== id);
      setSops(remaining);
      if (activeSOP?.id === id) {
        setActiveSOP(remaining[0] || null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete SOP');
    }
  };

  const handleExportCSV = () => {
    const rows = sops.map((s) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      version: s.version,
      tags: s.tags || '',
      author: s.createdBy?.name || 'Unknown',
      createdAt: new Date(s.createdAt).toLocaleDateString(),
      updatedAt: new Date(s.updatedAt).toLocaleDateString(),
    }));

    exportToCsv('SOP_Documents_Catalog_' + new Date().toISOString().split('T')[0], rows, [
      { key: 'title', label: 'Document Title' },
      { key: 'category', label: 'Category' },
      { key: 'version', label: 'Version' },
      { key: 'tags', label: 'Tags' },
      { key: 'author', label: 'Created By' },
      { key: 'updatedAt', label: 'Last Updated' },
    ]);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            Standard Operating Procedures (SOPs)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Centralized organizational knowledge base, operational workflows, and delivery guidelines.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg border border-gray-300 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-gray-500" />
            Export Catalog
          </button>
          {canManageSOP && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              New SOP Document
            </button>
          )}
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search SOP titles, tags, or guidelines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-900">{sops.length}</span> published procedures
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Split: Index on Left, Viewer on Right */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
          <p className="text-sm font-medium">Loading documentation...</p>
        </div>
      ) : sops.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">No SOP documents found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            {search || selectedCategory !== 'All'
              ? 'No SOPs match your search keywords or category filter.'
              : 'Standard Operating Procedures created by team leads will appear here.'}
          </p>
          {canManageSOP && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Create First SOP
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Document List */}
          <div className="lg:col-span-4 space-y-3">
            {sops.map((sop) => {
              const isActive = activeSOP?.id === sop.id;
              return (
                <div
                  key={sop.id}
                  onClick={() => setActiveSOP(sop)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50/50 border-indigo-400 shadow-xs'
                      : 'bg-white border-gray-200 hover:border-indigo-200 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100/80 text-indigo-700">
                      {sop.category}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      v{sop.version}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                    {sop.title}
                  </h3>

                  <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                    {sop.content}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-3 mt-2 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      {sop.createdBy?.name || 'Admin'}
                    </span>
                    <span>{new Date(sop.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Full Document Viewer */}
          <div className="lg:col-span-8">
            {activeSOP ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-6">
                {/* Document Header */}
                <div className="border-b border-gray-100 pb-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700">
                        {activeSOP.category}
                      </span>
                      <span className="text-xs font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                        Version {activeSOP.version}
                      </span>
                    </div>

                    {canManageSOP && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(activeSOP)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit SOP
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(activeSOP.id, activeSOP.title)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete SOP"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 leading-tight">
                    {activeSOP.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                      Author: <span className="font-semibold text-gray-700">{activeSOP.createdBy?.name || 'Administrator'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      Last updated: {new Date(activeSOP.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {activeSOP.tags && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                      <Tag className="h-3.5 w-3.5 text-gray-400 mr-1" />
                      {activeSOP.tags.split(',').map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                        >
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Document Body */}
                <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {activeSOP.content}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
                Select an SOP document from the left list to view.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Authoring Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                {isEditing ? 'Edit SOP Document' : 'Author New SOP Document'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Pull Request & Code Review Lifecycle"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Version Code
                  </label>
                  <input
                    type="text"
                    placeholder="1.0, 2.1"
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Workflow, CI/CD, Staging"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Procedure Guidelines & Documentation *
                </label>
                <textarea
                  rows={10}
                  required
                  placeholder="Outline step-by-step procedures, prerequisites, checklist items, and escalation paths..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {modalLoading ? 'Saving...' : isEditing ? 'Update SOP' : 'Publish SOP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
