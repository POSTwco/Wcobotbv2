import { useEffect, type RefObject } from "react";
import { api } from "./api";
import type { Sponsor, SponsorTier } from "./types";

const tracked = new Set<string>();

export function hasTier(sp: Sponsor, tier: SponsorTier | string): boolean {
  if (sp.tiers && sp.tiers.length > 0) return sp.tiers.includes(tier as SponsorTier);
  return sp.tier === tier;
}

export function trackImpression(sp: Sponsor, spot = "default") {
  const key = `${spot}:${sp.id}`;
  if (tracked.has(key)) return;
  tracked.add(key);
  api.trackSponsorImpression(sp.id).catch(() => {});
}

export function openSponsor(sp: Sponsor) {
  api.trackSponsorClick(sp.id).catch(() => {});
  const url = sp.ctaUrl || sp.websiteUrl;
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

export function useViewportImpression(
  sp: Sponsor | null,
  ref: RefObject<HTMLElement | null>,
  spot = "default",
) {
  useEffect(() => {
    if (!sp || !ref.current) return;
    const key = `${spot}:${sp.id}`;
    if (tracked.has(key)) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) trackImpression(sp, spot); },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [sp, ref, spot]);
}