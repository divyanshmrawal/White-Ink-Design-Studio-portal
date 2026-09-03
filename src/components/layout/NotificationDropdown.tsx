import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  FolderKanban,
  FileCheck,
  ExternalLink,
  Calendar,
  Award,
  MessageSquare,
} from 'lucide-react';
import { api } from '../../services/api';
import { Notification, NotificationType } from '../../types';

interface NotificationDropdownProps {
  onNavigate?: (path: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotificationClick = (item: Notification) => {
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }
    if (item.linkUrl && onNavigate) {
      onNavigate(item.linkUrl);
      setIsOpen(false);
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'APPROVAL_REQUESTED':
      case 'APPROVAL_RESOLVED':
        return <FileCheck className="h-4 w-4 text-amber-600" />;
      case 'TASK_ASSIGNED':
      case 'TASK_STATUS':
        return <CheckCircle className="h-4 w-4 text-indigo-600" />;
      case 'PROJECT_ASSIGNED':
        return <FolderKanban className="h-4 w-4 text-blue-600" />;
      case 'MILESTONE_DUE':
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      case 'ATTENDANCE_ALERT':
        return <Clock className="h-4 w-4 text-emerald-600" />;
      case 'LEAVE_REQUESTED':
      case 'LEAVE_RESOLVED':
        return <Calendar className="h-4 w-4 text-purple-600" />;
      case 'PERFORMANCE_REVIEW':
        return <Award className="h-4 w-4 text-teal-600" />;
      case 'CHAT_MENTION':
        return <MessageSquare className="h-4 w-4 text-sky-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTimeAgo = (isoDate: string) => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-black hover:bg-gold-600/20 rounded-lg transition-colors cursor-pointer"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-black px-1 text-[10px] font-extrabold text-gold-400 ring-2 ring-gold-400">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border-2 border-gold-300 py-0 z-50 overflow-hidden animate-gold-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gold-200 bg-gold-50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-black">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-extrabold bg-gold-200 text-black rounded-full border border-gold-400">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs text-black hover:text-gold-800 font-bold cursor-pointer flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gold-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-black/70">
                <Bell className="h-8 w-8 mx-auto text-gold-500 mb-2" />
                <p className="text-sm font-bold text-black">No notifications yet</p>
                <p className="text-xs text-black/60 mt-0.5">
                  You're all caught up with projects and tasks!
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-gold-50/80 transition-colors cursor-pointer ${
                    !item.isRead ? 'bg-gold-50/40 border-l-3 border-gold-500' : ''
                  }`}
                >
                  <div className="mt-0.5 p-1.5 bg-gold-100/70 border border-gold-300 rounded-lg shrink-0">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`text-xs truncate ${
                          !item.isRead ? 'text-black font-extrabold' : 'text-black/80 font-semibold'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-black/60 font-medium shrink-0">
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-black/80 line-clamp-2 leading-relaxed font-normal">
                      {item.message}
                    </p>
                    {item.linkUrl && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-black font-bold mt-1.5 hover:text-gold-700 hover:underline">
                        View details <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="p-1 text-gold-600 hover:text-gold-800 hover:bg-gold-100 rounded"
                        title="Mark as read"
                      >
                        <span className="h-2 w-2 rounded-full bg-gold-600 block" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1 text-black/40 hover:text-black hover:bg-gold-200 rounded transition-colors"
                      title="Dismiss"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
