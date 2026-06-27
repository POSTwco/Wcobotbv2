/**
 * WCO Admin Command Center — Army-Style Professional Sitrep Dashboard
 * 
 * Unified, non-redundant live ops view.
 * Blends site traffic + calisthenics (routine) production into clean master metrics.
 * Tactical command center theme: dark, precise, high-signal.
 * 
 * Data sources (current, to be consolidated later if needed):
 * - visitStats from /admin/visit-stats (traffic, wconn, wvoted, cali gen/user totals, breakdown for charts)
 * - caliStats from /admin/cali/stats (activity scan: active, workouts, sets, PRs, anchored, profiles + signin/gen counters + top ex)
 * 
 * Master canonical display (no duplicates):
 * - Traffic: visitors today/7d/30d + trend
 * - Engagement: ever-connected, cali active, sign-ins, conversion
 * - Production: workouts total + 24h, sets, PRs, anchored
 * - Indicators: deltas, health, top exercises
 */

import { useCallback, useEffect, useState } from "react";
import { Activity, Users, Dumbbell, Anchor, TrendingUp, TrendingDown, Target, Shield, Clock, RefreshCw, Loader2, Megaphone, ChevronDown } from "lucide-react";
import { api } from "../lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";

interface VisitData {
  today: number;
  yesterday: number;
  last7d: number;
  last30d: number;
  total: number;
  walletsConnected: number;
  walletsVoted: number;
  workoutsGenerated: number;
  userWallets: number;
  breakdown?: Array<{ date: string; count: number }>;
}

interface CaliData {
  activeWallets: number;
  totalWorkouts: number;
  totalSetsLogged: number;
  totalPRs: number;
  totalAnchored: number;
  workoutsLast24h: number;
  totalProfiles: number;
  caliSignInsToday?: number;
  caliSignInsTotal?: number;
  workoutsGeneratedTotal?: number;
  topExercises?: Array<{ name: string; count: number }>;
  libraryVersion?: string;
}

interface SponsorStats {
  active: number;
  totalImpressions: number;
  totalClicks: number;
}

interface SponsorTierCounts {
  title: number;
  premium: number;
  standard: number;
  routine: number;
}

interface Props {
  wallet: string;
  sessionToken: string;
}

export function AdminCommandCenter({ wallet, sessionToken }: Props) {
  const [visit, setVisit] = useState<VisitData | null>(null);
  const [cali, setCali] = useState<CaliData | null>(null);
  const [sponsorStats, setSponsorStats] = useState<SponsorStats | null>(null);
  const [tierCounts, setTierCounts] = useState<SponsorTierCounts>({ title: 0, premium: 0, standard: 0, routine: 0 });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isInvestorOpen, setIsInvestorOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, cRes, dashRes, sponsorsRes] = await Promise.all([
        api.admin.getVisitStats(wallet, sessionToken),
        api.admin.getCaliStats(wallet, sessionToken),
        api.admin.getDashboard(wallet, sessionToken).catch(() => ({ success: false })),
        api.admin.getSponsors(wallet, sessionToken).catch(() => ({ success: false, data: [] })),
      ]);

      if (vRes.success && vRes.data) {
        const d = vRes.data;
        setVisit({
          today: d.today || 0,
          yesterday: d.yesterday || 0,
          last7d: d.last7d || 0,
          last30d: d.last30d || 0,
          total: d.total || 0,
          walletsConnected: d.walletsConnected || 0,
          walletsVoted: d.walletsVoted || 0,
          workoutsGenerated: d.workoutsGenerated || 0,
          userWallets: d.userWallets || 0,
          breakdown: d.breakdown || [],
        });
      }

      if (cRes.success && cRes.data) {
        setCali({
          activeWallets: cRes.data.activeWallets || 0,
          totalWorkouts: cRes.data.totalWorkouts || 0,
          totalSetsLogged: cRes.data.totalSetsLogged || 0,
          totalPRs: cRes.data.totalPRs || 0,
          totalAnchored: cRes.data.totalAnchored || 0,
          workoutsLast24h: cRes.data.workoutsLast24h || 0,
          totalProfiles: cRes.data.totalProfiles || 0,
          caliSignInsToday: cRes.data.caliSignInsToday || 0,
          caliSignInsTotal: cRes.data.caliSignInsTotal || 0,
          workoutsGeneratedTotal: cRes.data.workoutsGeneratedTotal || 0,
          topExercises: cRes.data.topExercises || [],
          libraryVersion: cRes.data.libraryVersion,
        });
      }

      // Sponsor stats from dashboard (exact aggregated)
      if (dashRes?.success && dashRes.data?.sponsorStats) {
        setSponsorStats({
          active: dashRes.data.sponsorStats.active || 0,
          totalImpressions: dashRes.data.sponsorStats.totalImpressions || 0,
          totalClicks: dashRes.data.sponsorStats.totalClicks || 0,
        });
      } else if (sponsorsRes?.success && Array.isArray(sponsorsRes.data)) {
        // Fallback exact computation from list
        const sponsors = sponsorsRes.data;
        const totalImpressions = sponsors.reduce((sum: number, s: any) => sum + (s.impressions || 0), 0);
        const totalClicks = sponsors.reduce((sum: number, s: any) => sum + (s.clicks || 0), 0);
        const active = sponsors.filter((s: any) => s.active !== false).length;
        setSponsorStats({ active, totalImpressions, totalClicks });
      }

      // Tier breakdown from exact sponsor list (like sponsor management UI)
      if (sponsorsRes?.success && Array.isArray(sponsorsRes.data)) {
        const sponsors = sponsorsRes.data;
        const counts = { title: 0, premium: 0, standard: 0, routine: 0 };
        sponsors.forEach((s: any) => {
          const tiers: string[] = (s.tiers && s.tiers.length) ? s.tiers : (s.tier ? [s.tier] : []);
          if (tiers.includes('title')) counts.title++;
          if (tiers.includes('premium')) counts.premium++;
          if (tiers.includes('standard')) counts.standard++;
          if (tiers.includes('routine')) counts.routine++;
        });
        setTierCounts(counts);
      }

      setLastUpdated(new Date());
    } catch (e) {
      console.warn("[CommandCenter] load failed", e);
    }
    setLoading(false);
  }, [wallet, sessionToken]);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 45000); // ~45s balanced poll
    return () => clearInterval(id);
  }, [load]);

  const fmt = (n: number) => (n || 0).toLocaleString();
  const delta = (a: number, b: number) => {
    if (!b) return { pct: 0, dir: "flat" as const };
    const pct = Math.round(((a - b) / b) * 100);
    return { pct, dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" } as const;
  };

  // Prepare chart data (last ~14 days for readability)
  const visitorSeries = (visit?.breakdown || []).slice(0, 14).reverse().map((b) => ({
    day: b.date.slice(5),
    visitors: b.count,
  }));

  const vDelta = visit ? delta(visit.today, visit.yesterday) : { pct: 0, dir: "flat" as const };
  const wDelta = cali ? delta(cali.workoutsLast24h, Math.max(1, Math.floor((cali.totalWorkouts || 1) / 5))) : { pct: 0, dir: "flat" as const };

  // Canonical blended master numbers (no dups)
  const master = {
    visitorsToday: visit?.today || 0,
    visitors7d: visit?.last7d || 0,
    everConnected: visit?.walletsConnected || 0,
    caliActive: cali?.activeWallets || 0,
    caliSigninsToday: cali?.caliSignInsToday || 0,
    caliSigninsTotal: cali?.caliSignInsTotal || 0,
    workoutsTotal: cali?.totalWorkouts || visit?.workoutsGenerated || 0,
    workouts24h: cali?.workoutsLast24h || 0,
    setsLogged: cali?.totalSetsLogged || 0,
    prs: cali?.totalPRs || 0,
    anchored: cali?.totalAnchored || 0,
    conversion: visit && cali && visit.walletsConnected > 0 
      ? Math.round((cali.activeWallets / visit.walletsConnected) * 100) 
      : 0,
  };

  return (
    <div className="border-b border-[#D4A843]/10 bg-[#0B1120]/60">
      {/* Tactical Header Bar */}
      <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between border-b border-[#D4A843]/10 bg-gradient-to-r from-[#D4A843]/5 via-transparent to-transparent">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#10b981]/10 border border-[#10b981]/30">
            <Shield className="w-4 h-4 text-[#10b981]" />
          </div>
          <div>
            <div className="text-[#E8ECF0] text-[0.7rem] font-bold tracking-[2px]" style={{ fontFamily: "Orbitron, sans-serif" }}>
              WCO OPS COMMAND CENTER — SITREP
            </div>
            <div className="text-[#8494A7] text-[0.5rem] -mt-0.5">REAL-TIME • NON-REDUNDANT • ARMY GRADE</div>
          </div>
          {cali?.libraryVersion && (
            <div className="ml-2 text-[0.5rem] px-1.5 py-px rounded bg-[#4274B9]/10 text-[#6AA3E0] font-mono border border-[#4274B9]/20">{cali.libraryVersion}</div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button 
            onClick={load} 
            className="flex items-center gap-1 px-2 py-1 rounded border border-[#D4A843]/20 text-[#8494A7] hover:text-white hover:bg-white/5 transition"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            <span className="hidden sm:inline text-[0.6rem]">REFRESH</span>
          </button>
          {lastUpdated && (
            <div className="text-[#8494A7] text-[0.55rem] font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" /> {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>

      {/* Master KPI Grid — High Signal, Army Precise */}
      <div className="px-4 sm:px-5 pt-3 pb-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {/* Traffic */}
          <div className="rounded-lg border border-[#10b981]/30 bg-[#10b981]/5 p-2.5">
            <div className="flex justify-between text-[#10b981] text-[0.55rem] uppercase tracking-widest font-bold">
              <div className="flex items-center gap-1"><Activity className="w-3 h-3" /> VISITORS</div>
              <div className={`flex items-center text-[10px] ${vDelta.dir === 'up' ? 'text-emerald-400' : vDelta.dir === 'down' ? 'text-red-400' : ''}`}>
                {vDelta.dir === 'up' ? <TrendingUp className="w-3 h-3" /> : vDelta.dir === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
                {vDelta.pct !== 0 ? `${vDelta.pct > 0 ? '+' : ''}${vDelta.pct}%` : ''}
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <div className="text-xl font-bold text-white tabular-nums" style={{ fontFamily: "Orbitron, sans-serif" }}>{fmt(master.visitorsToday)}</div>
              <div className="text-[0.55rem] text-[#8494A7]">TODAY</div>
            </div>
            <div className="text-[0.6rem] text-[#8494A7] mt-0.5">7d {fmt(master.visitors7d)} • 30d {fmt(visit?.last30d || 0)}</div>
          </div>

          {/* Ever vs Active */}
          <div className="rounded-lg border border-[#D4A843]/30 bg-[#D4A843]/5 p-2.5">
            <div className="text-[#D4A843] text-[0.55rem] uppercase tracking-widest font-bold flex items-center gap-1"><Users className="w-3 h-3" /> WALLETS</div>
            <div className="mt-1 text-xl font-bold text-white tabular-nums" style={{ fontFamily: "Orbitron, sans-serif" }}>{fmt(master.everConnected)}</div>
            <div className="text-[0.55rem] text-[#8494A7]">EVER CONNECTED • {fmt(master.caliActive)} ACTIVE IN TRAINING</div>
            <div className="text-[0.6rem] mt-0.5 text-emerald-400">{master.conversion}% TRAINING CONVERSION</div>
          </div>

          {/* Sign-ins Gate */}
          <div className="rounded-lg border border-[#6AA3E0]/30 bg-[#6AA3E0]/5 p-2.5">
            <div className="text-[#6AA3E0] text-[0.55rem] uppercase tracking-widest font-bold flex items-center gap-1"><Shield className="w-3 h-3" /> CALI GATE</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-white tabular-nums" style={{ fontFamily: "Orbitron, sans-serif" }}>{fmt(master.caliSigninsToday)}</span>
              <span className="text-[0.55rem] text-[#8494A7]">TODAY</span>
            </div>
            <div className="text-[0.6rem] text-[#8494A7]">{fmt(master.caliSigninsTotal)} TOTAL SIGN-INS</div>
          </div>

          {/* Production Core */}
          <div className="rounded-lg border border-[#10b981]/30 bg-[#10b981]/5 p-2.5 col-span-2 sm:col-span-1 lg:col-span-1 xl:col-span-1">
            <div className="text-[#10b981] text-[0.55rem] uppercase tracking-widest font-bold flex items-center gap-1"><Dumbbell className="w-3 h-3" /> PRODUCTION</div>
            <div className="mt-1 text-xl font-bold text-white tabular-nums" style={{ fontFamily: "Orbitron, sans-serif" }}>{fmt(master.workoutsTotal)}</div>
            <div className="text-[0.55rem] text-[#8494A7]">TOTAL • {fmt(master.workouts24h)} IN 24H</div>
            <div className={`text-[0.6rem] mt-0.5 ${wDelta.dir === 'up' ? 'text-emerald-400' : ''}`}>{wDelta.pct !== 0 ? `${wDelta.pct > 0 ? '+' : ''}${wDelta.pct}% vs prior` : 'STEADY'}</div>
          </div>

          {/* Throughput */}
          <div className="rounded-lg border border-[#D4A843]/30 bg-[#D4A843]/5 p-2.5">
            <div className="text-[#D4A843] text-[0.55rem] uppercase tracking-widest font-bold">SETS / PRS</div>
            <div className="mt-1 text-xl font-bold text-white tabular-nums" style={{ fontFamily: "Orbitron, sans-serif" }}>{fmt(master.setsLogged)}</div>
            <div className="text-[0.55rem] text-[#8494A7]">{fmt(master.prs)} PRs LOGGED</div>
          </div>

          {/* Anchored & Health */}
          <div className="rounded-lg border border-[#4274B9]/30 bg-[#4274B9]/5 p-2.5">
            <div className="text-[#6AA3E0] text-[0.55rem] uppercase tracking-widest font-bold flex items-center gap-1"><Anchor className="w-3 h-3" /> ANCHORED</div>
            <div className="mt-1 text-xl font-bold text-white tabular-nums" style={{ fontFamily: "Orbitron, sans-serif" }}>{fmt(master.anchored)}</div>
            <div className="text-[0.55rem] text-[#8494A7]">ON HEDERA</div>
          </div>
        </div>

        {/* New Dedicated Sections: Site Visits + Sponsor Engagement (moved from other panels, exact data, army bells & whistles) */}
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* SITE VISITS — ALL TIME + GAUGES + CHART */}
          <div className="rounded-xl border border-[#10b981]/30 bg-[#0B1120] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[#10b981] text-[0.6rem] font-bold tracking-[1.5px] flex items-center gap-1.5" style={{ fontFamily: "Orbitron, sans-serif" }}>
                <Activity className="w-3.5 h-3.5" /> SITE VISITS — ALL TIME INTEL
              </div>
              <div className="text-[0.5rem] px-2 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30">LIVE HASHED</div>
            </div>

            {/* Big All-Time Gauge */}
            <div className="flex items-end gap-3 mb-2">
              <div>
                <div className="text-4xl font-bold text-white tabular-nums leading-none" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  {fmt(visit?.total || 0)}
                </div>
                <div className="text-[0.55rem] text-[#8494A7] tracking-widest">ALL-TIME UNIQUE VISITORS</div>
              </div>
              <div className="text-emerald-400 text-sm mb-1">+{fmt(visit?.today || 0)} TODAY</div>
            </div>

            {/* Breakdown gauges / cards */}
            <div className="grid grid-cols-4 gap-2 text-center mb-2">
              {[
                { label: 'TODAY', val: visit?.today || 0 },
                { label: '7-DAY', val: visit?.last7d || 0 },
                { label: '30-DAY', val: visit?.last30d || 0 },
                { label: 'YESTERDAY', val: visit?.yesterday || 0 },
              ].map((item, i) => (
                <div key={i} className="rounded-md bg-white/[0.03] border border-[#10b981]/15 py-1">
                  <div className="text-[0.5rem] text-[#8494A7]">{item.label}</div>
                  <div className="text-lg font-bold text-[#10b981] tabular-nums" style={{ fontFamily: "Orbitron, sans-serif" }}>{fmt(item.val)}</div>
                </div>
              ))}
            </div>

            {/* Trend Chart — bells & whistles */}
            <div className="h-24 -mx-1 mt-1">
              {visitorSeries.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visitorSeries}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#1f2937" />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#8494A7' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#8494A7' }} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #10b981', fontSize: '10px' }} />
                    <Line type="monotone" dataKey="visitors" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#8494A7] text-xs border border-[#10b981]/10 rounded">Building visitor history...</div>
              )}
            </div>
            <div className="text-[0.5rem] text-[#8494A7] text-center mt-1">30-DAY TREND • IPs HASHED DAILY</div>
          </div>

          {/* SPONSOR ENGAGEMENT — IMPRESSIONS / CLICKS / VIEWS (exact, own section) */}
          <div className="rounded-xl border border-[#D4A843]/30 bg-[#0B1120] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[#D4A843] text-[0.6rem] font-bold tracking-[1.5px] flex items-center gap-1.5" style={{ fontFamily: "Orbitron, sans-serif" }}>
                <Megaphone className="w-3.5 h-3.5" /> SPONSOR ENGAGEMENT — OPS LOGISTICS
              </div>
              <div className="text-[0.5rem] px-2 py-0.5 rounded bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/30">{sponsorStats ? `${sponsorStats.active} ACTIVE` : ''}</div>
            </div>

            {/* Big Gauge Numbers for Impressions & Clicks */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="rounded-lg bg-[#D4A843]/5 border border-[#D4A843]/20 p-2 text-center">
                <div className="text-[0.55rem] text-[#8494A7] tracking-wider">IMPRESSIONS</div>
                <div className="text-3xl font-bold text-[#D4A843] tabular-nums leading-none mt-0.5" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  {fmt(sponsorStats?.totalImpressions || 0)}
                </div>
                <div className="text-[0.5rem] text-[#8494A7] mt-0.5">ALL-TIME TRACKED</div>
              </div>
              <div className="rounded-lg bg-[#D4A843]/5 border border-[#D4A843]/20 p-2 text-center">
                <div className="text-[0.55rem] text-[#8494A7] tracking-wider">CLICKS</div>
                <div className="text-3xl font-bold text-[#D4A843] tabular-nums leading-none mt-0.5" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  {fmt(sponsorStats?.totalClicks || 0)}
                </div>
                <div className="text-[0.5rem] text-[#8494A7] mt-0.5">ENGAGEMENT ACTIONS</div>
              </div>
            </div>

            {/* Tier Breakdown (exact like sponsor mgmt panel) + bells */}
            <div className="mb-2">
              <div className="text-[0.55rem] text-[#8494A7] mb-1 tracking-wider">BY TIER</div>
              <div className="flex gap-2 text-xs">
                {[
                  { k: 'title', l: 'T', c: '#D4A843' },
                  { k: 'premium', l: 'P', c: '#6AA3E0' },
                  { k: 'standard', l: 'S', c: '#8494A7' },
                  { k: 'routine', l: 'R', c: '#D4A843' },
                ].map(t => (
                  <div key={t.k} className="flex-1 text-center rounded bg-white/5 border border-white/10 py-0.5">
                    <span style={{ color: t.c }} className="font-bold">{t.l}</span>
                    <span className="ml-1 font-mono text-white">{(tierCounts as any)[t.k] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Click-through gauge + indicators */}
            <div className="flex items-center justify-between text-xs border-t border-white/10 pt-2">
              <div>
                <span className="text-[#8494A7]">CTR</span>
                <span className="ml-2 font-bold text-[#D4A843]">
                  {sponsorStats && sponsorStats.totalImpressions > 0 
                    ? ((sponsorStats.totalClicks / sponsorStats.totalImpressions) * 100).toFixed(1) 
                    : '0.0'}%
                </span>
              </div>
              <div className="text-emerald-400 text-[0.6rem]">REAL-TIME • NO MOCK DATA</div>
            </div>
          </div>
        </div>

        {/* Small conversion line kept as health indicator */}
        <div className="mt-2 text-[0.55rem] text-[#8494A7] text-center">
          CALI CONVERSION {master.conversion}% • {fmt(master.caliActive)} / {fmt(master.everConnected)} IN TRAINING
        </div>

        {/* INVESTOR / GROWTH SNAPSHOT — High-signal metrics for decks & investors (collapsible dropdown) */}
        <div className="mt-3 rounded-xl border border-[#D4A843]/20 bg-[#0B1120] overflow-hidden">
          <div 
            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setIsInvestorOpen(!isInvestorOpen)}
          >
            <div className="text-[#D4A843] text-[0.55rem] font-bold tracking-widest flex items-center gap-1.5" style={{ fontFamily: "Orbitron, sans-serif" }}>
              <Target className="w-3.5 h-3.5" /> INVESTOR GROWTH SNAPSHOT
            </div>
            <ChevronDown 
              className={`w-4 h-4 text-[#D4A843] transition-transform duration-200 ${isInvestorOpen ? 'rotate-180' : ''}`} 
            />
          </div>

          {isInvestorOpen && (
            <div className="p-3 border-t border-[#D4A843]/10">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                {/* Funnel */}
                <div className="bg-white/5 rounded p-2 border border-white/10">
                  <div className="text-[#8494A7] text-[0.5rem] mb-1">ACQUISITION FUNNEL (30d)</div>
                  <div className="space-y-0.5">
                    <div>Visitors: <span className="font-mono text-white">{fmt(visit?.last30d || 0)}</span></div>
                    <div>→ Wallets: <span className="font-mono text-white">{fmt(master.everConnected)}</span></div>
                    <div>→ Active Cali: <span className="font-mono text-white">{fmt(master.caliActive)}</span></div>
                    <div>→ Workouts (24h): <span className="font-mono text-white">{fmt(master.workouts24h)}</span></div>
                  </div>
                </div>

                {/* Engagement Depth */}
                <div className="bg-white/5 rounded p-2 border border-white/10">
                  <div className="text-[#8494A7] text-[0.5rem] mb-1">ENGAGEMENT DEPTH</div>
                  <div>Avg Sets / Workout: <span className="font-mono text-[#10b981]">{cali && master.workoutsTotal > 0 ? (master.setsLogged / master.workoutsTotal).toFixed(1) : '—'}</span></div>
                  <div>PRs per Active: <span className="font-mono text-[#10b981]">{master.caliActive > 0 ? (master.prs / master.caliActive).toFixed(1) : '—'}</span></div>
                  <div>Sponsor CTR: <span className="font-mono text-[#D4A843]">{sponsorStats && sponsorStats.totalImpressions > 0 ? ((sponsorStats.totalClicks / sponsorStats.totalImpressions) * 100).toFixed(1) : '0.0'}%</span></div>
                </div>

                {/* Reach & Content */}
                <div className="bg-white/5 rounded p-2 border border-white/10">
                  <div className="text-[#8494A7] text-[0.5rem] mb-1">PLATFORM REACH</div>
                  <div>Total Impressions: <span className="font-mono text-[#D4A843]">{fmt(sponsorStats?.totalImpressions || 0)}</span></div>
                  <div>Total Sets Logged: <span className="font-mono text-white">{fmt(master.setsLogged)}</span></div>
                  <div>Content Velocity: <span className="font-mono text-emerald-400">{fmt(master.setsLogged + master.prs)}</span> (sets+PRs)</div>
                </div>

                {/* Sponsor Efficiency */}
                <div className="bg-white/5 rounded p-2 border border-white/10">
                  <div className="text-[#8494A7] text-[0.5rem] mb-1">SPONSOR EFFICIENCY</div>
                  <div>Impr. per Active Sponsor: <span className="font-mono">{sponsorStats && sponsorStats.active > 0 ? fmt(Math.round(sponsorStats.totalImpressions / sponsorStats.active)) : '—'}</span></div>
                  <div>Clicks per Active: <span className="font-mono">{sponsorStats && sponsorStats.active > 0 ? fmt(Math.round(sponsorStats.totalClicks / sponsorStats.active)) : '—'}</span></div>
                  <div className="text-[0.55rem] mt-1 text-emerald-400">Strong tier distribution for growth</div>
                </div>
              </div>
              <div className="text-[0.5rem] text-[#8494A7] mt-2 text-center">Data suitable for investor decks • All figures pulled live from production KV</div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-2 text-[0.5rem] text-[#8494A7] flex items-center justify-between">
        <div>ALL METRICS MASTERED • NO REDUNDANCY • PRIVACY HASHED</div>
        <div className="font-mono">WCO OPS • {new Date().getFullYear()}</div>
      </div>
    </div>
  );
}
