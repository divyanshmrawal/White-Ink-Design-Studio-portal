import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ChatMessage, User } from '../types';
import { triggerLocalNotification } from '../utils/pushNotifications';
import {
  MessageSquare,
  Send,
  Hash,
  AtSign,
  Trash2,
  Users,
  Building2,
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<{ id: string; name: string; type: 'internal' | 'client' }[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    let isMounted = true;
    api.getChatChannels()
      .then((chs) => {
        if (isMounted) {
          setChannels(chs);
          if (chs.length > 0 && !currentChannel) {
            setCurrentChannel(chs[0].id);
          }
        }
      })
      .catch((err) => console.error('Error fetching chat channels:', err));

    api.getUsers().then(setUsers).catch(() => []);
    return () => { isMounted = false; };
  }, []);

  const loadMessages = async (silent = false) => {
    if (!currentChannel) return;
    try {
      if (!silent) setLoading(true);
      const res = await api.getChatMessages(currentChannel);
      setMessages(res);
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentChannel) return;
    loadMessages();

    // Polling every 4 seconds for chat updates
    const interval = setInterval(() => {
      loadMessages(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [currentChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      setSending(true);
      const res = await api.postChatMessage({
        channel: currentChannel,
        content: textToSend,
      });

      const newMsg = res.chatMessage || res;
      setMessages((prev) => [...prev, newMsg]);
      scrollToBottom();

      // If mentions current user, trigger local notification
      if (textToSend.includes('@' + user?.name) || textToSend.includes('@all')) {
        triggerLocalNotification('New Workspace Mention', {
          body: `${user?.name || 'Someone'} mentioned you in #${currentChannel}`,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.deleteChatMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  const insertMention = (name: string) => {
    setInputText((prev) => `${prev} @${name} `);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row bg-white rounded-xl border border-gold-300 shadow-sm overflow-hidden">
      {/* Sidebar: Channels & Online Teammates */}
      <div className="w-full md:w-64 border-r border-gold-300 bg-gold-50/40 flex flex-col justify-between shrink-0">
        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <div className="text-xs font-extrabold text-black/60 uppercase tracking-wider px-2 mb-2">
              Channels
            </div>
            <div className="space-y-1">
              {channels.map((ch) => {
                const Icon = ch.type === 'client' ? Building2 : Hash;
                const isActive = currentChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setCurrentChannel(ch.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left border ${
                      isActive
                        ? 'bg-gold-500 border-gold-600 text-black shadow-xs'
                        : 'border-transparent text-black/70 hover:bg-gold-100 hover:text-black'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-black' : 'text-gold-700'}`} />
                    <span className="truncate">{ch.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-extrabold text-black/60 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
              <span>Team ({users.length})</span>
              <Users className="h-3.5 w-3.5 text-gold-600" />
            </div>
            <div className="space-y-1">
              {users.slice(0, 8).map((u) => (
                <div
                  key={u.id}
                  onClick={() => insertMention(u.name)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-black/80 hover:bg-gold-100 cursor-pointer transition-colors"
                  title="Click to tag in chat"
                >
                  <div className="w-5 h-5 rounded-full bg-gold-200 text-black border border-gold-400 flex items-center justify-center text-[10px] font-extrabold">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate flex-1 font-bold text-black">{u.name}</span>
                  <span className="text-[10px] text-black/50 font-semibold">@{u.role.slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-gold-200 bg-gold-100/50 text-[11px] text-black/70 font-medium flex items-center gap-1.5">
          <AtSign className="h-3.5 w-3.5 text-gold-700 stroke-[2.5]" />
          <span>Tip: Type @name or @all to notify</span>
        </div>
      </div>

      {/* Main Chat Stream */}
      <div className="flex-1 flex flex-col justify-between bg-white min-w-0">
        {/* Chat Channel Header */}
        {(() => {
          const activeChannel = channels.find((c) => c.id === currentChannel);
          const HeaderIcon = activeChannel?.type === 'client' ? Building2 : Hash;
          return (
            <div className="px-6 py-3.5 border-b border-gold-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <HeaderIcon className="h-5 w-5 text-gold-600 stroke-[2.5]" />
                <div>
                  <h2 className="text-sm font-extrabold text-black">
                    {activeChannel ? activeChannel.name : currentChannel ? `#${currentChannel}` : 'Select a channel'}
                  </h2>
                  <p className="text-[11px] text-black/60 font-medium">
                    {activeChannel?.type === 'client' ? 'Client workspace channel' : 'Internal team & staff channel'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => insertMention('all')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gold-100 hover:bg-gold-200 text-black border border-gold-300 transition-colors cursor-pointer shadow-2xs"
                >
                  Tag @all
                </button>
              </div>
            </div>
          );
        })()}

        {/* Message History */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="p-12 text-center text-black/60">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-3 border-gold-600 border-t-transparent mb-2" />
              <p className="text-xs font-bold">Loading channel messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center text-black/50">
              <MessageSquare className="h-8 w-8 text-gold-500 mx-auto mb-2" />
              <h3 className="text-sm font-extrabold text-black">
                No messages in {channels.find((c) => c.id === currentChannel)?.name || currentChannel || 'channel'}
              </h3>
              <p className="text-xs mt-1 font-medium">Be the first to post a message or start a discussion.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const senderId = msg.senderId || (msg as any).userId;
              const sender = msg.sender || (msg as any).user;
              const content = msg.content || (msg as any).message;
              const isMe = senderId === user?.id;
              const canDelete = isMe || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

              return (
                <div key={msg.id} className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-gold-200 border border-gold-400 flex items-center justify-center text-black font-extrabold text-xs shrink-0 mt-0.5">
                    {sender?.name
                      ? sender.name
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                      : 'U'}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-black">
                        {sender?.name || 'Teammate'}
                      </span>
                      <span className="text-[10px] text-black/50 font-medium">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-black/40 hover:text-rose-600 rounded transition-opacity cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <div className="text-sm text-black leading-relaxed bg-gold-50/70 hover:bg-gold-50/90 p-3 rounded-xl border border-gold-200 whitespace-pre-wrap font-medium">
                      {content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gold-200 bg-gold-50/30">
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gold-300 focus-within:ring-2 focus-within:ring-gold-500 focus-within:border-gold-500 shadow-xs">
            <input
              type="text"
              placeholder={`Message ${channels.find((c) => c.id === currentChannel)?.name || currentChannel || 'channel'}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-2 py-1 text-sm bg-transparent border-none focus:outline-hidden text-black placeholder:text-black/40 font-medium"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="p-2.5 bg-gold-500 hover:bg-gold-600 text-black border border-gold-600 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs btn-hover-lift"
            >
              <Send className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
