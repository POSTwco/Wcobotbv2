/**
 * CaliShareProof — WCO branded workout proof / receipt / sports card generator.
 * Pure client-side canvas. Triggered after complete workout (finishing UI/UX touch).
 * Phase 1 scaffold: Pure Receipt mode + placeholder data + logo + basic renderer.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, Share2, Award, Camera, Upload, Trash2, Copy, Check, RefreshCw } from "lucide-react";
import fistLogo from "../../../assets/brand/fist-wco.jpg";

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
  prCount: number;
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
  data?: Partial<ProofData>; // real data wired later; falls back to placeholder
}

const PLACEHOLDER: ProofData = {
  level: 2,
  completedAt: new Date().toISOString(),
  totalSets: 18,
  uniqueExercises: 6,
  prCount: 2,
  athleteScore: 1240,
  athleteTier: "PRO",
  streak: 7,
  workoutId: "demo-wid-abc123",
  topMoves: ["Pull-Up", "Dips", "Pistol Squat", "L-Sit Hold", "Muscle-Up Neg.", "Handstand Hold"],
  pushCount: 5,
  pullCount: 4,
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

export function CaliShareProof({ open, onClose, data }: Props) {
  const [mode, setMode] = useState<"receipt" | "selfie">("receipt");
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [customCaption, setCustomCaption] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const proof: ProofData = {
    ...PLACEHOLDER,
    ...data,
    topMoves: data?.topMoves ?? PLACEHOLDER.topMoves,
    pushCount: data?.pushCount ?? PLACEHOLDER.pushCount,
    pullCount: data?.pullCount ?? PLACEHOLDER.pullCount,
  };

  // === Camera functions (must be declared early to avoid TDZ in effects that list them in deps) ===
  const startCamera = useCallback(async (requestedMode?: "user" | "environment") => {
    const mode = requestedMode || facingMode;
    setShareError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      setFacingMode(mode);
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  }, []);

  const captureFromCamera = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth || 640;
    tempCanvas.height = video.videoHeight || 480;
    const ctx = tempCanvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      const dataUrl = tempCanvas.toDataURL("image/png");
      const img = new Image();
      img.onload = () => {
        photoRef.current = img;
        setPhotoSrc(dataUrl);
        stopCamera();
      };
      img.src = dataUrl;
    }
  }, [stopCamera]);

  const toggleCamera = useCallback(() => {
    const newMode = facingMode === "user" ? "environment" : "user";
    if (isCameraOpen) {
      stopCamera();
      // small delay to let stream close
      setTimeout(() => {
        startCamera(newMode);
      }, 150);
    } else {
      startCamera(newMode);
    }
  }, [facingMode, isCameraOpen, stopCamera, startCamera]);

  // Preload logo once
  useEffect(() => {
    if (logoRef.current) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      logoRef.current = img;
      draw();
    };
    img.src = fistLogo as unknown as string;
  }, []);

  // Redraw on open, mode, data, photo or caption change
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => draw(), 40);
      return () => clearTimeout(t);
    }
  }, [open, mode, proof.level, proof.totalSets, proof.athleteTier, photoSrc, customCaption]);

  // Reset custom caption + errors/feedback when modal closes (polish)
  useEffect(() => {
    if (!open) {
      setCustomCaption("");
      setShareError(null);
      setShareFeedback(null);
      setCopied(false);
      if (isCameraOpen) stopCamera();
    }
  }, [open, isCameraOpen]);  // stopCamera is stable, no need in deps

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

    // Logo (power fist)
    const logo = logoRef.current;
    if (logo && logo.complete) {
      const logoW = 92;
      const logoH = 92;
      ctx.drawImage(logo, 92, 88, logoW, logoH);
    } else {
      // Fallback gold square while loading
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

    // Receipt / card title
    ctx.fillStyle = COLORS.gold;
    ctx.font = `700 22px Orbitron, sans-serif`;
    ctx.fillText("RECEIPT", 92, 270);

    // Big level + status
    ctx.fillStyle = COLORS.white;
    ctx.font = `900 120px Orbitron, sans-serif`;
    ctx.fillText(`L${proof.level}`, 92, 400);

    ctx.fillStyle = COLORS.blueLight;
    ctx.font = `700 32px Orbitron, sans-serif`;
    ctx.fillText("COMPLETE", 92, 445);

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

    drawStat(92, statsY, "SETS LOGGED", proof.totalSets);
    drawStat(92 + colW + 24, statsY, "EXERCISES", proof.uniqueExercises, COLORS.blueLight);
    drawStat(92 + (colW + 24) * 2, statsY, "PRS HIT", proof.prCount, "#10b981");

    drawStat(92, statsY + rowH + 18, "STREAK", `${proof.streak} DAYS`);
    drawStat(92 + colW + 24, statsY + rowH + 18, "ATHLETE SCORE", proof.athleteScore, COLORS.blueLight);
    drawStat(92 + (colW + 24) * 2, statsY + rowH + 18, "TIER", proof.athleteTier, COLORS.gold);

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

    // Footer - removed redundant "OFFICIAL WCO CALISTHENICS PROOF" text (was causing overlay with moves)
    ctx.fillStyle = COLORS.gold;
    ctx.font = `700 18px Orbitron, sans-serif`;
    ctx.fillText("POWERED BY HEDERA", W - 340, H - 92);

    // Small fist stamp in corner (if logo ready)
    if (logo && logo.complete) {
      ctx.globalAlpha = 0.15;
      ctx.drawImage(logo, W - 170, H - 170, 110, 110);
      ctx.globalAlpha = 1;
    }
  }

  function drawSportsCard(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // Navy base
    ctx.fillStyle = COLORS.navy;
    ctx.fillRect(0, 0, W, H);

    // Premium gold frame (sports card)
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 24;
    ctx.strokeRect(26, 26, W - 52, H - 52);

    // Inner blue accent line
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 5;
    ctx.strokeRect(50, 50, W - 100, H - 100);

    const photo = photoRef.current!;
    const logo = logoRef.current;

    // Draw user photo full-bleed (cover)
    const scale = Math.max(W / photo.width, H / photo.height);
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    ctx.drawImage(photo, dx, dy, dw, dh);

    // Subtle vignette + dark overlay for text contrast (sports card depth)
    const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
    vignette.addColorStop(0, "rgba(11,17,32,0.05)");
    vignette.addColorStop(1, "rgba(11,17,32,0.65)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    // Stronger bottom gradient for stats area
    const bottomGrad = ctx.createLinearGradient(0, H * 0.52, 0, H);
    bottomGrad.addColorStop(0, "rgba(11,17,32,0.25)");
    bottomGrad.addColorStop(0.55, "rgba(11,17,32,0.88)");
    bottomGrad.addColorStop(1, "rgba(11,17,32,0.97)");
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, 0, W, H);

    // Large faded power fist watermark over the selfie (branded overlay)
    if (logo && logo.complete) {
      ctx.globalAlpha = 0.09;
      const wm = 420;
      ctx.drawImage(logo, (W - wm) / 2, H * 0.12, wm, wm);
      ctx.globalAlpha = 1;
    }

    // Top branding strip (over selfie)
    ctx.fillStyle = "rgba(11,17,32,0.55)";
    ctx.fillRect(50, 50, W - 100, 120);

    if (logo && logo.complete) {
      ctx.drawImage(logo, 68, 62, 88, 88);
    }
    ctx.fillStyle = COLORS.gold;
    ctx.font = `700 26px Orbitron, sans-serif`;
    ctx.fillText("WCO", 175, 98);

    ctx.fillStyle = COLORS.white;
    ctx.font = `900 58px Orbitron, sans-serif`;
    ctx.fillText(`L${proof.level}`, 175, 148);

    ctx.fillStyle = COLORS.gold;
    ctx.font = `700 26px Orbitron, sans-serif`;
    ctx.fillText("COMPLETE", 175, 175);

    // Bottom premium stats container (glass-like dark panel with gold trim)
    const panelTop = H - 340;
    const panelH = 310;
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.fillRect(45, panelTop, W - 90, panelH);

    // Gold border for container
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 4;
    ctx.strokeRect(45, panelTop, W - 90, panelH);

    // Subtle inner border
    ctx.strokeStyle = "rgba(212,168,67,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(52, panelTop + 7, W - 104, panelH - 14);

    const padX = 65;
    let curY = panelTop + 22;

    // Header
    ctx.fillStyle = COLORS.gold;
    ctx.font = `700 18px Orbitron, sans-serif`;
    ctx.fillText("OFFICIAL WCO SPORTS CARD", padX, curY);

    curY += 22;
    ctx.fillStyle = COLORS.slate;
    ctx.font = `500 13px 'DM Sans', sans-serif`;
    ctx.fillText(formatDate(proof.completedAt), padX, curY);

    // Divider
    curY += 12;
    ctx.strokeStyle = "rgba(212,168,67,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, curY);
    ctx.lineTo(W - 65, curY);
    ctx.stroke();

    // Stats grid - 3 columns x 2 rows of mini containers
    curY += 18;
    const colW = 170;
    const colGap = 18;
    const rowH = 58;

    const stats = [
      { label: "SETS", val: String(proof.totalSets), clr: COLORS.gold },
      { label: "EXERCISES", val: String(proof.uniqueExercises), clr: COLORS.blueLight },
      { label: "PRS", val: String(proof.prCount), clr: "#10b981" },
      { label: "STREAK", val: `${proof.streak} DAYS`, clr: COLORS.gold },
      { label: "PUSH", val: String(proof.pushCount ?? 0), clr: COLORS.blueLight },
      { label: "PULL", val: String(proof.pullCount ?? 0), clr: "#10b981" },
    ];

    for (let i = 0; i < 6; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const sx = padX + col * (colW + colGap);
      const sy = curY + row * (rowH + 8);

      // Mini stat container
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(sx, sy, colW, rowH);
      ctx.strokeStyle = "rgba(212,168,67,0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, colW, rowH);

      // Label
      ctx.fillStyle = stats[i].clr;
      ctx.font = `600 10px 'DM Sans', sans-serif`;
      ctx.fillText(stats[i].label, sx + 8, sy + 14);

      // Value
      ctx.fillStyle = COLORS.white;
      ctx.font = `700 20px Orbitron, sans-serif`;
      ctx.fillText(stats[i].val, sx + 8, sy + 38);
    }

    // Tier badge container
    curY += 2 * (rowH + 8) + 12;
    const tierH = 32;
    ctx.fillStyle = "rgba(212,168,67,0.12)";
    ctx.fillRect(padX, curY, W - 130, tierH);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(padX, curY, W - 130, tierH);

    ctx.fillStyle = COLORS.gold;
    ctx.font = `600 11px 'DM Sans', sans-serif`;
    ctx.fillText("TIER", padX + 10, curY + 12);

    ctx.fillStyle = COLORS.white;
    ctx.font = `700 18px Orbitron, sans-serif`;
    ctx.fillText((proof.athleteTier || "UNRANKED").toUpperCase(), padX + 55, curY + 13);

    // Moves line
    curY += tierH + 10;
    const moves = (proof.topMoves || []).slice(0, 3);
    if (moves.length > 0) {
      ctx.fillStyle = COLORS.slate;
      ctx.font = `500 11px 'DM Sans', sans-serif`;
      ctx.fillText("MOVES: " + moves.join("  •  "), padX, curY);
    }

    // Caption (tasteful quote if provided) - only on selfie sports card
    const cap = customCaption.trim();
    if (cap) {
      curY += 16;
      ctx.fillStyle = COLORS.slate;
      ctx.font = `400 11px 'DM Sans', sans-serif`;
      const dcap = cap.length > 55 ? cap.slice(0,52) + "..." : cap;
      ctx.fillText(`“${dcap}”`, padX, curY);
    }

    // Footer - simplified per request: bottom left is golden "; Powered by Hedera"
    ctx.fillStyle = COLORS.gold;
    ctx.font = `500 11px 'DM Sans', sans-serif`;
    ctx.fillText("; Powered by Hedera", padX, H - 48);

    ctx.fillStyle = COLORS.gold;
    ctx.font = `600 11px Orbitron, sans-serif`;
    ctx.fillText("WCO CALISTHENICS", W - 200, H - 48);
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
      return customCaption.trim();
    }
    const moves = (proof.topMoves || []).slice(0, 3).join(", ");
    return `Just crushed my WCO Level ${proof.level} workout — ${proof.totalSets} sets across ${proof.uniqueExercises} moves${moves ? ` (${moves})` : ""}. ${proof.prCount} PRs. ${proof.streak}-day streak. Real proof on Hedera. #WCO #Cali #HederaWeb3`;
  }

  async function shareToPlatform(platform: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setShareError(null);
    setIsGenerating(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 0.98)
      );
      if (!blob) return;

      const filename = `wco-proof-l${proof.level}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      const text = getShareText();

      // Try native Web Share with file (great on mobile, supports image + text)
      if (platform === "native" || !platform) {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              text,
              title: "WCO Workout Proof",
            });
            return; // success
          } catch (e) {
            // user cancelled or not supported, fall through
          }
        }
      }

      // Always download for manual attach (FB/IG web don't support auto image attach)
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      // Copy caption to clipboard for easy paste (premium UX)
      try {
        await navigator.clipboard?.writeText(text);
      } catch {}

      // Platform-specific intents + feedback
      const platformName = platform === "fb" ? "Facebook" : platform === "ig" ? "Instagram" : "X";
      if (platform === "x") {
        window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
        setShareFeedback(`✅ Image downloaded. Caption copied. Paste & attach on X.`);
      } else if (platform === "fb") {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=https://wcorg.io/calisthenics&quote=${encodeURIComponent(text)}`,
          "_blank"
        );
        setShareFeedback(`✅ Image downloaded & caption copied! On Facebook, attach the PNG and the message may prefill.`);
      } else if (platform === "ig") {
        setShareFeedback(`✅ Image downloaded & caption copied! Open the Instagram app, create post, and attach the PNG.`);
      } else if (platform === "native") {
        // already handled
      }
      setTimeout(() => setShareFeedback(null), 4500);
    } catch (e) {
      setShareError("Share failed. Image was downloaded as fallback.");
      setTimeout(() => setShareError(null), 2500);
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
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[#D4A843] text-xs font-bold tracking-[2px]" style={orbitron}>LIVE PREVIEW — {mode === "receipt" ? "RECEIPT" : "SPORTS CARD"}</div>
                  <div className="text-[10px] text-[#8494A7]">1080×1080 • ready for social</div>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 p-3 sm:p-4">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto rounded-xl shadow-inner max-h-[220px] sm:max-h-[320px] lg:max-h-[620px]"
                    style={{ background: "#0B1120" }}
                  />
                </div>

                <div className="mt-3 text-[10px] text-[#8494A7] text-center" style={dmSans}>
                  This image is generated locally in your browser using real workout data. Nothing is uploaded.
                </div>
              </div>

              {/* Controls */}
              <div className="lg:col-span-2 space-y-3 sm:space-y-5">
                {/* Mode toggle - now fully live */}
                <div>
                  <div className="text-[#D4A843] text-xs font-bold tracking-[2px] mb-2" style={orbitron}>STYLE</div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => setMode("receipt")}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-bold border transition ${mode === "receipt" ? "bg-[#D4A843] text-[#0B1120] border-[#D4A843]" : "border-white/15 text-white hover:bg-white/5"}`}
                      style={dmSans}
                    >
                      PURE RECEIPT
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => setMode("selfie")}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-bold border transition ${mode === "selfie" ? "bg-[#D4A843] text-[#0B1120] border-[#D4A843]" : "border-white/15 text-white hover:bg-white/5"}`}
                      style={dmSans}
                    >
                      SELFIE SPORTS CARD
                    </motion.button>
                  </div>
                </div>

                {/* Photo / Selfie controls (Phase 3) - now with real in-app camera */}
                {mode === "selfie" && (
                  <div>
                    <div className="text-[#D4A843] text-xs font-bold tracking-[2px] mb-2" style={orbitron}>YOUR SELFIE</div>

                    {isCameraOpen ? (
                      // Live camera preview (premium in-app camera, not file picker)
                      <div className="space-y-2">
                        <div className="relative rounded-xl overflow-hidden border border-[#D4A843]/30 bg-black w-full min-h-[180px] sm:min-h-[240px]">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full max-h-[240px] sm:max-h-[300px] object-cover bg-black aspect-video"
                          />
                          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={captureFromCamera}
                              className="px-5 py-2.5 bg-[#D4A843] text-[#0B1120] rounded-full text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform touch-manipulation"
                              style={dmSans}
                            >
                              <Camera className="h-4 w-4" /> SNAP
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={toggleCamera}
                              className="px-4 py-2.5 bg-white/10 text-white rounded-full text-sm font-bold flex items-center gap-1.5 border border-white/30 active:scale-95 transition-transform touch-manipulation"
                              style={dmSans}
                            >
                              <RefreshCw className="h-4 w-4" /> FLIP CAM
                            </motion.button>
                            <button
                              onClick={stopCamera}
                              className="px-4 py-2.5 rounded-full text-sm font-bold border border-white/30 text-white active:scale-95 transition-transform touch-manipulation"
                              style={dmSans}
                            >
                              CANCEL
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-center text-[#8494A7]" style={dmSans}>
                          Point camera • Tap FLIP CAM to reverse • SNAP to capture
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => startCamera("user")}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#D4A843]/40 py-2.5 text-sm font-bold text-white hover:bg-[#D4A843]/10 active:bg-[#D4A843]/20"
                          style={dmSans}
                        >
                          <Camera className="h-4 w-4" /> TAKE PHOTO (FRONT CAM)
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={triggerGallery}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2.5 text-sm font-bold text-white hover:bg-white/5 active:bg-white/10"
                          style={dmSans}
                        >
                          <Upload className="h-4 w-4" /> CHOOSE PHOTO
                        </motion.button>
                        {photoSrc && (
                          <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={removePhoto}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 py-2.5 px-4 text-sm font-bold text-red-400 hover:bg-red-500/10 active:bg-red-500/20"
                            style={dmSans}
                          >
                            <Trash2 className="h-4 w-4" /> REMOVE
                          </motion.button>
                        )}
                      </div>
                    )}

                    {photoSrc && !isCameraOpen && (
                      <div className="mt-2 flex items-center gap-3">
                        <img
                          src={photoSrc}
                          alt="your selfie preview"
                          className="w-14 h-14 rounded-lg object-cover border border-[#D4A843]/40"
                        />
                        <div className="text-[10px] text-emerald-400 leading-tight" style={dmSans}>
                          Selfie ready.<br />Preview updates live.
                        </div>
                      </div>
                    )}
                    {!photoSrc && !isCameraOpen && (
                      <div className="mt-1 text-[10px] text-amber-400" style={dmSans}>
                        TAKE opens live front camera • FLIP CAM for rear • Best on mobile in good light
                      </div>
                    )}
                  </div>
                )}

                {/* Caption customization - only for selfie sports card (not pure receipt) */}
                {mode === "selfie" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[#D4A843] text-xs font-bold tracking-[2px]" style={orbitron}>CAPTION</div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={copyCaption}
                        className="flex items-center gap-1 text-[10px] text-[#6AA3E0] hover:text-white transition"
                        style={dmSans}
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? "COPIED" : "COPY"}
                      </motion.button>
                    </div>
                    <textarea
                      value={customCaption}
                      onChange={(e) => setCustomCaption(e.target.value)}
                      placeholder="Optional: customize the message before sharing..."
                      className="w-full text-xs p-2 rounded-lg bg-black/30 border border-white/10 text-[#E8ECF0] placeholder:text-[#8494A7]/60 resize-y min-h-[44px]"
                      style={dmSans}
                      rows={2}
                    />
                    <div className="text-[9px] text-[#8494A7] mt-1" style={dmSans}>
                      Leave empty to use auto-generated text with your real workout stats.
                    </div>
                  </div>
                )}

                {/* Summary - now using full real data from completed workout */}
                <div className="hidden sm:block">
                  <div className="text-[#D4A843] text-xs font-bold tracking-[2px] mb-2" style={orbitron}>WORKOUT SUMMARY</div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-3 sm:p-4 text-xs sm:text-sm" style={dmSans}>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#8494A7]">Level</span>
                      <span className="font-bold text-white">L{proof.level}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#8494A7]">Sets logged</span>
                      <span className="font-bold text-white">{proof.totalSets}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#8494A7]">Unique exercises</span>
                      <span className="font-bold text-white">{proof.uniqueExercises}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#8494A7]">PRs hit</span>
                      <span className="font-bold text-emerald-400">{proof.prCount}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#8494A7]">Current streak</span>
                      <span className="font-bold text-[#D4A843]">{proof.streak} days</span>
                    </div>
                    <div className="flex justify-between pt-2 mt-2 border-t border-white/10">
                      <span className="text-[#8494A7]">Athlete tier</span>
                      <span className="font-bold text-[#D4A843]">{proof.athleteTier}</span>
                    </div>
                  </div>
                </div>

                {/* Actions - Phase 5 full sharing */}
                <div className="space-y-2 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => shareToPlatform("native")}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #D4A843, #B8860B)", color: "#0B1120", ...dmSans }}
                  >
                    <Share2 className="h-4 w-4" />
                    {isGenerating ? "PREPARING..." : "SHARE PROOF (Native / File)"}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold border border-white/15 text-white hover:bg-white/5 disabled:opacity-60"
                    style={dmSans}
                  >
                    <Download className="h-4 w-4" />
                    {isGenerating ? "PREPARING PNG..." : "DOWNLOAD PNG"}
                  </motion.button>

                  <div className="grid grid-cols-3 gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => shareToPlatform("x")}
                      disabled={isGenerating}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2.5 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-60"
                      style={dmSans}
                    >
                      <Share2 className="h-3.5 w-3.5" /> X / TWITTER
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => shareToPlatform("fb")}
                      disabled={isGenerating}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2.5 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-60"
                      style={dmSans}
                    >
                      <Share2 className="h-3.5 w-3.5" /> FACEBOOK
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => shareToPlatform("ig")}
                      disabled={isGenerating}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2.5 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-60"
                      style={dmSans}
                    >
                      <Share2 className="h-3.5 w-3.5" /> INSTAGRAM
                    </motion.button>
                  </div>

                  <p className="text-[10px] leading-snug text-center text-[#8494A7] pt-1" style={dmSans}>
                    Native share sends the image + caption directly where supported.<br />Otherwise downloads + opens platform intent. All local.
                  </p>
                  {shareError && (
                    <div className="text-[10px] text-red-400 text-center" style={dmSans}>{shareError}</div>
                  )}
                  {shareFeedback && (
                    <div className="text-[10px] text-emerald-400 text-center mt-1" style={dmSans}>{shareFeedback}</div>
                  )}
                </div>

                {/* Hidden input only for CHOOSE PHOTO (gallery). TAKE PHOTO now uses live getUserMedia camera preview */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-6 py-3 text-[10px] text-[#8494A7] flex items-center justify-between" style={dmSans}>
              <div>Real data • Generated locally • WCO official branding</div>
              <div className="text-[#D4A843]/70">POWER FIST EDITION</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
