import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ClientApproval, Project, ApprovalStatus } from '../types';
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  FolderKanban,
  User,
  MessageSquare,
  Trash2,
  Edit2,
  Calendar,
  X,
  AlertCircle,
} from 'lucide-react';

interface ApprovalsPageProps {
  onNavigate?: (path: string) => void;
}

export const ApprovalsPage: React.FC<ApprovalsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'TEAM_MEMBER';
  const isClient = role === 'CLIENT';
  const canRequestApproval = role !== 'CLIENT';
  const canDelete = role === 'SUPER_ADMIN' || role === 'ADMIN';

  const [approvals, setApprovals] = useState<ClientApproval[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Submit Approval Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    title: '',
    description: '',
    projectId: '',
    deliverableUrl: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Review / Decision Modal (For Client or Admin)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState<ClientApproval | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewComments, setReviewComments] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [approvalsRes, projectsRes] = await Promise.all([
        api.getApprovals({
          projectId: selectedProject,
          status: selectedStatus,
          search: search || undefined,
        }),
        api.getProjects(),
      ]);
      setApprovals(approvalsRes);
      setProjects(projectsRes);
    } catch (err) {
      console.error('Error loading approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProject, selectedStatus, search]);

  const handleOpenSubmit = () => {
    setSubmitForm({
      title: '',
      description: '',
      projectId: projects[0]?.id || '',
      deliverableUrl: '',
    });
    setSubmitError('');
    setIsSubmitModalOpen(true);
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitForm.title.trim()) {
      setSubmitError('Deliverable title is required');
      return;
    }
    if (!submitForm.projectId) {
      setSubmitError('Please choose an associated project');
      return;
    }

    try {
      setSubmitLoading(true);
      setSubmitError('');

      await api.createApproval({
        title: submitForm.title.trim(),
        description: submitForm.description.trim() || undefined,
        projectId: submitForm.projectId,
        deliverableUrl: submitForm.deliverableUrl.trim() || undefined,
      });

      setIsSubmitModalOpen(false);
      loadData();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit deliverable');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenReview = (item: ClientApproval, decision: 'APPROVED' | 'REJECTED') => {
    setReviewItem(item);
    setReviewDecision(decision);
    setReviewComments(item.comments || '');
    setReviewError('');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewItem) return;

    try {
      setReviewLoading(true);
      setReviewError('');

      await api.updateApproval(reviewItem.id, {
        status: reviewDecision,
        comments: reviewComments.trim() || undefined,
      });

      setReviewModalOpen(false);
      loadData();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to remove approval request "${title}"?`)) return;
    try {
      await api.deleteApproval(id);
      setApprovals((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete approval');
    }
  };

  // KPIs
  const totalCount = approvals.length;
  const pendingCount = approvals.filter((a) => a.status === 'PENDING').length;
  const approvedCount = approvals.filter((a) => a.status === 'APPROVED').length;
  const rejectedCount = approvals.filter((a) => a.status === 'REJECTED').length;

  const getStatusPill = (status: ApprovalStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3.5 w-3.5" /> Needs Revisions
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3.5 w-3.5" /> Pending Client Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-black flex items-center gap-2.5">
            <FileCheck className="h-6 w-6 text-gold-600 stroke-[2.5]" />
            Client Deliverables & Approvals
          </h1>
          <p className="text-sm text-black/70 font-medium mt-1">
            {isClient
              ? 'Review, provide feedback, and approve deliverables submitted for your projects'
              : 'Submit milestones, design drafts, and staging builds for client sign-off'}
          </p>
        </div>

        {canRequestApproval && (
          <button
            type="button"
            onClick={handleOpenSubmit}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-black text-sm font-bold rounded-lg border border-gold-600 shadow-xs transition-colors cursor-pointer btn-hover-lift"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Submit Deliverable
          </button>
        )}
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gold-300 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-gold-100 text-gold-700 border border-gold-300 rounded-lg shrink-0">
            <FileCheck className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-bold text-black/60">Total Deliverables</div>
            <div className="text-xl font-extrabold text-black">{totalCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gold-300 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-gold-100 text-gold-700 border border-gold-300 rounded-lg shrink-0">
            <Clock className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-bold text-black/60">Pending Review</div>
            <div className="text-xl font-extrabold text-amber-700">{pendingCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gold-300 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-gold-100 text-gold-700 border border-gold-300 rounded-lg shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-bold text-black/60">Approved</div>
            <div className="text-xl font-extrabold text-emerald-700">{approvedCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gold-300 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-gold-100 text-gold-700 border border-gold-300 rounded-lg shrink-0">
            <XCircle className="h-5 w-5 text-rose-600 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-bold text-black/60">Revisions Requested</div>
            <div className="text-xl font-extrabold text-rose-700">{rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gold-300 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-black/50" />
          <input
            type="text"
            placeholder="Search deliverables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gold-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-gold-500 bg-white text-black font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-black/50" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="text-xs font-bold py-2 px-3 bg-gold-50 border border-gold-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-gold-500 text-black"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-bold py-2 px-3 bg-gold-50 border border-gold-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-gold-500 text-black"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Needs Revision</option>
          </select>
        </div>
      </div>

      {/* Deliverables List */}
      {loading ? (
        <div className="p-12 text-center text-black/60 bg-white rounded-xl border border-gold-300">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gold-600 border-t-transparent mb-3" />
          <p className="text-sm font-bold">Loading approval requests...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="p-12 text-center text-black/50 bg-white rounded-xl border border-gold-300">
          <FileCheck className="h-10 w-10 text-gold-400 mx-auto mb-3" />
          <h3 className="text-base font-extrabold text-black">No deliverables to display</h3>
          <p className="text-xs text-black/60 mt-1 max-w-sm mx-auto font-medium">
            {search || selectedProject !== 'ALL' || selectedStatus !== 'ALL'
              ? 'No approval requests match the selected filters.'
              : 'Deliverables requested for client sign-off will appear here.'}
          </p>
          {canRequestApproval && (
            <button
              type="button"
              onClick={handleOpenSubmit}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black text-xs font-bold rounded-lg border border-gold-600 shadow-xs transition-colors cursor-pointer btn-hover-lift"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              Submit First Deliverable
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((item) => {
            const project = item.project || projects.find((p) => p.id === item.projectId);

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gold-300 p-5 shadow-sm hover:border-gold-500 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 card-hover-lift"
              >
                {/* Left details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getStatusPill(item.status)}
                    {project && (
                      <button
                        type="button"
                        onClick={() => onNavigate && onNavigate(`/projects/${project.id}`)}
                        className="inline-flex items-center gap-1 text-[11px] font-extrabold text-black bg-gold-100 hover:bg-gold-200 px-2.5 py-0.5 rounded border border-gold-300 transition-colors"
                      >
                        <FolderKanban className="h-3 w-3 text-gold-700" />
                        <span>{project.name}</span>
                      </button>
                    )}
                    <span className="text-xs text-black/50 flex items-center gap-1 font-medium">
                      <Calendar className="h-3 w-3" />
                      Submitted {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-black leading-snug">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-xs text-black/70 leading-relaxed max-w-2xl font-medium">
                      {item.description}
                    </p>
                  )}

                  {/* Deliverable URL */}
                  {item.deliverableUrl && (
                    <div className="pt-1">
                      <a
                        href={item.deliverableUrl.startsWith('http') ? item.deliverableUrl : `https://${item.deliverableUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-800 hover:text-black bg-gold-100 hover:bg-gold-200 px-2.5 py-1 rounded-md border border-gold-300 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>View Deliverable Link / Asset</span>
                      </a>
                    </div>
                  )}

                  {/* Requester & Reviewer metadata */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-black/60 pt-1 font-medium">
                    {item.requestedBy && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-gold-700" />
                        Submitted by <span className="font-bold text-black">{item.requestedBy.name}</span>
                      </span>
                    )}
                    {item.reviewedBy && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Reviewed by <span className="font-bold text-black">{item.reviewedBy.name}</span>
                      </span>
                    )}
                  </div>

                  {/* Feedback comments box */}
                  {item.comments && (
                    <div className="p-3 bg-gold-50/50 rounded-lg border border-gold-200 text-xs mt-2">
                      <div className="font-bold text-black flex items-center gap-1.5 mb-1">
                        <MessageSquare className="h-3.5 w-3.5 text-gold-700" />
                        Client Review Feedback:
                      </div>
                      <p className="text-black/70 italic">"{item.comments}"</p>
                    </div>
                  )}
                </div>

                {/* Right action buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gold-200">
                  {/* Actions for Client or Admin on Pending Items */}
                  {item.status === 'PENDING' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenReview(item, 'APPROVED')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenReview(item, 'REJECTED')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Request Revisions
                      </button>
                    </div>
                  )}

                  {/* Admin Delete */}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-2 text-black/40 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Deliverable Request"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Deliverable Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gold-300 space-y-4">
            <div className="flex items-center justify-between border-b border-gold-200 pb-3">
              <h2 className="text-lg font-extrabold text-black flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-gold-600 stroke-[2.5]" />
                Submit Deliverable for Client Sign-Off
              </h2>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1 text-black/50 hover:text-black rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Deliverable Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design System Figma v1, Staging Build Deployment"
                  value={submitForm.title}
                  onChange={(e) => setSubmitForm({ ...submitForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Project *
                </label>
                <select
                  required
                  value={submitForm.projectId}
                  onChange={(e) => setSubmitForm({ ...submitForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                >
                  <option value="" disabled>
                    Select Project
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Deliverable URL / Preview Link
                </label>
                <input
                  type="url"
                  placeholder="https://figma.com/... or https://staging.app.com"
                  value={submitForm.deliverableUrl}
                  onChange={(e) => setSubmitForm({ ...submitForm, deliverableUrl: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Description & Context
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain what was accomplished and what specific points the client should inspect..."
                  value={submitForm.description}
                  onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-black bg-gold-100 hover:bg-gold-200 border border-gold-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs btn-hover-lift"
                >
                  {submitLoading ? 'Submitting...' : 'Send for Client Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review / Decision Modal */}
      {reviewModalOpen && reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gold-300 space-y-4">
            <div className="flex items-center justify-between border-b border-gold-200 pb-3">
              <h2 className="text-lg font-extrabold text-black flex items-center gap-2">
                {reviewDecision === 'APPROVED' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-600" />
                )}
                {reviewDecision === 'APPROVED' ? 'Approve Deliverable' : 'Request Deliverable Revisions'}
              </h2>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="p-1 text-black/50 hover:text-black rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {reviewError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg">
                {reviewError}
              </div>
            )}

            <div className="bg-gold-50/50 p-3 rounded-lg border border-gold-300">
              <div className="text-xs text-black/60 font-bold">Deliverable</div>
              <div className="text-sm font-extrabold text-black">{reviewItem.title}</div>
              {reviewItem.deliverableUrl && (
                <a
                  href={reviewItem.deliverableUrl.startsWith('http') ? reviewItem.deliverableUrl : `https://${reviewItem.deliverableUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gold-700 font-bold inline-flex items-center gap-1 mt-1 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Inspect Asset Link
                </a>
              )}
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Feedback & Comments {reviewDecision === 'REJECTED' && '*'}
                </label>
                <textarea
                  rows={3}
                  required={reviewDecision === 'REJECTED'}
                  placeholder={
                    reviewDecision === 'APPROVED'
                      ? 'Optional note (e.g., "Looks great, ready for production!")'
                      : 'Specify the required adjustments, visual feedback, or bug notes...'
                  }
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-black bg-gold-100 hover:bg-gold-200 border border-gold-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs btn-hover-lift ${
                    reviewDecision === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {reviewLoading
                    ? 'Submitting...'
                    : reviewDecision === 'APPROVED'
                    ? 'Confirm Approval'
                    : 'Submit Revision Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
