import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SystemSettings, EmployeeScheduleOverride, User } from '../types';
import {
  checkPushSupport,
  requestPushPermission,
  triggerLocalNotification,
  PushStatus,
} from '../utils/pushNotifications';
import { initAndRegisterFcmToken } from '../utils/fcm';
import {
  Settings,
  Clock,
  Bell,
  Users,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  Sparkles,
  Calendar,
  Key,
  FileText,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lock,
  ShieldCheck,
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>({
    id: 'default',
    officeStartTime: '09:00',
    officeEndTime: '18:00',
    lateGraceMinutes: 15,
    lateThresholdMinutes: 15,
    maxBreakMinutes: 60,
    defaultLeaveAllowance: 18,
    meetingLink: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [overrides, setOverrides] = useState<EmployeeScheduleOverride[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Push Notifications State
  const [pushStatus, setPushStatus] = useState<PushStatus>({
    supported: true,
    permission: 'default',
    isSubscribed: false,
  });
  const [testingPush, setTestingPush] = useState(false);
  const [pushFeedback, setPushFeedback] = useState('');

  // Override Modal
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    userId: '',
    officeStartTime: '10:00',
    officeEndTime: '19:00',
    lateGraceMinutes: 20,
    notes: 'Flexible working hours agreement',
  });
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsRes, overridesRes, usersRes] = await Promise.all([
        api.getSettings().catch(() => null),
        api.getScheduleOverrides().catch(() => []),
        api.getUsers().catch(() => []),
      ]);

      if (settingsRes?.settings) {
        setSettings(settingsRes.settings);
      }
      setOverrides(overridesRes);
      setUsers(usersRes.filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN'));

      const pStatus = await checkPushSupport();
      setPushStatus(pStatus);
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSaveSuccess(false);

      const res = await api.updateSettings({
        officeStartTime: settings.officeStartTime,
        officeEndTime: settings.officeEndTime,
        lateGraceMinutes: Number(settings.lateGraceMinutes || settings.lateThresholdMinutes || 15),
        lateThresholdMinutes: Number(settings.lateGraceMinutes || settings.lateThresholdMinutes || 15),
        maxBreakMinutes: Number(settings.maxBreakMinutes),
        defaultLeaveAllowance: Number(settings.defaultLeaveAllowance),
        meetingLink: settings.meetingLink || null,
      });

      setSettings(res.settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update system settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenAddOverride = () => {
    setOverrideForm({
      userId: users[0]?.id || '',
      officeStartTime: '10:00',
      officeEndTime: '19:00',
      lateGraceMinutes: 20,
      notes: 'Flexi-time schedule agreement',
    });
    setOverrideError('');
    setIsOverrideModalOpen(true);
  };

  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideForm.userId) {
      setOverrideError('Please choose an employee');
      return;
    }

    try {
      setOverrideLoading(true);
      setOverrideError('');

      await api.setScheduleOverride({
        userId: overrideForm.userId,
        customStartTime: overrideForm.officeStartTime,
        customEndTime: overrideForm.officeEndTime,
        notes: overrideForm.notes.trim() || undefined,
      });

      setIsOverrideModalOpen(false);
      loadData();
    } catch (err: any) {
      setOverrideError(err.message || 'Failed to set schedule override');
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleDeleteOverride = async (userId: string, userName?: string) => {
    if (!window.confirm(`Reset custom schedule for ${userName || 'this employee'} back to office default?`)) return;
    try {
      await api.deleteScheduleOverride(userId);
      setOverrides((prev) => prev.filter((o) => o.userId !== userId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete schedule override');
    }
  };

  const handleEnablePush = async () => {
    setPushFeedback('');
    const fcmRes = await initAndRegisterFcmToken();
    const updated = await checkPushSupport();
    setPushStatus(updated);

    if (fcmRes.success) {
      setPushFeedback('Firebase Cloud Messaging connected and device token registered!');
      triggerLocalNotification('FCM Push Connected', {
        body: 'Real-time background & desktop push notifications are active.',
      });
      return;
    }

    if (fcmRes.reason === 'unconfigured') {
      const granted = await requestPushPermission();
      const st = await checkPushSupport();
      setPushStatus(st);
      if (granted) {
        setPushFeedback('Browser notifications enabled. Add Firebase credentials in Settings to enable closed-tab FCM push.');
      }
      return;
    }

    if (fcmRes.reason === 'permission_denied') {
      setPushFeedback('Notification permission was denied in your browser settings.');
    }
  };

  const handleTestFcmPush = async () => {
    setTestingPush(true);
    setPushFeedback('');
    try {
      const res = await api.testFcmPush({
        title: 'FCM Push Alert',
        message: 'Firebase Cloud Messaging push notification received successfully!',
      });
      setPushFeedback(res.message || 'Push alert sent to your device via FCM!');
    } catch (err: any) {
      triggerLocalNotification('Desktop Notification Test', {
        body: 'Desktop alert received. (FCM background push requires Firebase Admin credentials).',
      });
      setPushFeedback(err.message || 'Desktop notification triggered.');
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-black flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-gold-600 stroke-[2.5]" />
          System Settings & Operational Policies
        </h1>
        <p className="text-sm text-black/70 font-medium mt-1">
          Configure standard working hours, attendance late-arrival thresholds, custom employee shift overrides, and push notifications.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Standard Working Hours & Policies Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-xl border border-gold-300 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gold-200 pb-3">
              <h2 className="text-base font-extrabold text-black flex items-center gap-2">
                <Clock className="h-5 w-5 text-gold-600 stroke-[2.5]" />
                Default Working Hours & Attendance Rules
              </h2>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-gold-50 border border-gold-300 text-black font-bold text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gold-700 shrink-0" />
                <span>System policies and working schedule updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    Standard Office Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={settings.officeStartTime}
                    onChange={(e) => setSettings({ ...settings, officeStartTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                  />
                  <span className="text-[11px] text-black/60 font-semibold">Check-in after this is flagged as Late</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    Standard Office End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={settings.officeEndTime}
                    onChange={(e) => setSettings({ ...settings, officeEndTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                  />
                  <span className="text-[11px] text-black/60 font-semibold">Official close of business</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    Late Grace Window (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    required
                    value={settings.lateGraceMinutes}
                    onChange={(e) =>
                      setSettings({ ...settings, lateGraceMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                  />
                  <span className="text-[11px] text-black/60 font-semibold">e.g. 15 mins allows up to 09:15 AM</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    Max Daily Break (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    required
                    value={settings.maxBreakMinutes}
                    onChange={(e) =>
                      setSettings({ ...settings, maxBreakMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                  />
                  <span className="text-[11px] text-black/60 font-semibold">Lunch + coffee allowance</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Default Annual Leave Days Allowance *
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  required
                  value={settings.defaultLeaveAllowance}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultLeaveAllowance: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Client Meeting Link
                  <span className="ml-2 text-[10px] font-bold text-black/50 normal-case tracking-normal">Optional — shown to clients on project confirmation</span>
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={settings.meetingLink || ''}
                  onChange={(e) => setSettings({ ...settings, meetingLink: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                />
              </div>

              <div className="pt-3 border-t border-gold-200 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black text-xs font-bold rounded-lg border border-gold-600 shadow-xs transition-colors disabled:opacity-50 cursor-pointer btn-hover-lift"
                >
                  <Save className="h-4 w-4" />
                  {savingSettings ? 'Saving Policies...' : 'Save Global Policies'}
                </button>
              </div>
            </form>
          </div>

          {/* Push Notifications Configuration Card */}
          <div className="bg-white rounded-xl border border-gold-300 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gold-200 pb-3">
              <h2 className="text-base font-extrabold text-black flex items-center gap-2">
                <Bell className="h-5 w-5 text-gold-600 stroke-[2.5]" />
                Firebase Cloud Messaging & Push Alerts
              </h2>
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  pushStatus.isSubscribed
                    ? 'bg-gold-200 text-black border border-gold-400'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {pushStatus.isSubscribed ? 'Subscribed' : 'Action Required'}
              </span>
            </div>

            <p className="text-xs text-black/70 font-medium leading-relaxed">
              Firebase Cloud Messaging (FCM) enables background push alerts even when the browser tab is closed. Notifications are automatically triggered on task assignments, leave reviews, and chat mentions.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleEnablePush}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black text-xs font-bold rounded-lg border border-gold-600 shadow-xs transition-colors cursor-pointer btn-hover-lift"
              >
                <Bell className="h-4 w-4" />
                {pushStatus.isSubscribed ? 'Refresh FCM Token' : 'Enable FCM Notifications'}
              </button>

              {pushStatus.isSubscribed && (
                <button
                  type="button"
                  disabled={testingPush}
                  onClick={handleTestFcmPush}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-gold-100 hover:bg-gold-200 text-black text-xs font-bold rounded-lg border border-gold-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5 text-gold-700" />
                  {testingPush ? 'Sending Test...' : 'Send Test Push Alert'}
                </button>
              )}
            </div>

            {pushFeedback && (
              <p className="text-xs text-black font-semibold bg-gold-50 border border-gold-300 p-2.5 rounded-lg">
                {pushFeedback}
              </p>
            )}
          </div>
        </div>

        {/* Right: Employee Schedule Overrides Table */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-xl border border-gold-300 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gold-200 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-black flex items-center gap-2">
                  <Users className="h-5 w-5 text-gold-600 stroke-[2.5]" />
                  Custom Shift & Schedule Overrides
                </h2>
                <p className="text-xs text-black/60 font-medium mt-0.5">
                  Individual schedules for remote workers, night shifts, or flexi-time
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddOverride}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gold-500 hover:bg-gold-600 text-black text-xs font-bold rounded-lg border border-gold-600 shadow-xs transition-colors cursor-pointer btn-hover-lift"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                Add Override
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-black/60">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-3 border-gold-600 border-t-transparent mb-2" />
                <p className="text-xs font-bold">Loading overrides...</p>
              </div>
            ) : overrides.length === 0 ? (
              <div className="p-8 text-center text-black/50 border border-dashed border-gold-300 rounded-xl bg-gold-50/20">
                <Clock className="h-8 w-8 text-gold-400 mx-auto mb-2" />
                <h3 className="text-sm font-extrabold text-black">No custom shift overrides</h3>
                <p className="text-xs mt-1 font-medium">
                  All team members currently follow standard office hours ({settings.officeStartTime} -{' '}
                  {settings.officeEndTime}).
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {overrides.map((ovr) => {
                  const emp = ovr.user || users.find((u) => u.id === ovr.userId);

                  return (
                    <div
                      key={ovr.id}
                      className="p-4 rounded-xl border border-gold-300 bg-gold-50/40 hover:bg-gold-50 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-black">
                            {emp?.name || 'Employee'}
                          </span>
                          <span className="text-[11px] font-extrabold px-2 py-0.5 bg-gold-200 text-black rounded border border-gold-400">
                            {ovr.customStartTime || (ovr as any).officeStartTime} –{' '}
                            {ovr.customEndTime || (ovr as any).officeEndTime}
                          </span>
                        </div>
                        <div className="text-[11px] text-black/70 font-medium">
                          {ovr.notes ? <span className="italic">"{ovr.notes}"</span> : 'Custom shift agreement'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteOverride(ovr.userId, emp?.name)}
                        className="p-1.5 text-black/40 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Override"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gold-300 space-y-4">
            <div className="flex items-center justify-between border-b border-gold-200 pb-3">
              <h2 className="text-lg font-extrabold text-black flex items-center gap-2">
                <Clock className="h-5 w-5 text-gold-600 stroke-[2.5]" />
                Set Employee Shift Override
              </h2>
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="p-1 text-black/50 hover:text-black rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {overrideError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg">
                {overrideError}
              </div>
            )}

            <form onSubmit={handleSubmitOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Select Employee *
                </label>
                <select
                  required
                  value={overrideForm.userId}
                  onChange={(e) => setOverrideForm({ ...overrideForm, userId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                >
                  <option value="" disabled>
                    Select Employee
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={overrideForm.officeStartTime}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, officeStartTime: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={overrideForm.officeEndTime}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, officeEndTime: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Custom Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={overrideForm.lateGraceMinutes}
                  onChange={(e) =>
                    setOverrideForm({ ...overrideForm, lateGraceMinutes: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved night shift / timezone coordination"
                  value={overrideForm.notes}
                  onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-black bg-gold-100 hover:bg-gold-200 border border-gold-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideLoading}
                  className="px-4 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs btn-hover-lift"
                >
                  {overrideLoading ? 'Applying...' : 'Save Shift Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
