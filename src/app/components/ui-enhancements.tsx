import {
  useState, useEffect, useRef, useCallback,
  type ReactNode, type CSSProperties,
} from "react";
import { motion, useSpring, useMotionValue } from "motion/react";
import { useLocation } from "react-router";

function useInView(ref: React.RefObject<Element | null>, opts?: { once?: boolean; margin?: string }) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (opts?.once) obs.disconnect();
        } else if (!opts?.once) {
          setInView(false);
        }
      },
      { rootMargin: opts?.margin || "0px", threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return inView;
}

export function AnimatedCounter({ value, duration = 2, prefix = "", suffix = "", decimals = 0, className, style }: { value: number; duration?: number; prefix?: string; suffix?: string; decimals?: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const mv = useMotionValue(0);
  const sv = useSpring(mv, { duration: duration * 1000, bounce: 0 });
  const [display, setDisplay] = useState("0");
  useEffect(() => { if (isInView) mv.set(value); }, [isInView, value, mv]);
  useEffect(() => { const u = sv.on("change", (v) => setDisplay(v.toFixed(decimals))); return u; }, [sv, decimals]);
  return <span ref={ref} className={className} style={style}>{prefix}{display}{suffix}</span>;
}

export function StaggerText({ text, className, style, staggerDelay = 0.08, once = true, as: Tag = "div" }: { text: string; className?: string; style?: CSSProperties; staggerDelay?: number; once?: boolean; as?: "h1" | "h2" | "h3" | "p" | "span" | "div" }) {
  const words = text.split(" ");
  return (
    <Tag className={className} style={style}>
      {words.map((word, i) => (
        <motion.span key={`${word}-${i}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once }} transition={{ delay: i * staggerDelay, duration: 0.5 }} className="inline-block mr-[0.3em]">{word}</motion.span>
      ))}
    </Tag>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}>
      {children}
    </motion.div>
  );
}

export function ScrollProgress({ color = "#4274B9", height = 2, zIndex = 9999 }: { color?: string; height?: number; zIndex?: number }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const h = () => {
      const d = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(d <= 0 ? 0 : Math.min(window.scrollY / d, 1));
    };
    window.addEventListener("scroll", h, { passive: true });
    h();
    return () => window.removeEventListener("scroll", h);
  }, []);
  if (progress <= 0) return null;
  return <div className="fixed top-0 left-0 right-0 pointer-events-none" style={{ zIndex }}><div style={{ height, width: `${progress * 100}%`, background: `linear-gradient(90deg, ${color}, ${color}CC)`, boxShadow: `0 0 10px ${color}60`, transition: "width 100ms linear" }} /></div>;
}

export function TiltCard({ children, className, style, maxTilt = 6, glowColor, scale = 1.02 }: { children: ReactNode; className?: string; style?: CSSProperties; maxTilt?: number; glowColor?: string; scale?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20 });
  const onMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ry.set(((e.clientX - r.left - r.width / 2) / (r.width / 2)) * maxTilt);
    rx.set(-((e.clientY - r.top - r.height / 2) / (r.height / 2)) * maxTilt);
  }, [maxTilt, rx, ry]);
  const onLeave = useCallback(() => { rx.set(0); ry.set(0); }, [rx, ry]);
  return (
    <motion.div ref={ref} className={className} style={{ ...style, perspective: "800px", transformStyle: "preserve-3d", rotateX: srx, rotateY: sry }} whileHover={{ scale }} onMouseMove={onMove} onMouseLeave={onLeave} transition={{ type: "spring", stiffness: 300, damping: 20 }}>{children}</motion.div>
  );
}

export function LivePulseBorder({ children, active = true, color = "#EF4444", rounded = "rounded-2xl", className = "" }: { children: ReactNode; active?: boolean; color?: string; rounded?: string; className?: string }) {
  if (!active) return <>{children}</>;
  return (
    <div className={`relative ${className}`}>
      <div className={`absolute -inset-[1px] ${rounded} opacity-60`} style={{ background: `linear-gradient(135deg, ${color}40, transparent, ${color}40)`, animation: "livePulse 2s ease-in-out infinite" }} />
      <style>{`@keyframes livePulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }`}</style>
      <div className={`relative ${rounded} overflow-hidden`}>{children}</div>
    </div>
  );
}

export function BlurImage({ src, alt, className = "", style, placeholderColor = "#111827" }: { src: string; alt: string; className?: string; style?: CSSProperties; placeholderColor?: string }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => { if (imgRef.current?.complete) setLoaded(true); }, []);
  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {!loaded && <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${placeholderColor}, ${placeholderColor}DD, ${placeholderColor})`, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />}
      <img ref={imgRef} src={src} alt={alt} className={`w-full h-full object-cover transition-all duration-700 ${loaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-md scale-105"}`} onLoad={() => setLoaded(true)} />
    </div>
  );
}

export function FadeInWhenVisible({ children, className, delay = 0, direction = "up", distance = 24, once = true }: { children: ReactNode; className?: string; delay?: number; direction?: "up" | "down" | "left" | "right" | "none"; distance?: number; once?: boolean }) {
  const offsets: Record<string, { x: number; y: number }> = { up: { x: 0, y: distance }, down: { x: 0, y: -distance }, left: { x: distance, y: 0 }, right: { x: -distance, y: 0 }, none: { x: 0, y: 0 } };
  return <motion.div className={className} initial={{ opacity: 0, ...offsets[direction] }} whileInView={{ opacity: 1, x: 0, y: 0 }} viewport={{ once, margin: "-40px" }} transition={{ delay, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}>{children}</motion.div>;
}

export function GlowingBadge({ label, color = "#EF4444", icon, pulse = true, className = "" }: { label: string; color?: string; icon?: ReactNode; pulse?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.6rem] font-bold tracking-wider ${className}`} style={{ fontFamily: "Orbitron, sans-serif", color, background: `${color}15`, border: `1px solid ${color}30`, boxShadow: pulse ? `0 0 12px ${color}20` : "none" }}>
      {pulse && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />}
      {icon}{label}
    </span>
  );
}

export function ShimmerText({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <span className={`bg-clip-text text-transparent ${className}`} style={{ ...style, backgroundImage: "linear-gradient(90deg, #4274B9 0%, #6AA3E0 40%, #E8ECF0 50%, #6AA3E0 60%, #4274B9 100%)", backgroundSize: "200% auto", animation: "vip-text-shine 3s linear infinite" }}>{children}</span>;
}
