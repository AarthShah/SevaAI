import React, { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { Link } from 'react-router-dom';

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-xl ring-1 ring-black/5 z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h4 className="text-sm font-semibold text-slate-800">Civic Alerts & Notices</h4>
            <span className="text-xs text-slate-500">{unreadCount} unread</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 text-xs transition-colors flex items-start justify-between ${
                    n.read ? 'bg-white text-slate-600' : 'bg-blue-50/50 text-slate-900 font-medium'
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <p>{n.message}</p>
                    {n.complaint_id && (
                      <Link
                        to={`/track/${n.complaint_id}`}
                        onClick={() => setOpen(false)}
                        className="inline-block mt-1 text-emerald-600 font-semibold hover:underline"
                      >
                        View Complaint #{n.complaint_id} →
                      </Link>
                    )}
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      title="Mark as read"
                      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-emerald-600"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
