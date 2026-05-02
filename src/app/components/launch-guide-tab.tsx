/**
 * BOTB Token Launch Guide Tab — Admin Command Center
 * ====================================================
 * Animated, WCO-branded condensed version of the BOTB Token Launch Guide.
 * Placed next to the Test Tools tab as "Launch".
 *
 * REMOVAL: Delete this file after successful BOTB token launch.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Rocket, ChevronDown, CheckCircle, AlertTriangle, Shield,
  Coins, Send, Code, FlaskConical, Megaphone, Key,
  Sparkles, Crown, Flame, Star,
  Copy, ExternalLink, ArrowRight, Info, Zap,
  Hash, Lock, RefreshCw, Pause,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";

const ORBITRON = { fontFamily: "Orbitron, sans-serif" } as const;

// ─── Floating particle effect ──────────────────────────────────────────────
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: i % 3 === 0 ? "#D4A843" : i % 3 === 1 ? "#4274B9" : "#6AA3E0",
            left: `${8 + (i * 7.5) % 85}%`,
            top: `${10 + (i * 13) % 80}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.15, 0.5, 0.15],
            scale: [0.8, 1.3, 0.8],
          }}
          transition={{
            duration: 3 + (i % 3),
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Step progress tracker ─────────────────────────────────────────────────
function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className={`h-1 rounded-full transition-all duration-500 ${
            i <= current ? "bg-[#D4A843]" : "bg-[#1e293b]"
          }`}
          style={{ width: i === current ? 24 : 8 }}
          animate={i === current ? { opacity: [0.7, 1, 0.7] } : {}}
          transition={i === current ? { duration: 1.5, repeat: Infinity } : {}}
        />
      ))}
    </div>
  );
}

// ─── Copyable code block ───────────────────────────────────────────────────
function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="relative group/code">
      {label && (
        <span className="text-[0.5rem] text-[#8494A7] uppercase tracking-wider mb-1 block" style={ORBITRON}>
          {label}
        </span>
      )}
      <div className="bg-[#060b14] rounded-lg p-3 border border-[#1e293b] font-mono text-xs text-[#6AA3E0] overflow-x-auto">
        <pre className="whitespace-pre-wrap">{code}</pre>
      </div>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-[#0B1120] border border-[#1e293b] opacity-0 group-hover/code:opacity-100 transition-all hover:border-[#D4A843]/40"
      >
        {copied ? (
          <CheckCircle className="w-3 h-3 text-[#10b981]" />
        ) : (
          <Copy className="w-3 h-3 text-[#8494A7]" />
        )}
      </button>
    </div>
  );
}

// ─── Key badge ─────────────────────────────────────────────────────────────
function KeyBadge({ name, status }: { name: string; status: "required" | "recommended" | "skip" }) {
  const colors = {
    required: { bg: "bg-[#EF4444]/10", border: "border-[#EF4444]/25", text: "text-[#EF4444]", label: "MUST SET" },
    recommended: { bg: "bg-[#D4A843]/10", border: "border-[#D4A843]/25", text: "text-[#D4A843]", label: "SET IT" },
    skip: { bg: "bg-[#8494A7]/10", border: "border-[#8494A7]/25", text: "text-[#8494A7]", label: "SKIP" },
  };
  const c = colors[status];
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${c.bg} border ${c.border}`}>
      <div className="flex items-center gap-2">
        <Key className={`w-3 h-3 ${c.text}`} />
        <span className="text-[0.65rem] text-[#E8ECF0] font-semibold">{name}</span>
      </div>
      <span className={`text-[0.45rem] font-bold tracking-wider px-1.5 py-0.5 rounded ${c.bg} ${c.text}`} style={ORBITRON}>
        {c.label}
      </span>
    </div>
  );
}

// ─── Checklist item ────────────────────────────────────────────────────────
function CheckItem({ children, checked, onToggle }: { children: React.ReactNode; checked: boolean; onToggle: () => void }) {
  return (
    <motion.button
      onClick={onToggle}
      className="flex items-start gap-2.5 text-left w-full group/check"
      whileTap={{ scale: 0.98 }}
    >
      <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
        checked
          ? "bg-[#10b981]/20 border-[#10b981]/40"
          : "bg-transparent border-[#8494A7]/30 group-hover/check:border-[#D4A843]/40"
      }`}>
        {checked && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}>
            <CheckCircle className="w-3 h-3 text-[#10b981]" />
          </motion.div>
        )}
      </div>
      <span className={`text-xs transition-all ${checked ? "text-[#8494A7] line-through" : "text-[#E8ECF0]"}`}>
        {children}
      </span>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN LAUNCH GUIDE TAB
// ═══════════════════════════════════════════════════════════════════════════════

export function LaunchGuideTab() {
  const [openStep, setOpenStep] = useState<string | null>("overview");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [showConfetti, setShowConfetti] = useState(false);

  const toggleCheck = (id: string) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const totalChecks = 12;
  const progress = Math.min(checkedCount / totalChecks, 1);

  // Trigger confetti when all items checked
  useEffect(() => {
    if (checkedCount >= totalChecks && !showConfetti) {
      setShowConfetti(true);
    }
  }, [checkedCount, showConfetti, totalChecks]);

  const toggleStep = (id: string) => setOpenStep(openStep === id ? null : id);

  // ─── Step sections ────────────────────────────────────────────────────
  const steps = [
    {
      id: "overview",
      icon: <Rocket className="w-4 h-4" />,
      title: "What You're About to Do",
      accent: "#D4A843",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-[#E8ECF0]">
            You're creating a digital voting token called <span className="text-[#D4A843] font-bold">WCO</span> on the Hedera network.
          </p>
          <div className="bg-[#162033] rounded-xl p-4 border border-[#4274B9]/15 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#D4A843]/10 border border-[#D4A843]/20 flex items-center justify-center flex-shrink-0">
                <Coins className="w-4 h-4 text-[#D4A843]" />
              </div>
              <div>
                <p className="text-xs text-[#E8ECF0] font-semibold">It's a voting weight, not money</p>
                <p className="text-[0.65rem] text-[#8494A7] mt-0.5">
                  Holding WCO tokens is like holding season tickets. More tokens = louder voice when voting on battles. Tokens NEVER leave anyone's wallet during a vote.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#4274B9]/10 border border-[#4274B9]/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-[#6AA3E0]" />
              </div>
              <div>
                <p className="text-xs text-[#E8ECF0] font-semibold">The website already knows what to do</p>
                <p className="text-[0.65rem] text-[#8494A7] mt-0.5">
                  Right now, everyone gets 1 vote ("headcount mode"). Once you create the token and paste its ID into one line of code, the site automatically starts checking everyone's balance and weighting their votes.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#D4A843]/5 border border-[#D4A843]/15">
            <Info className="w-3.5 h-3.5 text-[#D4A843] flex-shrink-0" />
            <p className="text-[0.6rem] text-[#D4A843]">
              <strong>Total time:</strong> About 30 minutes from start to live token-weighted voting.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "prerequisites",
      icon: <Shield className="w-4 h-4" />,
      title: "Before You Start",
      accent: "#4274B9",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-[#8494A7]">Make sure you have all of these ready before proceeding:</p>
          <div className="space-y-2">
            <CheckItem checked={!!checklist["pre-wallet"]} onToggle={() => toggleCheck("pre-wallet")}>
              <strong>Hedera mainnet account</strong> (your treasury, e.g. 0.0.5402824) loaded in HashPack
            </CheckItem>
            <CheckItem checked={!!checklist["pre-hbar"]} onToggle={() => toggleCheck("pre-hbar")}>
              <strong>5-10 HBAR</strong> in your treasury for fees (token creation costs ~1-2 HBAR)
            </CheckItem>
            <CheckItem checked={!!checklist["pre-test"]} onToggle={() => toggleCheck("pre-test")}>
              <strong>A second Hedera account</strong> for testing (any account, even a friend's)
            </CheckItem>
            <CheckItem checked={!!checklist["pre-github"]} onToggle={() => toggleCheck("pre-github")}>
              <strong>GitHub access</strong> to the repo, OR a developer who has it
            </CheckItem>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/15">
            <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] flex-shrink-0" />
            <p className="text-[0.6rem] text-[#EF4444]/80">
              Do this on a <strong>computer</strong>, not a phone. You'll need to copy-paste things.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "create",
      icon: <Coins className="w-4 h-4" />,
      title: "Step 1 — Create the Token",
      accent: "#D4A843",
      content: (
        <div className="space-y-4">
          <p className="text-xs text-[#8494A7]">Pick whichever method feels most comfortable:</p>

          {/* Method cards */}
          {[
            { label: "A", title: "HashPack Token Creator", desc: "Easiest — built right into your wallet", steps: [
              "Open HashPack in your browser",
              "Click your treasury account",
              'Look for "Create Token" or the "+" button near your token list',
              "Fill in the settings (see Key Settings below)",
              'Click "Create" and approve the transaction',
            ]},
            { label: "B", title: "Hedera Portal", desc: "Official Hedera web interface", steps: [
              "Go to portal.hedera.com",
              'Navigate to "Tokens" in the sidebar',
              'Click "Create Token"',
              "Fill in settings and approve via HashPack",
            ]},
          ].map(m => (
            <div key={m.label} className="bg-[#0B1120] rounded-xl border border-[#1e293b] overflow-hidden">
              <div className="flex items-center gap-3 p-3 border-b border-[#1e293b]">
                <span className="w-6 h-6 rounded-full bg-[#D4A843]/15 border border-[#D4A843]/30 flex items-center justify-center text-[0.5rem] text-[#D4A843] font-bold" style={ORBITRON}>
                  {m.label}
                </span>
                <div>
                  <p className="text-xs text-[#E8ECF0] font-semibold">{m.title}</p>
                  <p className="text-[0.55rem] text-[#8494A7]">{m.desc}</p>
                </div>
              </div>
              <ol className="p-3 space-y-1.5">
                {m.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[0.65rem] text-[#8494A7]">
                    <span className="text-[#D4A843]/60 font-bold mt-0.5" style={ORBITRON}>{i + 1}.</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          ))}

          {/* Required settings */}
          <div className="bg-[#162033] rounded-xl p-4 border border-[#4274B9]/15">
            <p className="text-[0.65rem] text-[#6AA3E0] font-bold tracking-wider mb-3" style={ORBITRON}>
              TOKEN SETTINGS
            </p>
            <div className="grid grid-cols-2 gap-2 text-[0.6rem]">
              {[
                ["Name", "Battle of the Bars"],
                ["Symbol", "WCO"],
                ["Type", "Fungible"],
                ["Decimals", "0 (whole numbers)"],
                ["Initial Supply", "Your choice (see note)"],
                ["Treasury", "Your account ID"],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col p-2 rounded-lg bg-[#0B1120]/60 border border-[#1e293b]/40">
                  <span className="text-[#8494A7] text-[0.5rem] uppercase tracking-wider">{k}</span>
                  <span className="text-[#E8ECF0] font-semibold mt-0.5">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-start gap-2 px-2 py-2 rounded-lg bg-[#D4A843]/5 border border-[#D4A843]/15">
              <Info className="w-3 h-3 text-[#D4A843] mt-0.5 flex-shrink-0" />
              <p className="text-[0.55rem] text-[#D4A843]/80">
                <strong>Supply guide:</strong> 100 members = ~1M tokens. 1,000 members = ~100M tokens. You can always mint more later.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "keys",
      icon: <Key className="w-4 h-4" />,
      title: "Step 2 — Set Your Keys",
      accent: "#EF4444",
      content: (
        <div className="space-y-3">
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/15">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-[#EF4444] font-bold">THE GOLDEN RULE</p>
              <p className="text-[0.6rem] text-[#EF4444]/80 mt-0.5">
                If you don't set a key during creation, you can <strong>NEVER</strong> add it later. It's permanent. When in doubt, SET IT. You can always remove a key later, but you can never add one.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <KeyBadge name="Admin Key" status="required" />
            <KeyBadge name="Supply Key" status="required" />
            <KeyBadge name="Freeze Key" status="required" />
            <KeyBadge name="Pause Key" status="required" />
            <KeyBadge name="Wipe Key" status="recommended" />
            <KeyBadge name="Metadata Key" status="recommended" />
            <KeyBadge name="KYC Key" status="skip" />
          </div>
          <div className="bg-[#162033] rounded-xl p-3 border border-[#4274B9]/15 space-y-2 text-[0.6rem] text-[#8494A7]">
            <p><strong className="text-[#E8ECF0]">Admin Key</strong> — Master key. Can change all other keys. Set to your treasury.</p>
            <p><strong className="text-[#E8ECF0]">Supply Key</strong> — Required to mint more tokens or burn tokens. The "Clean Three" burn model needs this.</p>
            <p><strong className="text-[#E8ECF0]">Freeze Key</strong> — Can freeze a bad actor's tokens if someone cheats.</p>
            <p><strong className="text-[#E8ECF0]">Pause Key</strong> — Emergency brake. Freezes ALL WCO transfers globally.</p>
            <p><strong className="text-[#E8ECF0]">Wipe Key</strong> — Nuclear option. Lets you delete tokens from a specific account. Optional.</p>
            <p className="text-[#8494A7]/60"><strong>KYC Key</strong> — SKIP. Would require manually approving every holder. Way too much friction.</p>
          </div>
        </div>
      ),
    },
    {
      id: "token-id",
      icon: <Hash className="w-4 h-4" />,
      title: "Step 3 — Write Down the Token ID",
      accent: "#10b981",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-[#8494A7]">
            After creation, Hedera gives your token a unique ID. This is the single most important number.
          </p>
          <div className="bg-[#162033] rounded-xl p-4 border border-[#10b981]/20 text-center">
            <p className="text-[0.5rem] text-[#8494A7] uppercase tracking-wider mb-2" style={ORBITRON}>YOUR TOKEN ID LOOKS LIKE</p>
            <p className="text-xl text-[#10b981] font-bold font-mono">0.0.XXXXXXX</p>
            <p className="text-[0.55rem] text-[#8494A7] mt-2">The first two numbers are always 0.0 — the last number is unique to YOUR token</p>
          </div>
          <div className="space-y-2">
            <CheckItem checked={!!checklist["id-written"]} onToggle={() => toggleCheck("id-written")}>
              Written on a sticky note on my monitor
            </CheckItem>
            <CheckItem checked={!!checklist["id-phone"]} onToggle={() => toggleCheck("id-phone")}>
              Saved in a note on my phone
            </CheckItem>
            <CheckItem checked={!!checklist["id-hashscan"]} onToggle={() => toggleCheck("id-hashscan")}>
              Verified on HashScan — I can see my token's page
            </CheckItem>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://hashscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4274B9]/10 border border-[#4274B9]/20 text-[0.6rem] text-[#6AA3E0] hover:bg-[#4274B9]/15 transition-all"
            >
              <ExternalLink className="w-3 h-3" />
              Open HashScan
            </a>
          </div>
        </div>
      ),
    },
    {
      id: "distribute",
      icon: <Send className="w-4 h-4" />,
      title: "Step 4 — Distribute Tokens",
      accent: "#6AA3E0",
      content: (
        <div className="space-y-4">
          <div className="bg-[#EF4444]/5 rounded-xl p-3 border border-[#EF4444]/15">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
              <p className="text-xs text-[#EF4444] font-bold" style={ORBITRON}>TOKEN ASSOCIATION</p>
            </div>
            <p className="text-[0.65rem] text-[#EF4444]/80">
              Before someone can receive WCO, they must <strong>"associate"</strong> with it in HashPack. This costs them ~0.05 HBAR. If they don't associate first, your transfer to them will FAIL. This is the #1 mistake people make.
            </p>
          </div>

          <div className="bg-[#162033] rounded-xl p-4 border border-[#4274B9]/15">
            <p className="text-[0.65rem] text-[#6AA3E0] font-bold tracking-wider mb-2" style={ORBITRON}>
              TELL YOUR COMMUNITY
            </p>
            <ol className="space-y-1.5 text-[0.65rem] text-[#8494A7]">
              <li className="flex items-start gap-2"><span className="text-[#D4A843] font-bold">1.</span> Open HashPack</li>
              <li className="flex items-start gap-2"><span className="text-[#D4A843] font-bold">2.</span> Click "Add Token" or the + icon</li>
              <li className="flex items-start gap-2"><span className="text-[#D4A843] font-bold">3.</span> Search for your Token ID</li>
              <li className="flex items-start gap-2"><span className="text-[#D4A843] font-bold">4.</span> Click "Associate" and approve the tiny HBAR fee</li>
              <li className="flex items-start gap-2"><span className="text-[#D4A843] font-bold">5.</span> Done — they can now receive WCO tokens</li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0B1120] rounded-xl p-3 border border-[#1e293b]">
              <p className="text-[0.5rem] text-[#8494A7] uppercase tracking-wider mb-1" style={ORBITRON}>Under 50 people</p>
              <p className="text-[0.6rem] text-[#E8ECF0]">Send individually via HashPack's "Send" button</p>
            </div>
            <div className="bg-[#0B1120] rounded-xl p-3 border border-[#1e293b]">
              <p className="text-[0.5rem] text-[#8494A7] uppercase tracking-wider mb-1" style={ORBITRON}>50+ people</p>
              <p className="text-[0.6rem] text-[#E8ECF0]">Use a CSV airdrop tool like launchpage.xyz</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "flip-switch",
      icon: <Code className="w-4 h-4" />,
      title: "Step 5 — Flip the Switch",
      accent: "#A855F7",
      content: (
        <div className="space-y-4">
          <p className="text-xs text-[#8494A7]">
            This is where you activate token-weighted voting. It's <strong className="text-[#E8ECF0]">one line of code</strong>.
          </p>

          <div className="bg-[#162033] rounded-xl p-4 border border-[#A855F7]/15">
            <p className="text-[0.6rem] text-[#A855F7] font-bold tracking-wider mb-2" style={ORBITRON}>
              OPTION A — TELL YOUR DEVELOPER
            </p>
            <p className="text-[0.65rem] text-[#8494A7] mb-3">Copy and send them this exact message:</p>
            <CodeBlock
              label="Message to developer"
              code={`The WCO token is live. Token ID: 0.0.XXXXXXX\n\nUpdate BOTB_TOKEN_ID in\n/supabase/functions/server/index.tsx (line ~2388)\nfrom null to "0.0.XXXXXXX" and deploy.`}
            />
          </div>

          <div className="bg-[#162033] rounded-xl p-4 border border-[#A855F7]/15">
            <p className="text-[0.6rem] text-[#A855F7] font-bold tracking-wider mb-2" style={ORBITRON}>
              OPTION B — DO IT YOURSELF
            </p>
            <p className="text-[0.55rem] text-[#8494A7] mb-2">In the GitHub repo, find this line:</p>
            <CodeBlock
              label="Before (current)"
              code={`const BOTB_TOKEN_ID: string | null = null;`}
            />
            <div className="flex justify-center my-2">
              <ArrowRight className="w-4 h-4 text-[#D4A843] rotate-90" />
            </div>
            <CodeBlock
              label="After (your token ID)"
              code={`const BOTB_TOKEN_ID: string | null = "0.0.XXXXXXX";`}
            />
            <p className="text-[0.55rem] text-[#8494A7] mt-2">Commit, push, Vercel auto-deploys in ~2-3 minutes.</p>
          </div>

          <div className="space-y-2">
            <CheckItem checked={!!checklist["code-updated"]} onToggle={() => toggleCheck("code-updated")}>
              Code updated with real Token ID and deployed
            </CheckItem>
          </div>
        </div>
      ),
    },
    {
      id: "test",
      icon: <FlaskConical className="w-4 h-4" />,
      title: "Step 6 — Test It Live",
      accent: "#10b981",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-[#8494A7]">Before announcing, run through this with a test wallet:</p>
          <div className="space-y-2">
            <CheckItem checked={!!checklist["test-associate"]} onToggle={() => toggleCheck("test-associate")}>
              At least 2 wallets hold WCO tokens (treasury + test wallet)
            </CheckItem>
            <CheckItem checked={!!checklist["test-balance"]} onToggle={() => toggleCheck("test-balance")}>
              Connected test wallet — WCO balance shows in the wallet panel
            </CheckItem>
            <CheckItem checked={!!checklist["test-vote"]} onToggle={() => toggleCheck("test-vote")}>
              Cast a test vote with token weight on an open battle
            </CheckItem>
            <CheckItem checked={!!checklist["test-logs"]} onToggle={() => toggleCheck("test-logs")}>
              Checked Supabase logs — seeing "verifiedBalance" in vote entries
            </CheckItem>
          </div>
          <div className="bg-[#162033] rounded-xl p-3 border border-[#10b981]/15 text-[0.6rem] text-[#8494A7]">
            <p className="text-[#10b981] font-bold text-xs mb-1">What success looks like in logs:</p>
            <code className="text-[#6AA3E0] font-mono text-[0.55rem]">
              [VOTE] verifiedBalance: 50000 | weightedVote: 100000 (2x Governor)
            </code>
          </div>
        </div>
      ),
    },
    {
      id: "announce",
      icon: <Megaphone className="w-4 h-4" />,
      title: "Step 7 — Announce & Go Live",
      accent: "#f59e0b",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-[#8494A7]">You're ready. Tell the world:</p>
          <div className="bg-[#162033] rounded-xl p-4 border border-[#f59e0b]/15 space-y-2 text-[0.65rem] text-[#8494A7]">
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <p>Announce the WCO token is live + share the Token ID</p>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <p>Remind everyone to <strong className="text-[#E8ECF0]">associate</strong> before they can receive tokens</p>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <p>Explain: tokens are voting weight only — they NEVER leave your wallet</p>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <p>Open a battle and let the community vote</p>
            </div>
          </div>
          <CheckItem checked={!!checklist["announced"]} onToggle={() => toggleCheck("announced")}>
            Community notified and first battle is LIVE with token-weighted voting
          </CheckItem>
        </div>
      ),
    },
    {
      id: "emergency",
      icon: <Lock className="w-4 h-4" />,
      title: "Emergency Procedures",
      accent: "#EF4444",
      content: (
        <div className="space-y-3">
          <div className="grid gap-2">
            {[
              {
                icon: <Pause className="w-3.5 h-3.5 text-[#EF4444]" />,
                title: "Pause All Transfers",
                desc: "Use the Pause Key in HashPack to freeze ALL WCO transfers globally.",
              },
              {
                icon: <RefreshCw className="w-3.5 h-3.5 text-[#f59e0b]" />,
                title: "Revert to Headcount Mode",
                desc: "Change BOTB_TOKEN_ID back to null and deploy. Instant revert to 1-wallet-1-vote.",
              },
              {
                icon: <Shield className="w-3.5 h-3.5 text-[#6AA3E0]" />,
                title: "Freeze a Bad Actor",
                desc: "Use the Freeze Key to freeze tokens in a specific account that's cheating.",
              },
            ].map(e => (
              <div key={e.title} className="flex items-start gap-3 p-3 rounded-xl bg-[#0B1120] border border-[#1e293b]">
                <div className="w-7 h-7 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {e.icon}
                </div>
                <div>
                  <p className="text-xs text-[#E8ECF0] font-semibold">{e.title}</p>
                  <p className="text-[0.6rem] text-[#8494A7] mt-0.5">{e.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="relative">
      <FloatingParticles />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <motion.div
            className="relative"
            animate={{ rotate: [0, -3, 3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4A843]/20 to-[#D4A843]/5 border border-[#D4A843]/30 flex items-center justify-center overflow-hidden">
              <ImageWithFallback src={botbShield} alt="BOTB" className="w-8 h-8 object-contain" />
            </div>
            <motion.div
              className="absolute -inset-1 rounded-xl bg-[#D4A843]/10 blur-md -z-10"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
          <div>
            <h3 className="text-[#E8ECF0] font-bold" style={{ ...ORBITRON, fontSize: "0.85rem" }}>
              BOTB TOKEN LAUNCH
            </h3>
            <p className="text-[#8494A7] text-xs">
              Step-by-step guide to go from headcount to token-weighted voting
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B1120] border border-[#1e293b]">
          <StepProgress current={Math.min(Math.floor(progress * 10), 9)} total={10} />
          <div className="flex-1 h-2 rounded-full bg-[#1e293b] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: progress >= 1
                  ? "linear-gradient(90deg, #10b981, #D4A843)"
                  : "linear-gradient(90deg, #4274B9, #6AA3E0)",
              }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <span className="text-[0.6rem] text-[#8494A7] font-mono whitespace-nowrap">
            {checkedCount}/{totalChecks}
          </span>
        </div>
      </motion.div>

      {/* Steps accordion */}
      <div className="space-y-2 relative z-10">
        {steps.map((step, idx) => {
          const isOpen = openStep === step.id;
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="bg-[#0d1526] rounded-xl border overflow-hidden transition-all duration-300"
              style={{
                borderColor: isOpen ? `${step.accent}30` : "rgba(30,41,59,0.5)",
                boxShadow: isOpen ? `0 0 20px ${step.accent}08` : "none",
              }}
            >
              <button
                onClick={() => toggleStep(step.id)}
                className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-[#162033]/30 transition-all"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300"
                  style={{
                    background: `${step.accent}${isOpen ? "20" : "10"}`,
                    border: `1px solid ${step.accent}${isOpen ? "40" : "20"}`,
                    color: step.accent,
                  }}
                >
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[0.65rem] font-bold text-[#E8ECF0] tracking-wide" style={ORBITRON}>
                    {step.title}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-[#8494A7]" />
                </motion.div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3.5 pb-4 pt-1">{step.content}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CELEBRATION FOOTER — Congratulations & Good Luck
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 relative"
      >
        {/* Gold border glow */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#D4A843]/30 via-[#D4A843]/10 to-[#D4A843]/30 blur-sm pointer-events-none" />

        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#111d30] to-[#0d1526] border border-[#D4A843]/20">
          {/* Shimmer overlay */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%]"
              style={{
                background: "linear-gradient(115deg, transparent 30%, rgba(212,168,67,0.04) 50%, transparent 70%)",
              }}
              animate={{ x: ["0%", "60%"], y: ["0%", "60%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
          </div>

          <div className="relative p-6 sm:p-8 text-center">
            {/* WCO Logo */}
            <motion.div
              className="flex justify-center mb-4"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D4A843]/15 to-transparent border border-[#D4A843]/25 flex items-center justify-center p-2">
                <ImageWithFallback src={wcoLogoWhite} alt="WCO" className="w-10 h-10 object-contain" />
              </div>
            </motion.div>

            {/* Stars */}
            <div className="flex justify-center gap-1 mb-3">
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.15,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Star className="w-3.5 h-3.5 text-[#D4A843] fill-[#D4A843]" />
                </motion.div>
              ))}
            </div>

            <motion.h3
              className="text-[#D4A843] font-black text-sm sm:text-base tracking-wider mb-2"
              style={ORBITRON}
              animate={{ textShadow: ["0 0 10px rgba(212,168,67,0.2)", "0 0 25px rgba(212,168,67,0.4)", "0 0 10px rgba(212,168,67,0.2)"] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              CONGRATULATIONS
            </motion.h3>

            <p className="text-[#E8ECF0] text-sm font-semibold mb-1">
              You made it here.
            </p>
            <p className="text-[#8494A7] text-xs max-w-md mx-auto leading-relaxed mb-4">
              From the very first wireframe to a live Web3 voting platform on Hedera mainnet &mdash;
              the World Calisthenics Organization is building something that has never been done before
              in professional sports. Token-weighted athlete battles. Governor NFT voting power.
              A community that doesn't just watch &mdash; they decide.
            </p>

            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#D4A843]/30" />
              <Crown className="w-4 h-4 text-[#D4A843]" />
              <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#D4A843]/30" />
            </div>

            <p className="text-[#D4A843] text-xs font-bold tracking-wide mb-1" style={ORBITRON}>
              WORLD CALISTHENICS ORGANIZATION
            </p>
            <p className="text-[#8494A7] text-[0.6rem] italic">
              "The bars don't lie."
            </p>

            <motion.div
              className="mt-5 flex items-center justify-center gap-2"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Flame className="w-4 h-4 text-[#EF4444]" />
              <span className="text-xs text-[#E8ECF0] font-bold tracking-wide" style={ORBITRON}>
                GOOD LUCK ON LAUNCH DAY
              </span>
              <Flame className="w-4 h-4 text-[#EF4444]" />
            </motion.div>

            <p className="text-[0.5rem] text-[#8494A7]/40 mt-4" style={ORBITRON}>
              DELETE THIS TAB AFTER SUCCESSFUL TOKEN LAUNCH
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}