/**
 * BOTB NFT Collection Page — Booster System
 * ============================================
 * - Governor, Sigma Series, and Meta Series collections with voting multipliers
 * - User's owned NFTs shown via mirror node data from wallet context
 * - "Collect" flow links to marketplace / mint page
 * - Multiplier breakdown: 1x base, 1.5x Sigma, 2x Governor, 3x both
 */

import { motion } from "motion/react";
import {
  Gem, Shield, Zap, Lock, Crown, ExternalLink,
  Check, Sparkles, User, RotateCw,
} from "lucide-react";
import { useWallet } from "../components/wallet-context";
import { useVIP } from "../components/vip/vip-context";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";
import { toast } from "sonner";
import { TOKEN_IDS, getNetworkConfig } from "../lib/hedera-config";
import { NFTCollectionGallery } from "../components/nft-thumbnail";
import { useRef, useEffect, useCallback, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ---------------------------------------------------------------------------
// Collection definitions
// WCO-owned production assets — Governor is a 3D GLB model, others are PNGs.
// ---------------------------------------------------------------------------

interface NFTCollection {
  id: string;
  name: string;
  series: string;
  rarity: "Legendary" | "Epic" | "Rare" | "Common";
  image: string;
  /** Optional GLB model URL for 3D display */
  modelUrl?: string;
  votingMultiplier: number;
  tokenReward: number;
  minted: number;
  maxSupply: number;
  tokenId: string | null;
  description: string;
  perks: string[];
  /** Status label shown in card footer */
  status: string;
}

const GOV_MODEL_URL = "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/governorsnft.glb";
const SIGMA_IMG = "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/sigmanft.png";
const META_IMG = "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/metanft.png";

const COLLECTIONS: NFTCollection[] = [
  {
    id: "col-governor",
    name: "WCO Governor",
    series: "Governors Collection",
    rarity: "Legendary",
    image: "", // Uses 3D model instead
    modelUrl: GOV_MODEL_URL,
    votingMultiplier: 2,
    tokenReward: 5000,
    minted: 100,
    maxSupply: 100,
    tokenId: TOKEN_IDS.GOVERNOR_NFT,
    description: "Full governance access with 2x voting power on all battles. Only 100 ever minted — sold out.",
    perks: ["2x voting multiplier", "Governors Hub access", "Participation-based DeFi boosters", "Propose skill rating changes"],
    status: "SOLD OUT",
  },
  {
    id: "col-sigma",
    name: "Sigma Series — Athlete Cards",
    series: "Sigma Series",
    rarity: "Epic",
    image: SIGMA_IMG,
    votingMultiplier: 1.5,
    tokenReward: 2500,
    minted: 0,
    maxSupply: 1200,
    tokenId: TOKEN_IDS.SIGMA_NFT ?? null,
    description: "Individual athlete cards with 1.5x voting boost. Collect your favorite BOTB competitors. Coming soon.",
    perks: ["1.5x voting multiplier", "Athlete-specific rewards", "Battle bonus on athlete wins", "Tradable on secondary"],
    status: "COMING SOON",
  },
  {
    id: "col-meta",
    name: "Meta Series — Influencer Battles",
    series: "Meta Series",
    rarity: "Rare",
    image: META_IMG,
    votingMultiplier: 1,
    tokenReward: 0,
    minted: 0,
    maxSupply: -1,
    tokenId: TOKEN_IDS.META_NFT ?? null,
    description: "Head-to-head influencer push-up & chin-up challenges. Back a side — if they win, collectors split ALL funds from both sides.",
    perks: ["Winner-takes-all prize pool", "Unlimited mint per matchup", "Influencer x Athlete crossovers", "Launch Q2-Q3 2026"],
    status: "UNLIMITED",
  },
];

const RARITY_COLORS: Record<string, string> = {
  Legendary: "#f59e0b",
  Epic: "#7C5CDB",
  Rare: "#4274B9",
  Common: "#8494A7",
};

// ---------------------------------------------------------------------------
// Multiplier tiers
// ---------------------------------------------------------------------------
const MULTIPLIER_TIERS = [
  { label: "Base", power: "1x", color: "#8494A7", description: "No NFTs", icon: User },
  { label: "Sigma", power: "1.5x", color: "#7C5CDB", description: "Hold Sigma Series", icon: Sparkles },
  { label: "Governor", power: "2x", color: "#f59e0b", description: "Hold Governor NFT", icon: Crown },
  { label: "Both", power: "3x", color: "#10b981", description: "Governor + Sigma", icon: Gem },
];

export function NFTsPage() {
  const {
    connected, connect, isConnecting, votingPower,
    hasGovernorNFT, hasSigmaNFT, nftsOwned, governorNftsOwned,
    sigmaNftsOwned, nftCategories, accountId, network,
  } = useWallet();
  const { vipActive, sound } = useVIP();

  const networkConfig = getNetworkConfig(network ?? undefined);

  const openHashScan = (tokenId: string) => {
    window.open(`${networkConfig.explorerUrl}/token/${tokenId}`, "_blank");
  };

  const openMarketplace = (tokenId: string) => {
    // SentX is the main Hedera NFT marketplace
    window.open(`https://sentx.io/nft-marketplace/${tokenId}`, "_blank");
  };

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center gap-3 mb-2">
            <img src={botbShield} alt="BOTB" className="h-7 sm:h-8 w-auto" />
            <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: "Orbitron, sans-serif" }}>
              <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">NFT BOOSTERS</span>
            </h1>
          </div>
          <p className="text-[#8494A7]">Collect NFTs to boost your voting power. Governor + Sigma = 3x multiplier.</p>
        </div>

        {/* Multiplier Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#4274B9]/10 to-[#6AA3E0]/10 border border-[#4274B9]/20 rounded-2xl p-5 mb-8"
        >
          <h3 className="text-[#E8ECF0] text-xs font-bold mb-4 flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
            <Zap className="w-4 h-4 text-[#4274B9]" /> VOTING POWER MULTIPLIER TIERS
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MULTIPLIER_TIERS.map((tier) => {
              const Icon = tier.icon;
              const isActive = connected && tier.power === `${votingPower}x`;
              return (
                <div
                  key={tier.label}
                  className={`relative p-3 rounded-xl border transition-all ${
                    isActive
                      ? "border-[#D4A843]/40 bg-[#D4A843]/5 ring-1 ring-[#D4A843]/20"
                      : "border-[#4274B9]/10 bg-[#0B1120]"
                  }`}
                >
                  {isActive && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#D4A843] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <Icon className="w-5 h-5 mb-2" style={{ color: tier.color }} />
                  <p className="text-lg font-bold" style={{ fontFamily: "Orbitron, sans-serif", color: tier.color }}>
                    {tier.power}
                  </p>
                  <p className="text-[0.6rem] text-[#E8ECF0] font-semibold">{tier.label}</p>
                  <p className="text-[0.5rem] text-[#8494A7] mt-0.5">{tier.description}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* User's Owned NFTs (when connected) */}
        {connected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h3 className="text-[#E8ECF0] text-xs font-bold mb-3 flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
              <Shield className="w-4 h-4 text-[#6AA3E0]" /> YOUR COLLECTION
            </h3>

            <NFTCollectionGallery
              nftCategories={nftCategories}
              nftsOwned={nftsOwned}
              governorNftsOwned={governorNftsOwned}
              sigmaNftsOwned={sigmaNftsOwned}
              votingPower={votingPower}
              network={network ?? undefined}
            />
          </motion.div>
        )}

        {/* Collections Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {COLLECTIONS.map((col, i) => {
            const rarityColor = RARITY_COLORS[col.rarity];
            const soldOut = col.maxSupply > 0 && col.minted >= col.maxSupply;
            const isUnlimited = col.maxSupply < 0;
            const isOwned = connected && (
              (col.id === "col-governor" && hasGovernorNFT) ||
              (col.id === "col-sigma" && hasSigmaNFT)
            );

            return (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#111827] border rounded-2xl overflow-hidden hover:scale-[1.02] transition-all group"
                style={{ borderColor: isOwned ? `${rarityColor}40` : `${rarityColor}15` }}
              >
                {/* Image */}
                <div className="relative h-64 sm:h-72 overflow-hidden">
                  {col.modelUrl ? (
                    <div className="relative w-full h-full" style={{ background: "radial-gradient(ellipse at center, rgba(245,158,11,0.08) 0%, rgba(11,17,32,1) 70%)" }}>
                      <GLBViewer modelUrl={col.modelUrl} />
                      {/* 3D badge */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/20 backdrop-blur-sm">
                        <RotateCw className="w-2.5 h-2.5 text-[#f59e0b]" />
                        <span className="text-[0.5rem] text-[#f59e0b]" style={{ fontFamily: "Orbitron, sans-serif" }}>3D</span>
                      </div>
                    </div>
                  ) : (
                    <ImageWithFallback
                      src={col.image}
                      alt={col.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />

                  {/* Multiplier badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                    <Zap className="w-3 h-3 text-[#f59e0b]" />
                    <span className="text-xs text-[#f59e0b]" style={{ fontFamily: "Orbitron, sans-serif" }}>{col.votingMultiplier}x</span>
                  </div>

                  {/* Owned badge */}
                  {isOwned && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#10b981]/80 backdrop-blur-sm">
                      <Check className="w-3 h-3 text-white" />
                      <span className="text-[0.6rem] text-white font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>OWNED</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-[#E8ECF0] font-bold truncate" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
                      {col.name}
                    </h3>
                    <p className="text-xs text-[#8494A7] mt-1">{col.description}</p>
                  </div>

                  {/* Perks */}
                  <div className="space-y-1">
                    {col.perks.map((perk, pi) => (
                      <div key={pi} className="flex items-center gap-1.5 text-[0.6rem] text-[#8494A7]">
                        <div className="w-1 h-1 rounded-full" style={{ background: rarityColor }} />
                        {perk}
                      </div>
                    ))}
                  </div>

                  {/* Supply bar */}
                  <div>
                    <div className="flex justify-between text-[0.55rem] text-[#8494A7] mb-1">
                      <span>Supply</span>
                      <span>{isUnlimited ? `${col.minted} minted / UNLIMITED` : `${col.minted}/${col.maxSupply.toLocaleString()}`}</span>
                    </div>
                    {isUnlimited ? (
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `linear-gradient(90deg, ${rarityColor}30, ${rarityColor}10, ${rarityColor}30)` }}>
                        <div className="h-full w-full rounded-full animate-pulse" style={{ background: `linear-gradient(90deg, transparent, ${rarityColor}40, transparent)` }} />
                      </div>
                    ) : (
                      <div className="h-1.5 rounded-full bg-[#162033] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(col.minted / col.maxSupply) * 100}%`,
                            background: `linear-gradient(90deg, ${rarityColor}, ${rarityColor}80)`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#4274B9]/10">
                    <div>
                      <p className="text-[0.5rem] text-[#8494A7]">Status</p>
                      <span
                        className={soldOut ? "text-[#8494A7]" : "text-[#4274B9]"}
                        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}
                      >
                        {col.status}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {/* View on HashScan */}
                      {col.tokenId && (
                        <button
                          onClick={() => openHashScan(col.tokenId!)}
                          className="p-2 rounded-lg border border-[#4274B9]/20 text-[#8494A7] hover:text-[#E8ECF0] hover:border-[#4274B9]/40 transition-all"
                          title="View on HashScan"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Collect / Buy */}
                      <button
                        onClick={() => {
                          if (!connected) { connect(); return; }
                          if (col.tokenId) {
                            openMarketplace(col.tokenId);
                          } else {
                            toast.info("Marketplace link coming soon — token ID not yet deployed.");
                          }
                        }}
                        disabled={soldOut}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                          soldOut
                            ? "bg-[#162033] text-[#8494A7] cursor-not-allowed"
                            : isOwned
                            ? "bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20"
                            : "bg-[#4274B9] text-white hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25"
                        }`}
                        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}
                      >
                        {soldOut ? (
                          <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> SOLD OUT</span>
                        ) : isOwned ? (
                          <span className="flex items-center gap-1"><Check className="w-3 h-3" /> COLLECT MORE</span>
                        ) : (
                          <span className="flex items-center gap-1"><Gem className="w-3 h-3" /> COLLECT</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Stacking Explainer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 bg-[#0B1120] border border-[#D4A843]/15 rounded-2xl p-5 sm:p-6"
        >
          <h3 className="text-[#D4A843] text-xs font-bold mb-3 flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
            <Gem className="w-4 h-4" /> HOW STACKING WORKS
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-[#8494A7]">
            <div>
              <p className="text-[#E8ECF0] font-semibold mb-1">1. Collect NFTs</p>
              <p className="text-xs">Buy Governor and/or Sigma Series NFTs on <a href="https://sentx.io" target="_blank" rel="noopener" className="text-[#6AA3E0] underline">SentX</a> or during mint events.</p>
            </div>
            <div>
              <p className="text-[#E8ECF0] font-semibold mb-1">2. Auto-Detect</p>
              <p className="text-xs">Connect your wallet — we query the Hedera Mirror Node to detect your NFTs instantly. No staking required.</p>
            </div>
            <div>
              <p className="text-[#E8ECF0] font-semibold mb-1">3. Boosted Votes</p>
              <p className="text-xs">Your voting power is automatically multiplied. Governor (2x) + Sigma (1.5x) stack to 3x on every vote.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Raw Three.js GLB Viewer — no @react-three/fiber (requires React 19)
// Uses GLTFLoader + OrbitControls directly on a <canvas> ref.
// ---------------------------------------------------------------------------
function GLBViewer({ modelUrl }: { modelUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0.5, 4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // --- Lights ---
    const ambient = new THREE.AmbientLight(0xf5e6c8, 0.6);
    scene.add(ambient);
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0xf59e0b, 0.3);
    dirLight2.position.set(-3, 2, -2);
    scene.add(dirLight2);
    const pointLight = new THREE.PointLight(0xf5e6c8, 0.4);
    pointLight.position.set(0, 3, 0);
    scene.add(pointLight);

    // --- OrbitControls ---
    const controls = new ThreeOrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // --- Load GLB ---
    let modelGroup: THREE.Group | null = null;
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        modelGroup = new THREE.Group();
        modelGroup.add(gltf.scene);

        // Auto-scale to fit viewport
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const maxDim = Math.max(size.x, size.y, size.z);
        const s = maxDim > 0 ? 2.2 / maxDim : 1;
        modelGroup.scale.setScalar(s);
        modelGroup.position.set(-center.x * s, -center.y * s + 0.1, -center.z * s);

        scene.add(modelGroup);
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error("GLB load error:", err);
        setError(true);
        setLoading(false);
      },
    );

    // --- Animation loop ---
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (modelGroup) modelGroup.rotation.y += 0.006;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- Resize observer ---
    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
          <RotateCw className="w-5 h-5 text-[#f59e0b] animate-spin" />
          <span className="text-[0.6rem] text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>LOADING 3D MODEL</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-[0.6rem] text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>FAILED TO LOAD</span>
        </div>
      )}
    </div>
  );
}