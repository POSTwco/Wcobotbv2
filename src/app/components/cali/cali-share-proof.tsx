/**
 * CaliShareProof — WCO branded workout proof / receipt / sports card generator.
 * Pure client-side canvas. Aesthetic rebuild for premium 2026 sports card look.
 * Uses fist for small header brand.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Download, Share2, Award, Camera, Upload, Trash2, Copy, Check, RefreshCw,
  Grid3x3, Timer, Flashlight, FlipHorizontal2, ZoomIn, RotateCcw,
} from "lucide-react";
import fistLogo from "../../../assets/brand/fist-wco.jpg";
import { api } from "../../lib/api";
import { mergeProofData } from "../../lib/cali-share-proof-data";
import { buildWorkoutShareCaption, CONTEST_TRACKING_HASHTAG } from "../contest/contest-copy";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

// Brand colors (match celebration + global)
const COLORS = {
  navy: "#0B1120",
  gold: "#D4A843",
  blue: "#4274B9",
  blueLight: "#6AA3E0",
  white: "#FFFFFF",
  slate: "#A3B0C2",
  darkSlate: "#162033",
};

interface ProofData {
  level: 1 | 2 | 3;
  completedAt: string;
  totalSets: number;
  uniqueExercises: number;
  /** Lifetime PR count */
  prCount: number;
  /** PRs set in this session (optional badge) */
  prHitThisSession?: number;
  athleteScore: number;
  athleteTier: string;
  streak: number;
  workoutId?: string;
  topMoves?: string[];
  pushCount?: number;
  pullCount?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Real workout snapshot — undefined fields are ignored (no placeholder clobber) */
  data?: Partial<ProofData>;
}

/** Empty baseline — never invent demo streaks/PRs for real workouts */
const EMPTY_PROOF: ProofData = {
  level: 1,
  completedAt: new Date().toISOString(),
  totalSets: 0,
  uniqueExercises: 0,
  prCount: 0,
  prHitThisSession: 0,
  athleteScore: 0,
  athleteTier: "UNRANKED",
  streak: 0,
  topMoves: [],
  pushCount: 0,
  pullCount: 0,
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
      " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "TODAY";
  }
}

/** Full-bleed cover draw with user zoom (1–3) and pan (−1..1). Fixes uncontrolled punch-in. */
function drawImageCoverTransform(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
  zoom: number,
  panX: number,
  panY: number,
) {
  const z = Math.max(1, Math.min(3, zoom));
  const baseScale = Math.max(W / img.width, H / img.height);
  const scale = baseScale * z;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const maxPanX = Math.max(0, (dw - W) / 2);
  const maxPanY = Math.max(0, (dh - H) / 2);
  const dx = (W - dw) / 2 + Math.max(-1, Math.min(1, panX)) * maxPanX;
  const dy = (H - dh) / 2 + Math.max(-1, Math.min(1, panY)) * maxPanY;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function CaliShareProof({ open, onClose, data }: Props) {
  const [mode, setMode] = useState<"receipt" | "selfie">("receipt");
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fistRef = useRef<HTMLImageElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getLevelLabel = (level: number): string => {
    if (level === 1) return "BEGINNER";
    if (level === 2) return "INTERMEDIATE";
    return "ADVANCED";
  };
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [customCaption, setCustomCaption] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  /** Contest entry # for auto-caption (loaded when modal opens) */
  const [contestEntryNumber, setContestEntryNumber] = useState<number | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  // Ultimate selfie studio
  const [photoZoom, setPhotoZoom] = useState(1); // 1.0–3.0
  const [photoPan, setPhotoPan] = useState({ x: 0, y: 0 }); // −1..1
  const [mirrorPreview, setMirrorPreview] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [timerSec, setTimerSec] = useState<0 | 3 | 5>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const panDragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const proof: ProofData = mergeProofData(EMPTY_PROOF, data ?? null);

  // === Camera functions (must be declared early to avoid TDZ in effects that list them in deps) ===
  const startCamera = useCallback(async (requestedMode?: "user" | "environment") => {
    const mode = requestedMode || facingMode;
    setShareError(null);
    setTorchOn(false);
    setTorchSupported(false);
    try {
      // Stop prior stream cleanly before requesting a new one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setFacingMode(mode);
      // Detect torch capability (usually rear camera only)
      try {
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(Boolean(caps && "torch" in caps && caps.torch));
      } catch {
        setTorchSupported(false);
      }
      setIsCameraOpen(true); // render the <video> element first
    } catch (err: any) {
      console.error("Camera error:", err);
      let msg = "Could not access camera. Please check permissions or try choosing a photo instead.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Camera permission denied. Allow camera access in your browser settings and try again.";
      } else if (err.name === "NotFoundError") {
        msg = "No camera found on this device.";
      }
      setShareError(msg);
      setTimeout(() => setShareError(null), 4000);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
    setTorchOn(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  }, []);

  const setTorch = useCallback(async (on: boolean) => {
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorchOn(on);
    } catch (e) {
      console.warn("Torch not available:", e);
      setTorchSupported(false);
      setTorchOn(false);
    }
  }, []);

  const captureFromCamera = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    // Capture full frame; zoom/pan applied in drawSportsCard so post-snap reframe works
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = vw;
    tempCanvas.height = vh;
    const ctx = tempCanvas.getContext("2d");
    if (ctx) {
      const shouldMirror = mirrorPreview && facingMode === "user";
      if (shouldMirror) {
        ctx.translate(vw, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, vw, vh);
      const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.92);
      const img = new Image();
      img.onload = () => {
        photoRef.current = img;
        setPhotoSrc(dataUrl);
        stopCamera();
      };
      img.src = dataUrl;
    }
  }, [stopCamera, mirrorPreview, facingMode]);

  const snapWithTimer = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (timerSec === 0) {
      captureFromCamera();
      return;
    }
    let n = timerSec;
    setCountdown(n);
    countdownTimerRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
        captureFromCamera();
      } else {
        setCountdown(n);
      }
    }, 1000);
  }, [timerSec, captureFromCamera]);

  const toggleCamera = useCallback(() => {
    const newMode = facingMode === "user" ? "environment" : "user";
    if (isCameraOpen) {
      stopCamera();
      setTimeout(() => {
        startCamera(newMode);
      }, 150);
    } else {
      startCamera(newMode);
    }
  }, [facingMode, isCameraOpen, stopCamera, startCamera]);

  const cycleTimer = useCallback(() => {
    setTimerSec((t) => (t === 0 ? 3 : t === 3 ? 5 : 0));
  }, []);

  const retakePhoto = useCallback(() => {
    photoRef.current = null;
    setPhotoSrc(null);
    setPhotoZoom(1);
    setPhotoPan({ x: 0, y: 0 });
    startCamera(facingMode);
  }, [startCamera, facingMode]);

  // Preload fist logo once
  useEffect(() => {
    if (fistRef.current) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      fistRef.current = img;
      draw();
    };
    img.src = fistLogo as unknown as string;
  }, []);

  // Redraw on open, mode, data, photo, caption, or crop transform change
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => draw(), 40);
      return () => clearTimeout(t);
    }
  }, [open, mode, proof.level, proof.totalSets, proof.athleteTier, photoSrc, customCaption, photoZoom, photoPan.x, photoPan.y]);

  // Reset custom caption + errors/feedback when modal closes (polish)
  useEffect(() => {
    if (!open) {
      setCustomCaption("");
      setShareError(null);
      setShareFeedback(null);
      setCopied(false);
      setPhotoZoom(1);
      setPhotoPan({ x: 0, y: 0 });
      setCountdown(null);
      setContestEntryNumber(null);
      if (isCameraOpen) stopCamera();
    }
  }, [open, isCameraOpen]);  // stopCamera is stable, no need in deps

  // Load contest entry # for auto social caption (tracking + personalization)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const token = sessionStorage.getItem("wcoWalletSessionToken");
        if (!token) return;
        const res = await api.contest.me(token);
        if (cancelled) return;
        if (res.success && res.data?.entered && res.data.entryNumber) {
          setContestEntryNumber(res.data.entryNumber);
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Attach stream to <video> element AFTER it has been mounted in the DOM
  useEffect(() => {
    const videoEl = videoRef.current;
    const currentStream = streamRef.current;

    if (isCameraOpen && videoEl && currentStream) {
      videoEl.srcObject = currentStream;

      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Video autoplay/play failed (will retry on user gesture if needed):", err);
        });
      }
    }
  }, [isCameraOpen]);

  // Photo handlers - defined inside component so they can use state/refs (premium fix)
  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        photoRef.current = img;
        setPhotoSrc(src);
        setPhotoZoom(1);
        setPhotoPan({ x: 0, y: 0 });
      };
      img.onerror = () => {
        setShareError("Failed to load photo. Please try a different image.");
        setTimeout(() => setShareError(null), 2500);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const removePhoto = useCallback(() => {
    photoRef.current = null;
    setPhotoSrc(null);
    setPhotoZoom(1);
    setPhotoPan({ x: 0, y: 0 });
  }, []);

  const onPanPointerDown = useCallback((e: React.PointerEvent) => {
    if (!photoSrc && !isCameraOpen) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    panDragRef.current = { x: e.clientX, y: e.clientY, panX: photoPan.x, panY: photoPan.y };
    setIsDraggingPan(true);
  }, [photoSrc, isCameraOpen, photoPan.x, photoPan.y]);

  const onPanPointerMove = useCallback((e: React.PointerEvent) => {
    if (!panDragRef.current) return;
    const dx = e.clientX - panDragRef.current.x;
    const dy = e.clientY - panDragRef.current.y;
    // Sensitivity scales with zoom — more zoom = more pan range feel
    const sens = 0.004 / Math.max(1, photoZoom * 0.6);
    setPhotoPan({
      x: clamp(panDragRef.current.panX + dx * sens, -1, 1),
      y: clamp(panDragRef.current.panY + dy * sens, -1, 1),
    });
  }, [photoZoom]);

  const onPanPointerUp = useCallback(() => {
    panDragRef.current = null;
    setIsDraggingPan(false);
  }, []);

  const triggerGallery = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Social-friendly output size (square 1080 for IG + good X/FB crop)
    const W = 1080;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    if (mode === "selfie" && photoRef.current && photoRef.current.complete) {
      drawSportsCard(ctx, W, H);
    } else {
      drawReceipt(ctx, W, H);
    }
  }

  function drawReceipt(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // Background
    ctx.fillStyle = COLORS.navy;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid / tactical texture
    ctx.strokeStyle = "rgba(212,168,67,0.06)";
    ctx.lineWidth = 1;
    for (let x = 40; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, H - 40);
      ctx.stroke();
    }
    for (let y = 40; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(W - 40, y);
      ctx.stroke();
    }

    // Outer gold border (sports card frame)
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 18;
    ctx.strokeRect(36, 36, W - 72, H - 72);

    // Inner thin blue accent
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 4;
    ctx.strokeRect(58, 58, W - 116, H - 116);

    // Header band
    ctx.fillStyle = "rgba(212,168,67,0.08)";
    ctx.fillRect(70, 70, W - 140, 160);

    // Logo (small fist header brand only)
    const fist = fistRef.current;
    if (fist && fist.complete) {
      const logoW = 92;
      const logoH = 92;
      ctx.drawImage(fist, 92, 88, logoW, logoH);
    } else {
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(92, 88, 92, 92);
    }

    // WCO + title
    ctx.fillStyle = COLORS.gold;
    ctx.font = `700 28px Orbitron, sans-serif`;
    ctx.fillText("WCO", 205, 120);

    ctx.fillStyle = COLORS.white;
    ctx.font = `700 52px Orbitron, sans-serif`;
    ctx.fillText("PROOF OF WORKOUT", 205, 170);

    ctx.fillStyle = COLORS.slate;
    ctx.font = `600 20px 'DM Sans', sans-serif`;
    ctx.fillText("CALISTHENICS • POWERED BY HEDERA", 205, 198);

    // Receipt label + difficulty header (BEGINNER / INTERMEDIATE / ADVANCED)
    ctx.fillStyle = COLORS.gold;
    ctx.font = `700 22px Orbitron, sans-serif`;
    ctx.fillText("RECEIPT", 92, 270);

    const levelLabel = getLevelLabel(proof.level);
    ctx.fillStyle = COLORS.white;
    ctx.font = `900 64px Orbitron, sans-serif`;
    ctx.fillText(levelLabel, 92, 355);

    ctx.fillStyle = COLORS.blueLight;
    ctx.font = `700 28px Orbitron, sans-serif`;
    ctx.fillText(`LEVEL ${proof.level} • COMPLETE`, 92, 395);

    // Date only (wallet removed per request - no user ID exposure)
    ctx.fillStyle = COLORS.slate;
    ctx.font = `500 22px 'DM Sans', sans-serif`;
    ctx.fillText(formatDate(proof.completedAt), 92, 485);

    // Stats grid (sports card style)
    const statsY = 570;
    const colW = 280;
    const rowH = 92;

    function drawStat(x: number, y: number, label: string, value: string | number, accent = COLORS.gold) {
      ctx.fillStyle = COLORS.darkSlate;
      ctx.fillRect(x, y, colW, rowH);

      ctx.strokeStyle = "rgba(212,168,67,0.25)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, colW, rowH);

      ctx.fillStyle = COLORS.slate;
      ctx.font = `600 18px 'DM Sans', sans-serif`;
      ctx.fillText(label.toUpperCase(), x + 18, y + 32);

      ctx.fillStyle = accent;
      ctx.font = `700 42px Orbitron, sans-serif`;
      ctx.fillText(String(value), x + 18, y + 72);
    }

    const prLabel =
      (proof.prHitThisSession ?? 0) > 0
        ? `PRS (+${proof.prHitThisSession})`
        : "PRS";
    drawStat(92, statsY, "SETS LOGGED", proof.totalSets);
    drawStat(92 + colW + 24, statsY, "EXERCISES", proof.uniqueExercises, COLORS.blueLight);
    drawStat(92 + (colW + 24) * 2, statsY, prLabel, proof.prCount, "#10b981");

    drawStat(92, statsY + rowH + 18, "STREAK", `${proof.streak} DAYS`);
    drawStat(92 + colW + 24, statsY + rowH + 18, "ATHLETE SCORE", proof.athleteScore, COLORS.blueLight);
    drawStat(
      92 + (colW + 24) * 2,
      statsY + rowH + 18,
      "TIER",
      (proof.athleteTier || "UNRANKED").toUpperCase(),
      COLORS.gold,
    );

    // Moves / summary section
    const movesY = statsY + (rowH + 18) * 2 + 30;
    ctx.fillStyle = COLORS.gold;
    ctx.font = `700 20px Orbitron, sans-serif`;
    ctx.fillText("MOVES CRUSHED", 92, movesY);

    ctx.fillStyle = COLORS.white;
    ctx.font = `500 26px 'DM Sans', sans-serif`;
    const moves = (proof.topMoves || []).slice(0, 5);
    moves.forEach((m, i) => {
      ctx.fillText(`• ${m}`, 100, movesY + 42 + i * 34);
    });

    // Footer
  }

  function drawSportsCard(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // Navy base
    ctx.fillStyle = COLORS.navy;
    ctx.fillRect(0, 0, W, H);

    // Premium gold frame (sports card)
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 22;
    ctx.strokeRect(28, 28, W - 56, H - 56);

    // Inner blue accent line
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 4;
    ctx.strokeRect(52, 52, W - 104, H - 104);

    const photo = photoRef.current!;
    const fist = fistRef.current;

    // Full-bleed cover + user zoom/pan (default zoom 1.0 = no extra punch-in)
    drawImageCoverTransform(ctx, photo, W, H, photoZoom, photoPan.x, photoPan.y);

    // Soft vignette — lighter so glass panels + photo breathe
    const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
    vignette.addColorStop(0, "rgba(11,17,32,0.02)");
    vignette.addColorStop(1, "rgba(11,17,32,0.42)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    // Lighter bottom fade (panel itself carries glass — don't crush the photo)
    const bottomGrad = ctx.createLinearGradient(0, H * 0.52, 0, H);
    bottomGrad.addColorStop(0, "rgba(11,17,32,0.05)");
    bottomGrad.addColorStop(0.45, "rgba(20,40,78,0.28)");
    bottomGrad.addColorStop(1, "rgba(11,17,32,0.48)");
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, 0, W, H);

    // Top branding strip — more transparent glass with WCO blue tint
    const headerX = 52;
    const headerY = 52;
    const headerW = W - 104;
    const headerH = 128;
    const headerGrad = ctx.createLinearGradient(headerX, headerY, headerX, headerY + headerH);
    // WCO blue #4274B9 mixed with deep navy — glassmorphic, photo shows through
    headerGrad.addColorStop(0, "rgba(66, 116, 185, 0.42)");
    headerGrad.addColorStop(0.55, "rgba(30, 58, 110, 0.32)");
    headerGrad.addColorStop(1, "rgba(15, 28, 55, 0.26)");
    ctx.fillStyle = headerGrad;
    ctx.fillRect(headerX, headerY, headerW, headerH);

    // Soft blue edge on header glass
    ctx.strokeStyle = "rgba(106, 163, 224, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(headerX + 0.5, headerY + 0.5, headerW - 1, headerH - 1);
    // Gold hairline accent at bottom of header
    ctx.strokeStyle = "rgba(212, 168, 67, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(headerX + 12, headerY + headerH - 1);
    ctx.lineTo(headerX + headerW - 12, headerY + headerH - 1);
    ctx.stroke();

    // Small fist brand on left
    if (fist && fist.complete) {
      ctx.drawImage(fist, 70, 64, 78, 78);
    }

    // Header text — full opacity + light shadow for legibility over glass
    const textShadow = () => {
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
    };
    const clearShadow = () => {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    };

    // WCO small
    textShadow();
    ctx.fillStyle = COLORS.gold; // solid gold, 100% opaque
    ctx.font = `700 22px Orbitron, sans-serif`;
    ctx.fillText("WCO", 162, 88);

    // Tier + difficulty header (accurate athlete identity)
    const tierLabel = (proof.athleteTier || "UNRANKED").toUpperCase();
    const levelLabel = getLevelLabel(proof.level);
    ctx.fillStyle = COLORS.gold;
    ctx.font = `900 36px Orbitron, sans-serif`;
    ctx.fillText(`${tierLabel} · ${levelLabel}`, 162, 122);

    // Sub: LEVEL + COMPLETE
    ctx.fillStyle = COLORS.white;
    ctx.font = `700 20px Orbitron, sans-serif`;
    ctx.fillText(`LEVEL ${proof.level}  •  WORKOUT COMPLETE`, 162, 152);
    clearShadow();

    // Bottom stats panel — more translucent glass (blue-navy tint), text stays solid
    const panelTop = H - 355;
    const panelH = 318;
    const panelGrad = ctx.createLinearGradient(48, panelTop, 48, panelTop + panelH);
    panelGrad.addColorStop(0, "rgba(25, 48, 95, 0.48)");
    panelGrad.addColorStop(0.4, "rgba(15, 28, 55, 0.52)");
    panelGrad.addColorStop(1, "rgba(11, 17, 32, 0.58)");
    ctx.fillStyle = panelGrad;
    ctx.fillRect(48, panelTop, W - 96, panelH);

    // Subtle tactical grid texture (lighter so glass stays airy)
    ctx.strokeStyle = "rgba(106, 163, 224, 0.06)";
    ctx.lineWidth = 1;
    for (let x = 56; x < W - 56; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, panelTop + 8);
      ctx.lineTo(x, panelTop + panelH - 8);
      ctx.stroke();
    }
    for (let y = panelTop + 8; y < panelTop + panelH - 8; y += 40) {
      ctx.beginPath();
      ctx.moveTo(56, y);
      ctx.lineTo(W - 56, y);
      ctx.stroke();
    }

    // Soft gold outer glow border
    ctx.save();
    ctx.shadowColor = "rgba(212, 168, 67, 0.4)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 3.5;
    ctx.strokeRect(48, panelTop, W - 96, panelH);
    ctx.restore();

    // Subtle inner line (blue-gold hybrid glass edge)
    ctx.strokeStyle = "rgba(106, 163, 224, 0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(56, panelTop + 8, W - 112, panelH - 16);

    const padX = 68;
    let curY = panelTop + 24;

    // Panel header — solid opaque text over glass
    textShadow();
    ctx.fillStyle = COLORS.gold;
    ctx.font = `700 15px Orbitron, sans-serif`;
    ctx.fillText("Athlete routine stats", padX, curY);

    curY += 20;
    ctx.fillStyle = COLORS.white;
    ctx.globalAlpha = 1;
    ctx.font = `500 12px 'DM Sans', sans-serif`;
    ctx.fillText(formatDate(proof.completedAt), padX, curY);
    clearShadow();

    // Divider
    curY += 13;
    ctx.strokeStyle = "rgba(212,168,67,0.32)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, curY);
    ctx.lineTo(W - 68, curY);
    ctx.stroke();

    // Stats — evenly spaced, larger professional translucent containers with glow
    curY += 16;
    const statsAvail = W - 136;
    const colGap = 18;
    const colW = Math.floor((statsAvail - 2 * colGap) / 3);
    const rowH = 62;

    const prChipLabel =
      (proof.prHitThisSession ?? 0) > 0
        ? `PRS +${proof.prHitThisSession}`
        : "PRS";
    const stats = [
      { label: "SETS", val: String(proof.totalSets), clr: COLORS.gold },
      { label: "MOVES", val: String(proof.uniqueExercises), clr: COLORS.blueLight },
      { label: prChipLabel, val: String(proof.prCount), clr: "#10b981" },
      { label: "STREAK", val: `${proof.streak}D`, clr: COLORS.gold },
      { label: "PUSH", val: String(proof.pushCount ?? 0), clr: COLORS.blueLight },
      { label: "PULL", val: String(proof.pullCount ?? 0), clr: "#10b981" },
    ];

    const drawRounded = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    for (let i = 0; i < 6; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const sx = padX + col * (colW + colGap);
      const sy = curY + row * (rowH + 9);

      // glass mini-container (more translucent; photo peeks through)
      ctx.fillStyle = "rgba(20, 40, 78, 0.38)";
      drawRounded(sx, sy, colW, rowH, 8);
      ctx.fill();

      // soft gold + blue glass border
      ctx.save();
      ctx.shadowColor = "rgba(212, 168, 67, 0.28)";
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = "rgba(212,168,67,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // label + value — 100% opaque
      textShadow();
      ctx.fillStyle = stats[i].clr;
      ctx.font = `600 11px 'DM Sans', sans-serif`;
      ctx.fillText(stats[i].label, sx + 14, sy + 18);

      ctx.fillStyle = COLORS.white;
      ctx.font = `700 22px Orbitron, sans-serif`;
      ctx.fillText(stats[i].val, sx + 14, sy + 44);
      clearShadow();
    }

    // Tier row — elegant translucent bar with glow
    curY += 2 * (rowH + 9) + 8;
    const tierH = 32;
    const tierWidth = W - 136;

    ctx.save();
    ctx.shadowColor = "rgba(212,168,67,0.35)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = "rgba(66, 116, 185, 0.22)";
    ctx.fillRect(padX, curY, tierWidth, tierH);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(padX, curY, tierWidth, tierH);
    ctx.restore();

    textShadow();
    ctx.fillStyle = COLORS.gold;
    ctx.font = `600 10px 'DM Sans', sans-serif`;
    ctx.fillText("ATHLETE TIER", padX + 12, curY + 13);

    // Center the tier value — solid white
    const tierValue = (proof.athleteTier || "UNRANKED").toUpperCase();
    const tierCenterX = padX + tierWidth / 2;

    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.white;
    ctx.font = `700 17px Orbitron, sans-serif`;
    ctx.fillText(tierValue, tierCenterX, curY + 21);
    ctx.textAlign = "left";
    clearShadow();

    // Moves line — solid labels
    curY += tierH + 18;
    const moves = (proof.topMoves || []).slice(0, 3);
    if (moves.length > 0) {
      textShadow();
      ctx.fillStyle = COLORS.gold;
      ctx.font = `600 12px 'DM Sans', sans-serif`;
      ctx.fillText("MOVES", padX, curY);
      ctx.fillStyle = COLORS.white;
      ctx.font = `500 14px 'DM Sans', sans-serif`;
      ctx.fillText(moves.join("  •  "), padX + 58, curY);
      clearShadow();
    }

    // Optional caption (selfie only)
    const cap = customCaption.trim();
    if (cap) {
      curY += 15;
      textShadow();
      ctx.fillStyle = COLORS.white;
      ctx.font = `400 10px 'DM Sans', sans-serif`;
      const dcap = cap.length > 52 ? cap.slice(0, 49) + "..." : cap;
      ctx.fillText(`“${dcap}”`, padX, curY);
      clearShadow();
    }

    // Footer text — solid gold
    textShadow();
    ctx.fillStyle = COLORS.gold;
    ctx.font = `500 10px 'DM Sans', sans-serif`;
    ctx.fillText("Powered by Hedera", padX, H - 42);
    clearShadow();
  }

  async function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsGenerating(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 0.98)
      );
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wco-proof-l${proof.level}-${new Date(proof.completedAt).toISOString().slice(0,10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  }

  function getShareText(): string {
    if (customCaption.trim()) {
      // If user customized but forgot the tracking tag, soft-append it once
      const base = customCaption.trim();
      if (!base.includes(CONTEST_TRACKING_HASHTAG)) {
        return `${base} ${CONTEST_TRACKING_HASHTAG}`;
      }
      return base;
    }
    return buildWorkoutShareCaption({
      level: proof.level,
      totalSets: proof.totalSets,
      uniqueExercises: proof.uniqueExercises,
      topMoves: proof.topMoves,
      prCount: proof.prCount,
      streak: proof.streak,
      entryNumber: contestEntryNumber,
    });
  }

  async function recordContestShare(platform: "x" | "native" | "other") {
    try {
      let sessionToken: string | null = null;
      try {
        sessionToken = sessionStorage.getItem("wcoWalletSessionToken");
      } catch {
        sessionToken = null;
      }
      if (!sessionToken) return;
      const res = await api.contest.share(sessionToken, platform);
      if (res.success && res.data?.socialQualified && !res.data.alreadyQualified) {
        setShareFeedback("✨ Social prize lane unlocked!");
        setTimeout(() => setShareFeedback(null), 4500);
      }
    } catch {
      /* non-fatal */
    }
  }

  // Centralized proof file + text generator
  async function getProofFileAndText() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png", 0.98)
    );
    if (!blob) return null;
    const filename = `wco-proof-l${proof.level}.png`;
    const file = new File([blob], filename, { type: "image/png" });
    const text = getShareText();
    return { blob, file, filename, text };
  }

  async function shareToPlatform(platform: string) {
    setShareError(null);
    setIsGenerating(true);

    try {
      const proof = await getProofFileAndText();
      if (!proof) {
        setShareError("Could not generate proof image.");
        return;
      }

      const { blob, file, filename, text } = proof;

      const doDownloadAndCopy = () => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        try {
          navigator.clipboard?.writeText(text);
        } catch {}
      };

      if (platform === "native") {
        // Big SHARE PROOF button uses the best experience (system share sheet with actual photo)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], text, title: "WCO Workout Proof" });
            setShareFeedback("✅ Photo + caption shared!");
            setTimeout(() => setShareFeedback(null), 3000);
            void recordContestShare("native");
            return;
          } catch (e: any) {
            if (e.name === "AbortError") return;
          }
        }
        doDownloadAndCopy();
        setShareFeedback("✅ PNG downloaded + caption copied. Use share sheet or attach the file.");
        setTimeout(() => setShareFeedback(null), 4000);
        void recordContestShare("native");
        return;
      }

      // Dedicated buttons (X / Facebook / Instagram): direct per-app behavior
      // Download + copy always happens so the photo is ready.
      // Then open the specific app (deep link on mobile) or site.
      doDownloadAndCopy();

      if (platform === "x") {
        window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
        setShareFeedback("✅ PNG downloaded + caption copied. X opened with your text — attach the PNG.");
        void recordContestShare("x");
      } else if (platform === "fb") {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=https://wcorg.io/calisthenics&quote=${encodeURIComponent(text)}`,
          "_blank"
        );
        setShareFeedback("✅ PNG downloaded + caption copied. Facebook opened with the message — attach the PNG.");
      } else if (platform === "ig") {
        const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
        if (isMobile) {
          // Try to open the Instagram app directly
          window.location.href = "instagram://library";
          setTimeout(() => window.open("https://www.instagram.com/", "_blank"), 900);
        } else {
          window.open("https://www.instagram.com/", "_blank");
        }
        setShareFeedback("✅ PNG downloaded + caption copied. Instagram opened — create a post and attach the PNG (in your recent photos).");
      }

      setTimeout(() => setShareFeedback(null), 5500);
    } catch (e) {
      setShareError("Share failed. PNG downloaded as fallback.");
      setTimeout(() => setShareError(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyCaption() {
    const text = getShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setShareError("Could not copy to clipboard");
      setTimeout(() => setShareError(null), 2000);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-3 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: 10, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="w-full max-w-[1100px] rounded-3xl border max-h-[92vh] overflow-y-auto"
            style={{
              background: "linear-gradient(160deg, #111827, #0B1120)",
              borderColor: "rgba(212,168,67,0.35)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #D4A843, #B8860B)" }}>
                  <Award className="h-5 w-5 text-[#0B1120]" />
                </div>
                <div>
                  <div className="text-[#D4A843] text-[10px] tracking-[3px] font-bold" style={orbitron}>WCO CALISTHENICS</div>
                  <div className="text-white text-xl font-bold tracking-tight" style={orbitron}>SHARE YOUR PROOF</div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-full p-2 text-[#8494A7] hover:text-white hover:bg-white/5 transition"
                aria-label="Close share proof"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 p-4 sm:p-6">
              {/* Preview */}
              <div className="lg:col-span-3">
                <div className="mb-2 text-[#D4A843] text-[10px] font-bold tracking-[2px] pl-1" style={orbitron}>
                  PREVIEW
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/70 p-2 sm:p-3 shadow-2xl">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto rounded-xl max-h-[220px] sm:max-h-[320px] lg:max-h-[620px]"
                    style={{ background: "#0B1120" }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="lg:col-span-2 space-y-4">
                {/* Mode toggle */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setMode("receipt")}
                    className={`flex-1 rounded-xl py-2 text-sm font-bold border transition backdrop-blur-sm vip-shimmer-overlay ${mode === "receipt" ? "bg-white/10 border-[#D4A843] text-[#D4A843]" : "bg-white/5 border-[#D4A843]/30 text-white hover:bg-white/10 hover:border-[#D4A843]/50"}`}
                    style={dmSans}
                  >
                    RECEIPT
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setMode("selfie")}
                    className={`flex-1 rounded-xl py-2 text-sm font-bold border transition backdrop-blur-sm vip-shimmer-overlay ${mode === "selfie" ? "bg-white/10 border-[#D4A843] text-[#D4A843]" : "bg-white/5 border-[#D4A843]/30 text-white hover:bg-white/10 hover:border-[#D4A843]/50"}`}
                    style={dmSans}
                  >
                    SPORTS CARD
                  </motion.button>
                </div>

                {/* Ultimate selfie camera studio */}
                {mode === "selfie" && (
                  <div className="space-y-2.5">
                    {isCameraOpen ? (
                      <div className="space-y-2">
                        {/* Square viewfinder — matches sports card crop */}
                        <div
                          className="relative rounded-xl overflow-hidden border border-[#D4A843]/40 bg-black w-full aspect-square max-h-[280px] sm:max-h-[320px] mx-auto touch-none select-none"
                          onPointerDown={onPanPointerDown}
                          onPointerMove={onPanPointerMove}
                          onPointerUp={onPanPointerUp}
                          onPointerCancel={onPanPointerUp}
                          style={{ cursor: isDraggingPan ? "grabbing" : "grab" }}
                        >
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full object-cover bg-black"
                            style={{
                              transform: `scale(${photoZoom}) translate(${photoPan.x * 12}%, ${photoPan.y * 12}%) scaleX(${mirrorPreview && facingMode === "user" ? -1 : 1})`,
                              transformOrigin: "center center",
                            }}
                          />
                          {/* Gold square safe-area guide */}
                          <div className="pointer-events-none absolute inset-2 rounded-lg border-2 border-[#D4A843]/50" />
                          {showGrid && (
                            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                              {Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className="border border-white/20" />
                              ))}
                            </div>
                          )}
                          {countdown != null && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <span className="text-6xl font-black text-[#D4A843] drop-shadow-lg" style={orbitron}>
                                {countdown}
                              </span>
                            </div>
                          )}
                          <div className="absolute top-2 left-2 right-2 flex justify-between pointer-events-none">
                            <span className="text-[9px] font-bold text-white/80 bg-black/50 px-1.5 py-0.5 rounded" style={dmSans}>
                              {photoZoom.toFixed(1)}×
                            </span>
                            <span className="text-[9px] font-bold text-[#D4A843] bg-black/50 px-1.5 py-0.5 rounded" style={dmSans}>
                              CARD FRAME
                            </span>
                          </div>
                        </div>

                        {/* Zoom slider */}
                        <div className="flex items-center gap-2 px-0.5">
                          <ZoomIn className="h-3.5 w-3.5 text-[#D4A843] flex-shrink-0" />
                          <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={photoZoom}
                            onChange={(e) => {
                              const z = Number(e.target.value);
                              setPhotoZoom(z);
                              if (z <= 1.05) setPhotoPan({ x: 0, y: 0 });
                            }}
                            className="flex-1 h-1.5 accent-[#D4A843] cursor-pointer"
                            aria-label="Zoom"
                          />
                          <span className="text-[10px] text-[#8494A7] w-8 text-right tabular-nums" style={dmSans}>
                            {photoZoom.toFixed(1)}×
                          </span>
                        </div>

                        {/* Tool row */}
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          <button
                            type="button"
                            onClick={() => setShowGrid((g) => !g)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 touch-manipulation ${showGrid ? "border-[#D4A843] text-[#D4A843] bg-[#D4A843]/10" : "border-white/20 text-white/80"}`}
                            style={dmSans}
                            title="Rule of thirds grid"
                          >
                            <Grid3x3 className="h-3 w-3" /> GRID
                          </button>
                          <button
                            type="button"
                            onClick={cycleTimer}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 touch-manipulation ${timerSec > 0 ? "border-[#D4A843] text-[#D4A843] bg-[#D4A843]/10" : "border-white/20 text-white/80"}`}
                            style={dmSans}
                            title="Countdown timer"
                          >
                            <Timer className="h-3 w-3" /> {timerSec === 0 ? "TIMER" : `${timerSec}s`}
                          </button>
                          <button
                            type="button"
                            onClick={() => setMirrorPreview((m) => !m)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 touch-manipulation ${mirrorPreview ? "border-[#D4A843] text-[#D4A843] bg-[#D4A843]/10" : "border-white/20 text-white/80"}`}
                            style={dmSans}
                            title="Mirror preview (front camera)"
                          >
                            <FlipHorizontal2 className="h-3 w-3" /> MIRROR
                          </button>
                          {torchSupported && (
                            <button
                              type="button"
                              onClick={() => setTorch(!torchOn)}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 touch-manipulation ${torchOn ? "border-[#D4A843] text-[#D4A843] bg-[#D4A843]/10" : "border-white/20 text-white/80"}`}
                              style={dmSans}
                              title="Flashlight"
                            >
                              <Flashlight className="h-3 w-3" /> TORCH
                            </button>
                          )}
                        </div>

                        {/* Capture bar */}
                        <div className="flex justify-center gap-1.5 px-1">
                          <button
                            type="button"
                            onClick={snapWithTimer}
                            disabled={countdown != null}
                            className="px-4 py-2 bg-[#D4A843] text-[#0B1120] rounded-full text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform touch-manipulation disabled:opacity-60"
                            style={dmSans}
                          >
                            <Camera className="h-3.5 w-3.5" /> {countdown != null ? "…" : "SNAP"}
                          </button>
                          <button
                            type="button"
                            onClick={toggleCamera}
                            className="px-3 py-2 bg-white/10 text-white rounded-full text-xs font-bold flex items-center gap-1 border border-white/30 active:scale-95 transition-transform touch-manipulation"
                            style={dmSans}
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> FLIP
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-3 py-2 rounded-full text-xs font-bold border border-white/30 text-white active:scale-95 transition-transform touch-manipulation"
                            style={dmSans}
                          >
                            CANCEL
                          </button>
                        </div>
                        <p className="text-[9px] text-[#8494A7] text-center" style={dmSans}>
                          Drag to reframe · zoom 1–3× · frame matches sports card
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startCamera("user")}
                            className="flex-1 flex items-center justify-center rounded-xl border border-[#D4A843]/40 py-2 text-xs font-bold text-white hover:bg-[#D4A843]/10 active:bg-[#D4A843]/20"
                            style={dmSans}
                            title="Take Photo"
                          >
                            <Camera className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={triggerGallery}
                            className="flex-1 flex items-center justify-center rounded-xl border border-white/15 py-2 text-xs font-bold text-white hover:bg-white/5 active:bg-white/10"
                            style={dmSans}
                            title="Choose Photo"
                          >
                            <Upload className="h-3.5 w-3.5" />
                          </button>
                          {photoSrc && (
                            <>
                              <button
                                type="button"
                                onClick={retakePhoto}
                                className="flex items-center justify-center rounded-xl border border-[#D4A843]/30 py-2 px-3 text-xs font-bold text-[#D4A843] hover:bg-[#D4A843]/10"
                                style={dmSans}
                                title="Retake"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={removePhoto}
                                className="flex items-center justify-center rounded-xl border border-red-500/30 py-2 px-3 text-xs font-bold text-red-400 hover:bg-red-500/10 active:bg-red-500/20"
                                style={dmSans}
                                title="Remove Photo"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>

                        {photoSrc && (
                          <div className="space-y-2 rounded-xl border border-[#D4A843]/20 bg-black/30 p-2.5">
                            <div className="flex items-center gap-2">
                              <img src={photoSrc} alt="selfie preview" className="w-10 h-10 rounded-md object-cover border border-[#D4A843]/30" />
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-emerald-400 block" style={dmSans}>Selfie ready — adjust crop</span>
                                <span className="text-[9px] text-[#8494A7]" style={dmSans}>Drag card preview area or use zoom</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <ZoomIn className="h-3.5 w-3.5 text-[#D4A843] flex-shrink-0" />
                              <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.05}
                                value={photoZoom}
                                onChange={(e) => {
                                  const z = Number(e.target.value);
                                  setPhotoZoom(z);
                                  if (z <= 1.05) setPhotoPan({ x: 0, y: 0 });
                                }}
                                className="flex-1 h-1.5 accent-[#D4A843] cursor-pointer"
                                aria-label="Photo zoom"
                              />
                              <span className="text-[10px] text-[#8494A7] w-8 text-right tabular-nums" style={dmSans}>
                                {photoZoom.toFixed(1)}×
                              </span>
                            </div>
                            <div
                              className="relative h-20 rounded-lg overflow-hidden border border-white/10 bg-black cursor-grab active:cursor-grabbing touch-none"
                              onPointerDown={onPanPointerDown}
                              onPointerMove={onPanPointerMove}
                              onPointerUp={onPanPointerUp}
                              onPointerCancel={onPanPointerUp}
                              title="Drag to reframe"
                            >
                              <img
                                src={photoSrc}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                style={{
                                  transform: `scale(${photoZoom}) translate(${photoPan.x * 12}%, ${photoPan.y * 12}%)`,
                                  transformOrigin: "center center",
                                }}
                                draggable={false}
                              />
                              <div className="absolute inset-0 flex items-end justify-center pb-1 pointer-events-none">
                                <span className="text-[8px] text-white/70 bg-black/50 px-1.5 rounded" style={dmSans}>DRAG TO REFRAME</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Caption (selfie only) */}
                {mode === "selfie" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[#D4A843] text-[10px] font-bold tracking-[1px]" style={orbitron}>CAPTION</div>
                      <button
                        onClick={copyCaption}
                        className="flex items-center gap-1 text-[10px] text-[#6AA3E0] hover:text-white"
                        style={dmSans}
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? "COPIED" : "COPY"}
                      </button>
                    </div>
                    <textarea
                      value={customCaption}
                      onChange={(e) => setCustomCaption(e.target.value)}
                      placeholder="Optional caption..."
                      className="w-full text-xs p-2 rounded-lg bg-black/30 border border-white/10 text-[#E8ECF0] placeholder:text-[#8494A7]/50 resize-y min-h-[40px]"
                      style={dmSans}
                      rows={2}
                    />
                  </div>
                )}

                {/* Share actions */}
                <div className="space-y-2 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => shareToPlatform("native")}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold border border-[#D4A843] bg-white/5 text-[#D4A843] hover:bg-white/10 hover:border-[#D4A843]/70 disabled:opacity-60 backdrop-blur-sm vip-shimmer-overlay"
                    style={dmSans}
                  >
                    <Share2 className="h-4 w-4" />
                    {isGenerating ? "PREPARING..." : "SHARE PROOF"}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl py-2 text-sm font-bold border border-white/15 text-white hover:bg-white/5 disabled:opacity-60"
                    style={dmSans}
                  >
                    <Download className="h-4 w-4" />
                    {isGenerating ? "PREPARING..." : "DOWNLOAD PNG"}
                  </motion.button>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => shareToPlatform("x")}
                      disabled={isGenerating}
                      className="py-2.5 rounded-xl border border-white/15 flex items-center justify-center hover:bg-white/5 disabled:opacity-60"
                      title="Share to X"
                      style={dmSans}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25l-7.451 9.06L4.5 2.25H1.5l6.9 8.4L1.5 21.75h3l7.2-8.76 5.55 6.76h3l-7.2-8.76 7.2-8.76h-3z" />
                      </svg>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => shareToPlatform("fb")}
                      disabled={isGenerating}
                      className="py-2.5 rounded-xl border border-white/15 flex items-center justify-center hover:bg-white/5 disabled:opacity-60"
                      title="Share to Facebook"
                      style={dmSans}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.03V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                      </svg>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => shareToPlatform("ig")}
                      disabled={isGenerating}
                      className="py-2.5 rounded-xl border border-white/15 flex items-center justify-center hover:bg-white/5 disabled:opacity-60"
                      title="Share to Instagram"
                      style={dmSans}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                    </motion.button>
                  </div>

                  {shareError && (
                    <div className="text-[10px] text-red-400 text-center pt-1" style={dmSans}>{shareError}</div>
                  )}
                  {shareFeedback && (
                    <div className="text-[10px] text-emerald-400 text-center pt-1" style={dmSans}>{shareFeedback}</div>
                  )}
                </div>

                <input ref={galleryInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
