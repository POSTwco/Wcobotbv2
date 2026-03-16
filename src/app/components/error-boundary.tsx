/**
 * BOTB Production Error Boundary & Error UI Components
 * =====================================================
 * Web3-grade error handling with brand-consistent UI.
 *
 * Components:
 *   - ErrorBoundary: React class component catching render crashes
 *   - RouteErrorPage: For React Router errorElement (catches loader/render errors)
 *   - NotFoundPage: Branded 404
 *   - ErrorCard: Reusable inline error display for sections/widgets
 *   - RetryableError: Error card with retry button
 *
 * Security:
 *   - NEVER exposes raw error messages, stack traces, or internal paths
 *   - All user-facing messages are sanitized through sanitizeErrorMessage()
 *   - Technical details only logged to console (dev/ops)
 */

import React from "react";
import { Link, useRouteError, isRouteErrorResponse } from "react-router";
import { motion } from "motion/react";
import {
  AlertTriangle, RefreshCw, Home, ArrowLeft, Shield,
  WifiOff, ServerCrash, Ban, Lock, Clock,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Error Message Sanitizer — NEVER expose internals to the user
// ---------------------------------------------------------------------------

const SENSITIVE_PATTERNS = [
  /supabase/i,
  /postgres/i,
  /kv_store/i,
  /internal server/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /at\s+\w+\s+\(/i,       // stack trace lines
  /node_modules/i,
  /TypeError:/i,
  /ReferenceError:/i,
  /Cannot read prop/i,
  /undefined is not/i,
  /\.tsx?:\d+/i,           // file:line references
  /webpack/i,
  /chunk/i,
  /\/functions\//i,
  /Bearer\s+ey/i,          // JWT tokens
  /0\.0\.\d{4,}/,          // Hedera account IDs in error context
  /secret/i,
  /password/i,
  /key\s*[=:]/i,
];

/** Map known error codes/patterns to user-friendly messages */
const FRIENDLY_MESSAGES: Record<string, string> = {
  "Failed to fetch": "Unable to reach the server. Please check your connection and try again.",
  "NetworkError": "Network connection lost. Please check your internet and retry.",
  "Load failed": "Unable to load data from the server. Please try again.",
  "HTTP 401": "Your session has expired. Please reconnect your wallet.",
  "HTTP 403": "You don't have permission for this action.",
  "HTTP 404": "The requested resource was not found.",
  "HTTP 429": "Too many requests. Please wait a moment before trying again.",
  "HTTP 500": "Something went wrong on our end. Our team has been notified.",
  "HTTP 502": "The server is temporarily unavailable. Please try again shortly.",
  "HTTP 503": "Service is under maintenance. Please check back in a few minutes.",
  "AbortError": "The request took too long and was cancelled. Please try again.",
  "timeout": "Request timed out. Please check your connection and try again.",
};

export function sanitizeErrorMessage(raw: unknown): string {
  const message = typeof raw === "string"
    ? raw
    : raw instanceof Error
      ? raw.message
      : "An unexpected error occurred.";

  // Check for known friendly mappings first
  for (const [pattern, friendly] of Object.entries(FRIENDLY_MESSAGES)) {
    if (message.includes(pattern)) return friendly;
  }

  // If the message matches ANY sensitive pattern, replace entirely
  for (const re of SENSITIVE_PATTERNS) {
    if (re.test(message)) {
      console.error("[BOTB Error Sanitizer] Suppressed sensitive error:", message);
      return "Something went wrong. Please try again or contact support.";
    }
  }

  // If message is too long (likely a dump), truncate
  if (message.length > 200) {
    return "An error occurred while processing your request. Please try again.";
  }

  return message;
}

// ---------------------------------------------------------------------------
// Shared Styles
// ---------------------------------------------------------------------------

const ORBITRON = { fontFamily: "Orbitron, sans-serif" } as const;
const DM_SANS = { fontFamily: "'DM Sans', sans-serif" } as const;

function ErrorShield({ size = "lg" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "w-20 h-20" : size === "md" ? "w-14 h-14" : "w-10 h-10";
  return (
    <div className={`${dims} mx-auto mb-4 relative`}>
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-[#4274B9]/20 rounded-2xl blur-xl" />
      <div className="relative w-full h-full rounded-2xl bg-[#111827] border border-red-500/20 flex items-center justify-center">
        <Shield className={`${size === "lg" ? "w-10 h-10" : size === "md" ? "w-7 h-7" : "w-5 h-5"} text-red-400/80`} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// React Error Boundary (class component — catches render errors)
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log full details for debugging — NEVER expose to UI
    console.error("[BOTB Error Boundary] Caught render error:", error);
    console.error("[BOTB Error Boundary] Component stack:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <ErrorShield size="lg" />
            <h2 className="text-xl text-[#E8ECF0] mb-3" style={ORBITRON}>
              SOMETHING WENT WRONG
            </h2>
            <p className="text-[#8494A7] text-sm mb-6" style={DM_SANS}>
              An unexpected error occurred while rendering this section.
              Please refresh the page or navigate back.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#4274B9] text-white rounded-xl hover:bg-[#3563A0] transition-all text-sm"
                style={ORBITRON}
              >
                <RefreshCw className="w-4 h-4" /> REFRESH
              </button>
              <Link
                to="/"
                className="flex items-center gap-2 px-5 py-2.5 border border-[#4274B9]/30 text-[#4274B9] rounded-xl hover:bg-[#4274B9]/10 transition-all text-sm"
                style={ORBITRON}
              >
                <Home className="w-4 h-4" /> HOME
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Route Error Page — used as errorElement in React Router
// ---------------------------------------------------------------------------

export function RouteErrorPage() {
  const error = useRouteError();

  // Log full error for debugging
  console.error("[BOTB Route Error]", error);

  let status = 500;
  let title = "SOMETHING WENT WRONG";
  let description = "An unexpected error occurred. Please try again or return to the homepage.";
  let icon = <ServerCrash className="w-10 h-10 text-red-400/80" />;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    switch (error.status) {
      case 404:
        title = "PAGE NOT FOUND";
        description = "The page you're looking for doesn't exist or has been moved.";
        icon = <Ban className="w-10 h-10 text-[#8494A7]" />;
        break;
      case 401:
        title = "UNAUTHORIZED";
        description = "You need to connect your wallet to access this page.";
        icon = <Lock className="w-10 h-10 text-[#f59e0b]" />;
        break;
      case 403:
        title = "ACCESS DENIED";
        description = "You don't have permission to view this resource.";
        icon = <Shield className="w-10 h-10 text-red-400/80" />;
        break;
      case 503:
        title = "MAINTENANCE MODE";
        description = "We're performing scheduled maintenance. Please check back shortly.";
        icon = <Clock className="w-10 h-10 text-[#6AA3E0]" />;
        break;
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#E8ECF0] flex items-center justify-center px-4" style={DM_SANS}>
      {/* Background grid */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: "linear-gradient(#4274B9 1px, transparent 1px), linear-gradient(90deg, #4274B9 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full text-center relative"
      >
        {/* Status code */}
        <div className="text-[120px] font-black leading-none text-[#111827] select-none mb-[-40px]" style={ORBITRON}>
          {status}
        </div>

        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-[#4274B9]/20 rounded-2xl blur-xl" />
          <div className="relative w-full h-full rounded-2xl bg-[#111827] border border-[#4274B9]/10 flex items-center justify-center">
            {icon}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl mb-3 tracking-wider" style={ORBITRON}>
          <span className="bg-gradient-to-r from-red-400 to-[#6AA3E0] bg-clip-text text-transparent">{title}</span>
        </h1>
        <p className="text-[#8494A7] text-sm sm:text-base mb-8 max-w-md mx-auto">
          {description}
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 border border-[#4274B9]/30 text-[#4274B9] rounded-xl hover:bg-[#4274B9]/10 transition-all text-sm"
            style={ORBITRON}
          >
            <ArrowLeft className="w-4 h-4" /> GO BACK
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4274B9] text-white rounded-xl hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25 transition-all text-sm"
            style={ORBITRON}
          >
            <Home className="w-4 h-4" /> HOMEPAGE
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-5 py-2.5 border border-[#4274B9]/30 text-[#8494A7] rounded-xl hover:bg-[#4274B9]/10 hover:text-[#E8ECF0] transition-all text-sm"
            style={ORBITRON}
          >
            <RefreshCw className="w-4 h-4" /> RETRY
          </button>
        </div>

        {/* BOTB branding */}
        <div className="mt-12 text-[#8494A7]/30 text-xs" style={ORBITRON}>
          BATTLE OF THE BARS &mdash; POWERED BY HEDERA
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Not Found Page (dedicated 404 with branded aesthetic)
// ---------------------------------------------------------------------------

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center"
      >
        <div className="text-[100px] font-black leading-none text-[#111827] select-none mb-[-30px]" style={ORBITRON}>
          404
        </div>
        <ErrorShield size="lg" />
        <h2 className="text-2xl mb-3" style={ORBITRON}>
          <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">
            PAGE NOT FOUND
          </span>
        </h2>
        <p className="text-[#8494A7] mb-8 text-sm" style={DM_SANS}>
          This page doesn't exist in the arena. It may have been removed or the URL is incorrect.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 border border-[#4274B9]/30 text-[#4274B9] rounded-xl hover:bg-[#4274B9]/10 transition-all text-sm"
            style={ORBITRON}
          >
            <ArrowLeft className="w-4 h-4" /> GO BACK
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4274B9] text-white rounded-xl hover:bg-[#3563A0] transition-all text-sm"
            style={ORBITRON}
          >
            <Home className="w-4 h-4" /> HOMEPAGE
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Error Card — for embedding inside pages/sections
// ---------------------------------------------------------------------------

interface ErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorCard({
  title = "Failed to Load",
  message = "Something went wrong while loading this section.",
  onRetry,
  compact = false,
}: ErrorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-red-500/15 bg-red-500/[0.04] ${compact ? "p-3" : "p-6"} text-center`}
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <AlertTriangle className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-red-400/70`} />
        <span
          className={`text-[#E8ECF0] ${compact ? "text-xs" : "text-sm"} font-bold tracking-wider`}
          style={ORBITRON}
        >
          {title.toUpperCase()}
        </span>
      </div>
      <p className={`text-[#8494A7] ${compact ? "text-xs" : "text-sm"} mb-3`} style={DM_SANS}>
        {sanitizeErrorMessage(message)}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#4274B9]/10 border border-[#4274B9]/20 text-[#4274B9] rounded-lg hover:bg-[#4274B9]/20 transition-all text-xs"
          style={ORBITRON}
        >
          <RefreshCw className="w-3 h-3" /> RETRY
        </button>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Network Error Banner — for connection loss
// ---------------------------------------------------------------------------

export function NetworkErrorBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3"
    >
      <WifiOff className="w-5 h-5 text-red-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[#E8ECF0] text-sm font-semibold" style={ORBITRON}>
          CONNECTION LOST
        </p>
        <p className="text-[#8494A7] text-xs" style={DM_SANS}>
          Unable to reach the server. Please check your internet connection.
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-xs"
          style={ORBITRON}
        >
          <RefreshCw className="w-3 h-3" /> RETRY
        </button>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Empty State — branded placeholder when data is legitimately empty
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-[#111827] border border-[#4274B9]/10 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-[#E8ECF0] text-lg mb-2" style={ORBITRON}>{title}</h3>
      {description && (
        <p className="text-[#8494A7] text-sm max-w-md" style={DM_SANS}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
