/**
 * BOTB Notification Bell
 * ======================
 * Navbar notification icon with unread badge and dropdown panel.
 * Polls for notifications every 30s when wallet is connected.
 * Shows application status updates (approved/rejected) and
 * future platform notifications (battle results, governance, etc.).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell, CheckCircle, XCircle, X, Check,
  ChevronRight, Loader2,
} from "lucide-react";
import { useWallet } from "./wallet-context";
import { api } from "../lib/api";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Notification {
  id: string;
  wallet: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  athleteId?: string;
  applicationId?: string;
}

const POLL_INTERVAL = 30_000; // 30 seconds

// ---------------------------------------------------------------------------
// Notification Icon Map
// ---------------------------------------------------------------------------
function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "application_approved":
      return <CheckCircle className="w-4 h-4 text-[#10b981] shrink-0" />;
    case "application_rejected":
      return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
    default:
      return <Bell className="w-4 h-4 text-[#6AA3E0] shrink-0" />;
  }
}

// ---------------------------------------------------------------------------
// Time Ago
// ---------------------------------------------------------------------------
function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function NotificationBell() {
  const { connected, accountId } = useWallet();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(0);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Fetch notifications ──────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!accountId) return;
    try {
      const res = await api.getNotifications(accountId);
      if (res.success && res.data) {
        setNotifications(res.data);
        // Toast for newly received notifications
        const newUnread = res.data.filter((n: Notification) => !n.read).length;
        if (newUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
          const newest = res.data.find((n: Notification) => !n.read);
          if (newest && prevUnreadRef.current > 0) {
            toast.info(newest.title, { description: newest.message.substring(0, 80) + "..." });
          }
        }
        prevUnreadRef.current = newUnread;
      }
    } catch (err) {
      console.error("[Notifications] Fetch error:", err);
    }
  }, [accountId]);

  // ── Poll on interval ─────────────────────────────────────────────────
  useEffect(() => {
    if (!connected || !accountId) {
      setNotifications([]);
      prevUnreadRef.current = 0;
      return;
    }

    // Initial fetch
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));

    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [connected, accountId, fetchNotifications]);

  // ── Close on outside click ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => setIsOpen(false);
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen]);

  // ── Actions ──────────────────────────────────────────────────────────
  const markRead = async (notifId: string) => {
    if (!accountId) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    await api.markNotificationRead(accountId, notifId);
  };

  const markAllRead = async () => {
    if (!accountId) return;
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await api.markAllNotificationsRead(accountId);
    setMarkingAll(false);
  };

  const dismiss = async (notifId: string) => {
    if (!accountId) return;
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    await api.dismissNotification(accountId, notifId);
  };

  // Don't render if not connected
  if (!connected) return null;

  return (
    <div className="relative">
      {/* ── Bell Button ── */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-[#8494A7] hover:text-[#E8ECF0] hover:bg-[#4274B9]/10 transition-all"
        aria-label="Notifications"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#4274B9] text-white text-[0.55rem] font-bold px-1 border-2 border-[#0B1120]"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed sm:absolute right-2 sm:right-0 mt-2 w-[calc(100vw-16px)] sm:w-96 max-w-96 rounded-xl border border-[#4274B9]/20 shadow-2xl overflow-hidden"
            style={{
              zIndex: 99998,
              background: "rgba(11, 17, 32, 0.98)",
              backdropFilter: "blur(30px)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#4274B9]/10">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#4274B9]" />
                <span
                  className="text-[#E8ECF0] text-xs font-bold tracking-wider"
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}
                >
                  NOTIFICATIONS
                </span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#4274B9]/15 text-[#6AA3E0] text-[0.55rem] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={markingAll}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[0.55rem] text-[#6AA3E0] hover:bg-[#4274B9]/10 transition-all"
                  >
                    {markingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Read all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded text-[#8494A7] hover:text-[#E8ECF0] hover:bg-white/5 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
              {loading && notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Loader2 className="w-5 h-5 text-[#4274B9] animate-spin mx-auto mb-2" />
                  <p className="text-[#8494A7] text-xs">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Bell className="w-8 h-8 text-[#4274B9]/15 mx-auto mb-2" />
                  <p className="text-[#8494A7] text-xs">No notifications yet</p>
                  <p className="text-[#8494A7]/50 text-[0.6rem] mt-1">
                    You'll be notified when your application is reviewed
                  </p>
                </div>
              ) : (
                <div>
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`group relative px-4 py-3 border-b border-[#4274B9]/5 transition-all hover:bg-[#162033]/50 ${
                        !notif.read ? "bg-[#4274B9]/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`mt-0.5 p-1.5 rounded-lg ${
                          notif.type === "application_approved" ? "bg-[#10b981]/10" :
                          notif.type === "application_rejected" ? "bg-red-500/10" :
                          "bg-[#4274B9]/10"
                        }`}>
                          <NotificationIcon type={notif.type} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={`text-xs font-semibold truncate ${
                              !notif.read ? "text-[#E8ECF0]" : "text-[#8494A7]"
                            }`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-[#4274B9] shrink-0" />
                            )}
                          </div>
                          <p className="text-[0.7rem] text-[#8494A7] leading-relaxed line-clamp-2">
                            {notif.message}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[0.55rem] text-[#8494A7]/50">
                              {timeAgo(notif.createdAt)}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notif.read && (
                                <button
                                  onClick={() => markRead(notif.id)}
                                  className="px-1.5 py-0.5 rounded text-[0.5rem] text-[#6AA3E0] hover:bg-[#4274B9]/10 transition-all"
                                >
                                  Mark read
                                </button>
                              )}
                              <button
                                onClick={() => dismiss(notif.id)}
                                className="px-1.5 py-0.5 rounded text-[0.5rem] text-[#8494A7] hover:text-red-400 hover:bg-red-500/10 transition-all"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                          {/* Action link for approved */}
                          {notif.type === "application_approved" && notif.athleteId && (
                            <a
                              href="/athletes"
                              className="inline-flex items-center gap-1 mt-1.5 text-[0.6rem] text-[#4274B9] hover:text-[#6AA3E0] transition-colors"
                            >
                              View your profile on the roster <ChevronRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-[#4274B9]/10 text-center">
                <p className="text-[0.55rem] text-[#8494A7]/40">
                  {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
