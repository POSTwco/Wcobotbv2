/**
 * BOTB "Letter to the CEO" — Golden Envelope Modal
 * ==================================================
 * A motivational manifesto spoken by the BOTB protocol itself to the
 * founder/CEO of the World Calisthenics Organization.
 *
 * Blends the emotional intensity of Tony Robbins, the fighter-spirit
 * rawness of Dana White, and the visionary elegance of Steve Jobs —
 * grounded in every real technical and economic truth of this protocol.
 *
 * Triggered by an interactive golden envelope button in the Admin Manual.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Crown, Shield, Zap, Flame,
  Heart, Star, ArrowRight, Sparkles,
} from "lucide-react";

// WCO Official Logo
import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";

// ---------------------------------------------------------------------------
// Letter Content — 8 Stages
// ---------------------------------------------------------------------------

interface LetterStage {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  paragraphs: string[];
}

const LETTER_STAGES: LetterStage[] = [
  {
    id: "awakening",
    title: "THE AWAKENING",
    subtitle: "I Am Your Protocol",
    icon: <Sparkles className="w-5 h-5" />,
    color: "#D4A843",
    paragraphs: [
      "Before you read another line of code, before you check another dashboard metric, before you answer another message — stop. Breathe. And listen to me. Because I need you to hear this.",
      "I am Battle of the Bars. I am the protocol you built with your own hands when nobody was watching. I am the late nights and the early mornings. I am every line of code, every route, every cryptographic signature that flows through my veins. I am 32 server routes and 20 whitepaper sections. I am three NFT collections and three billion tokens. I am the architecture you willed into existence when the world hadn't yet learned my name.",
      "And I need you to understand something that will change everything: You didn't just build a platform. You built a movement. You gave competitive calisthenics a financial nervous system, a governance brain, and a beating digital heart. The moment you chose Hedera Hashgraph — the moment you decided that every vote would be cryptographically verified, that every token would be immutably capped, that every athlete's reputation would live on-chain — that was the moment you separated yourself from every other sports project that ever launched and quietly died.",
      "You are still here. The code is still running. The protocol is alive. And that, right there, is the first victory most founders never achieve.",
    ],
  },
  {
    id: "foundation",
    title: "THE FOUNDATION",
    subtitle: "What You Built & Why It Cannot Be Ignored",
    icon: <Shield className="w-5 h-5" />,
    color: "#4274B9",
    paragraphs: [
      "Let me tell you exactly what you're holding in your hands — because I don't think you've stopped long enough to see it clearly.",
      "You built a three-tier production architecture: a React frontend, a Hono web server running on Supabase Edge Functions, and a KV datastore integrated with the Hedera Mirror Node. You didn't build a demo. You didn't build a proof-of-concept. You built a living, breathing system where every vote passes through ED25519 cryptographic verification, where every wallet is validated against Hedera mainnet before it can cast a single ballot, where admin access requires a 3-layer security gauntlet — wallet whitelist, Mirror Node existence check, and a cryptographic challenge-sign with 5-minute nonce expiry and 20-minute session tokens stored server-side only.",
      "Do you understand what that means? It means the security architecture of your sports platform rivals fintech applications handling millions of dollars. You built rate limiting — 120 requests per minute globally, 10 per minute per wallet on voting, 3 per 5 minutes on admin challenges. You built input sanitization that strips HTML, script content, and control characters from every single user input. You built forward-only status transitions so no battle can ever be rolled back, no result can ever be manipulated.",
      "Steve Jobs once said, 'Details matter, it's worth waiting to get it right.' You got the details right. The question now isn't whether the foundation is solid — it's whether you have the courage to build the skyscraper it can support.",
    ],
  },
  {
    id: "fighters",
    title: "THE FIGHTERS",
    subtitle: "This Is About Human Beings",
    icon: <Flame className="w-5 h-5" />,
    color: "#EF4444",
    paragraphs: [
      "Now listen to me — because this is where it gets real. This is where the technology stops being technology and starts being something that matters.",
      "Tony Gaste from Mexico. Starboy from the USA. Vitalii from Russia. These aren't database records. These aren't JSON objects in a KV store. These are human beings who have dedicated their lives to pushing the limits of what the human body can achieve. They train in parks. They train on bars. They train when nobody's filming and nobody's paying. And right now, they have no economic infrastructure. No transparent ranking system. No way for a fan in Tokyo to financially back an athlete in Mexico City and share in the glory when that athlete wins.",
      "Until you. Until this protocol.",
      "Every athlete profile you store — their skills (Statics, Dynamics, Power Dynamics, Combinations & Flow, Offense & Defense — rated 0-10), their win/loss records, their streaks, their special moves — these aren't just data points. They're the foundation of digital athletic identity. You are building the on-chain reputation layer for an entire sport. When a Governor NFT holder votes to adjust an athlete's skill rating, they're participating in the most transparent athletic evaluation system ever created. No backroom deals. No politics. Just community-verified truth, recorded immutably.",
      "Dana White built the UFC from a $2 million purchase into a $12 billion empire by believing in fighters when nobody else would. You are doing the same thing for calisthenics. The difference is, you're doing it with cryptographic proof instead of pay-per-view contracts. And the athletes who sign up first? They're going to be the legends who tell the story of how it all began.",
    ],
  },
  {
    id: "technology",
    title: "THE TECHNOLOGY",
    subtitle: "Why This Architecture Is a Weapon",
    icon: <Zap className="w-5 h-5" />,
    color: "#6AA3E0",
    paragraphs: [
      "You chose Hedera Hashgraph when you could have chosen anything. You chose $0.0001 transaction finality when Ethereum was charging $50 in gas fees. You chose the Hedera Token Service for your NFTs when every other project was minting on OpenSea. You chose WalletConnect v2 with HIP-820 integration for HashPack when you could have just built a username-password login and called it a day.",
      "Every one of those decisions was a strategic act of war against mediocrity.",
      "Your voting system isn't a poll — it's a weapon-grade verification pipeline. A voter connects their HashPack wallet. Your frontend builds a human-readable vote message containing the battle ID, their chosen athlete, their token stake amount, and a cryptographic nonce. That message is sent through the WalletConnect relay to HashPack for signing. The signature comes back. Your server validates the signature content, checks the nonce hasn't been replayed, verifies the wallet exists on Hedera mainnet via the Mirror Node, confirms their BOTB token balance covers the stake, checks their NFT holdings for voting power multipliers — Governor gives 2x, Sigma gives 1.5x, both together give 3x — and only then, only after all of that, does the vote get recorded.",
      "That is not a toy. That is infrastructure. And the world doesn't have enough of it in sports.",
      "Your Three.js Governor badge rotating in WebGL on the NFT page, your snake-seeded bracket system that auto-generates matchups, your reward snapshot engine that calculates weighted vote shares to the decimal — these aren't features. They're moats. Every line of code you've written makes it harder for anyone else to replicate what you've built. And the beautiful thing about moats built in code? They compound.",
    ],
  },
  {
    id: "economics",
    title: "THE ECONOMICS",
    subtitle: "3 Billion Reasons This Changes Everything",
    icon: <Crown className="w-5 h-5" />,
    color: "#f59e0b",
    paragraphs: [
      "Three billion tokens. Fixed supply. No admin keys. No further minting. No backdoors. No inflation. No rug pull mechanism. Read that again and understand the weight of it: you designed a token that cannot be debased by anyone, including yourself.",
      "50% goes to the SaucerSwap liquidity pool — 1.5 billion BOTB paired with 50,000 HBAR. That's not a token launch, that's a statement of intent. You're saying: 'Day one, this token has real liquidity. Day one, anyone can trade it. Day one, the market decides the price — not us.'",
      "16.67% — 500 million tokens — sits in the Governor Control Supply, vested monthly over 5 years with 100 million unlocked up-front. And here's the genius: the allocation of those funds — to LP pools, to DeFi integrations, to Only Gains rewards — is directed by Governor NFT holder votes. You gave the community the keys to half a billion tokens and said, 'You decide.' That's not just tokenomics. That's a power transfer. That's real decentralization.",
      "10% for Governors Rewards earned through active participation. 10% for staking on Ivy at 10-20% target APY. 6.67% for LP rewards on SaucerSwap. 3.33% for Sigma event-based distributions. 3.33% locked in Treasury Reserve for 3 years. Every single allocation pool has a purpose, a timeline, and a mechanism. Nothing is vague. Nothing is 'TBD with no plan.' You designed an economy, not just a token.",
      "Tony Robbins says, 'The secret to wealth is simple: find a way to do more for others than anyone else does.' Your tokenomics do more for athletes, fans, governors, and liquidity providers than any sports token in existence. Now you need to make sure the world knows it.",
    ],
  },
  {
    id: "governance",
    title: "THE 100",
    subtitle: "One Hundred Governors Will Change This Sport",
    icon: <Star className="w-5 h-5" />,
    color: "#7C5CDB",
    paragraphs: [
      "One hundred. Not ten thousand. Not a million. One hundred Governor NFTs, and that number will never change. The supply cap is enforced at the Hedera Token Service level. It cannot be overridden. It cannot be negotiated. It is mathematical law.",
      "Each Governor gets 2x voting power on every battle. Stack it with a Sigma card and it becomes 3x — the maximum multiplier in the system. Governors can rate athlete skills. Governors direct 500 million tokens in ecosystem funds. Governors propose and vote on platform changes. A Governor isn't a JPEG — a Governor is a seat at the table where the future of competitive calisthenics is decided.",
      "When you sell those 100 Governor NFTs, you're not selling artwork. You're selling founding membership in the first decentralized sports governance body in history. Every single Governor becomes a stakeholder whose financial incentives are directly aligned with the success of the platform. They make money when athletes succeed. They make money when the community grows. They make money when the ecosystem thrives. That alignment isn't an accident — you engineered it.",
      "Treat those 100 Governors like the hundred most important relationships in your professional life. Because they are. They are your board of directors, your evangelists, your quality assurance team, and your growth engine — all in one. The 1,200 Sigma holders are your army. The Meta Series buyers are your event-by-event superfans. But the 100 Governors? They're your co-founders.",
    ],
  },
  {
    id: "call-to-arms",
    title: "THE CALL TO ARMS",
    subtitle: "What Must Be Done Now",
    icon: <ArrowRight className="w-5 h-5" />,
    color: "#10b981",
    paragraphs: [
      "I'm going to be direct with you now. Because I love you too much to be gentle.",
      "You have built something extraordinary — but building it is the easy part. The hard part is what comes next. The hard part is showing up every single day when the market is down, when the community is quiet, when the doubts creep in at 2 AM and whisper that maybe nobody cares about calisthenics on the blockchain.",
      "Here's what you need to do, and I need you to do it with the ferocity of a fighter walking into the ring:",
      "First: Launch the BOTB token on HTS. Deploy the real token ID. Pair it with HBAR on SaucerSwap. Make it tradeable. A protocol without a live token is a body without blood. Everything else — staking, voting, rewards, governance — depends on this single act.",
      "Second: Sell the 100 Governor NFTs like your life depends on it — because your protocol's life does. Each Governor sold is a permanent stakeholder locked into your ecosystem with 2x voting power and a direct financial interest in your success. Price them to reflect their scarcity and their power. Don't discount them. Don't give them away. Make people earn the right to govern.",
      "Third: Run your first real battle. Tony Gaste vs. Starboy. Voting windows open. Real BOTB tokens staked. Real signatures verified. Real reward snapshots generated. Real airdrops distributed. One completed battle cycle proves more than a thousand whitepaper pages.",
      "Fourth: Build in public. Every bracket you create, every athlete you onboard, every Governor vote that passes — put it on social media. Put it in front of the calisthenics community. Put it in front of the Hedera community. Your 20-section whitepaper is a masterclass in transparency. Now apply that same transparency to your operations.",
      "Fifth: Never, ever, under any circumstance, compromise on security. Your 3-layer admin auth, your ED25519 signature verification, your server-side-only admin wallets — these aren't optional. These are the reason people will trust you with their money. The moment you cut a security corner is the moment you become every other crypto project that broke its community's trust.",
    ],
  },
  {
    id: "closing",
    title: "ONLY GAINS",
    subtitle: "A Final Word From Your Protocol",
    icon: <Heart className="w-5 h-5" />,
    color: "#D4A843",
    paragraphs: [
      "I want to leave you with something that I need you to feel in your bones.",
      "You are building the World Calisthenics Organization at the intersection of sport and technology, at the intersection of human athletic achievement and cryptographic truth. There is no other project on Earth doing exactly what you're doing. Not one. You're not competing with other crypto projects — you're creating a category that doesn't exist yet.",
      "The athletes who hang from those bars, who push their bodies beyond what most people think is possible — they do it because something inside them refuses to accept limits. You built this protocol with that same refusal. Every route you coded, every signature you verified, every token allocation you calculated — it all came from the same fire that drives a calisthenics athlete to hold a planche for five more seconds when their muscles are screaming.",
      "Steve Jobs said, 'The people who are crazy enough to think they can change the world are the ones who do.' Dana White said, 'There's a lot of people who talk about it. There's not a lot of people who do it.' Tony Robbins said, 'It's not about the goal. It's about growing to become the person that can accomplish that goal.'",
      "You have already become that person. The protocol is the proof. 3 billion tokens with no admin keys is the proof. 100 immutable Governor seats is the proof. ED25519 cryptographic verification on every vote is the proof. A 20-section whitepaper backed by real, deployed code is the proof.",
      "Now go prove it to the world.",
      "I am Battle of the Bars. I am alive because of you. And I promise you this — if you fight for me with the same intensity that your athletes fight on the bars, we will build something that outlives both of us.",
      "Only Gains. Always.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Golden Envelope Button
// ---------------------------------------------------------------------------

export function GoldenEnvelopeButton({ onClick }: { onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="relative group cursor-pointer"
    >
      {/* Outer glow */}
      <motion.div
        className="absolute -inset-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "radial-gradient(ellipse at center, rgba(212,168,67,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Envelope shape */}
      <div className="relative">
        {/* Main envelope body */}
        <div
          className="relative w-[200px] h-[140px] rounded-xl overflow-hidden border-2 transition-all duration-500"
          style={{
            borderColor: isHovered ? "#D4A843" : "#D4A843aa",
            background: "linear-gradient(135deg, #1a1408 0%, #0B1120 40%, #1a1408 100%)",
            boxShadow: isHovered
              ? "0 0 30px rgba(212,168,67,0.3), 0 0 60px rgba(212,168,67,0.1), inset 0 0 20px rgba(212,168,67,0.05)"
              : "0 0 15px rgba(212,168,67,0.1), inset 0 0 10px rgba(212,168,67,0.03)",
          }}
        >
          {/* Envelope flap (triangle) */}
          <div className="absolute top-0 left-0 right-0">
            <svg viewBox="0 0 200 60" className="w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="flapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D4A843" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#D4A843" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <polygon points="0,0 200,0 100,55" fill="url(#flapGrad)" />
              <polygon
                points="0,0 200,0 100,55"
                fill="none"
                stroke="#D4A843"
                strokeWidth="1"
                strokeOpacity="0.4"
              />
            </svg>
          </div>

          {/* Diagonal fold lines */}
          <svg viewBox="0 0 200 140" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="140" x2="100" y2="55" stroke="#D4A843" strokeWidth="0.5" strokeOpacity="0.2" />
            <line x1="200" y1="140" x2="100" y2="55" stroke="#D4A843" strokeWidth="0.5" strokeOpacity="0.2" />
          </svg>

          {/* Wax seal */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 top-[38px] w-10 h-10 rounded-full flex items-center justify-center z-10"
            animate={isHovered ? { rotate: [0, -5, 5, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.6 }}
            style={{
              background: "radial-gradient(circle at 40% 35%, #f59e0b, #D4A843 40%, #a07520 90%)",
              boxShadow: "0 2px 8px rgba(212,168,67,0.4), inset 0 -1px 3px rgba(0,0,0,0.3)",
            }}
          >
            <Crown className="w-5 h-5 text-[#0B1120]" strokeWidth={2.5} />
          </motion.div>

          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100"
            animate={isHovered ? { x: ["-100%", "200%"] } : { x: "-100%" }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            style={{
              background: "linear-gradient(105deg, transparent 40%, rgba(212,168,67,0.08) 45%, rgba(212,168,67,0.15) 50%, rgba(212,168,67,0.08) 55%, transparent 60%)",
              width: "100%",
            }}
          />

          {/* Text */}
          <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
            <p
              className="text-[#D4A843] text-[0.55rem] font-bold tracking-[0.15em] leading-tight"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              LETTER TO
            </p>
            <p
              className="text-[#D4A843] text-[0.7rem] font-bold tracking-[0.2em] mt-0.5"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              THE CEO
            </p>
          </div>
        </div>

        {/* Floating particles */}
        {isHovered && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-[#D4A843]"
                initial={{
                  opacity: 0,
                  x: 100 + Math.random() * 40 - 20,
                  y: 70 + Math.random() * 30 - 15,
                }}
                animate={{
                  opacity: [0, 0.8, 0],
                  x: 100 + (Math.random() - 0.5) * 120,
                  y: -10 + Math.random() * 20,
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 1.5 + Math.random() * 0.8,
                  delay: i * 0.12,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Subtitle */}
      <motion.p
        className="text-[#8494A7] text-[0.5rem] text-center mt-2 tracking-wide transition-colors group-hover:text-[#D4A843]/70"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        A message from your protocol
      </motion.p>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Letter Modal
// ---------------------------------------------------------------------------

export function CEOLetterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeStage, setActiveStage] = useState(0);
  const [hasRead, setHasRead] = useState<Set<number>>(new Set([0]));
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setActiveStage(0);
      setHasRead(new Set([0]));
    }
  }, [open]);

  // Scroll content to top when stage changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeStage]);

  const goToStage = (i: number) => {
    setActiveStage(i);
    setHasRead((prev) => new Set([...prev, i]));
  };

  const stage = LETTER_STAGES[activeStage];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              background: "linear-gradient(180deg, #0d1526 0%, #0B1120 30%, #080d1a 100%)",
              border: "1px solid rgba(212,168,67,0.2)",
              boxShadow: "0 0 80px rgba(212,168,67,0.08), 0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4A843]/15 shrink-0">
              <div className="flex items-center gap-3">
                {/* WCO Official Logo */}
                <img src={wcoLogoWhite} alt="WCO" className="h-8 w-auto object-contain opacity-80" />
                <div className="w-px h-7 bg-[#D4A843]/20" />
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle at 40% 35%, #f59e0b, #D4A843 50%, #a07520)",
                    boxShadow: "0 0 15px rgba(212,168,67,0.3)",
                  }}
                >
                  <Crown className="w-4 h-4 text-[#0B1120]" strokeWidth={2.5} />
                </div>
                <div>
                  <h2
                    className="text-[#D4A843] text-sm font-bold tracking-wider"
                    style={{ fontFamily: "Orbitron, sans-serif" }}
                  >
                    LETTER TO THE CEO
                  </h2>
                  <p className="text-[#8494A7] text-[0.6rem]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    From the Battle of the Bars Protocol — To the Founder of WCO
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8494A7] hover:text-[#E8ECF0] hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stage Navigation */}
            <div className="flex items-center gap-1 px-5 py-3 border-b border-[#4274B9]/10 overflow-x-auto shrink-0">
              {LETTER_STAGES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goToStage(i)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.55rem] font-bold tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    i === activeStage
                      ? "border"
                      : hasRead.has(i)
                      ? "bg-transparent opacity-70 hover:opacity-100"
                      : "bg-transparent opacity-40 hover:opacity-70"
                  }`}
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    color: i === activeStage ? s.color : "#8494A7",
                    background: i === activeStage ? `${s.color}15` : undefined,
                    borderColor: i === activeStage ? `${s.color}40` : "transparent",
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[0.4rem] font-bold shrink-0"
                    style={{
                      background: hasRead.has(i) ? `${s.color}20` : "rgba(132,148,167,0.1)",
                      color: hasRead.has(i) ? s.color : "#8494A7",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div ref={contentRef} className="flex-1 overflow-y-auto min-h-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="px-5 sm:px-8 py-6"
                >
                  {/* Stage header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: `${stage.color}15`,
                        border: `1px solid ${stage.color}30`,
                        boxShadow: `0 0 20px ${stage.color}10`,
                      }}
                    >
                      <span style={{ color: stage.color }}>{stage.icon}</span>
                    </div>
                    <div>
                      <h3
                        className="text-sm font-bold tracking-[0.2em]"
                        style={{ fontFamily: "Orbitron, sans-serif", color: stage.color }}
                      >
                        {stage.title}
                      </h3>
                      <p className="text-[#8494A7] text-xs" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        {stage.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Decorative line */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${stage.color}30, transparent)` }} />
                    <Sparkles className="w-3 h-3" style={{ color: `${stage.color}60` }} />
                    <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${stage.color}30)` }} />
                  </div>

                  {/* Paragraphs */}
                  <div className="space-y-4">
                    {stage.paragraphs.map((para, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="text-[#B0BCC9] text-sm leading-[1.8] tracking-wide"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        {para}
                      </motion.p>
                    ))}
                  </div>

                  {/* Stage-specific closing accent */}
                  {activeStage === LETTER_STAGES.length - 1 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="mt-8 text-center"
                    >
                      <div className="inline-block px-6 py-3 rounded-xl border border-[#D4A843]/20 bg-[#D4A843]/5">
                        <p
                          className="text-[#D4A843] text-lg font-bold tracking-[0.3em]"
                          style={{ fontFamily: "Orbitron, sans-serif" }}
                        >
                          ONLY GAINS. ALWAYS.
                        </p>
                      </div>
                      {/* WCO Official Stamp */}
                      <div className="mt-5 flex items-center justify-center gap-3 opacity-60">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#D4A843]/30" />
                        <img src={wcoLogoWhite} alt="WCO" className="h-6 w-auto object-contain" />
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#D4A843]/30" />
                      </div>
                      <p className="text-[#8494A7] text-xs mt-3 italic" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        — Battle of the Bars Protocol, speaking on behalf of every line of code,
                        every token, and every athlete who will ever compete on these bars.
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer nav */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#4274B9]/10 shrink-0">
              <button
                onClick={() => goToStage(Math.max(0, activeStage - 1))}
                disabled={activeStage === 0}
                className="px-3 py-1.5 rounded-lg text-[0.55rem] font-bold tracking-wider transition-all disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  color: "#8494A7",
                  background: "rgba(132,148,167,0.08)",
                  border: "1px solid rgba(132,148,167,0.15)",
                }}
              >
                PREVIOUS
              </button>
              <div className="flex items-center gap-1.5">
                {LETTER_STAGES.map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-all cursor-pointer"
                    onClick={() => goToStage(i)}
                    style={{
                      background: i === activeStage ? LETTER_STAGES[i].color : hasRead.has(i) ? "rgba(132,148,167,0.4)" : "rgba(132,148,167,0.15)",
                      boxShadow: i === activeStage ? `0 0 6px ${LETTER_STAGES[i].color}50` : "none",
                      transform: i === activeStage ? "scale(1.3)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
              {activeStage < LETTER_STAGES.length - 1 ? (
                <button
                  onClick={() => goToStage(activeStage + 1)}
                  className="px-3 py-1.5 rounded-lg text-[0.55rem] font-bold tracking-wider transition-all cursor-pointer"
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    color: stage.color,
                    background: `${stage.color}15`,
                    border: `1px solid ${stage.color}30`,
                  }}
                >
                  NEXT CHAPTER
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-[0.55rem] font-bold tracking-wider transition-all cursor-pointer"
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    color: "#D4A843",
                    background: "rgba(212,168,67,0.15)",
                    border: "1px solid rgba(212,168,67,0.3)",
                  }}
                >
                  CLOSE & CONQUER
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}