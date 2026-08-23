/**
 * NFT Thumbnail System — Mirror Node Image Resolver
 * ===================================================
 * Resolves real NFT artwork from Hedera Mirror Node metadata.
 *
 * Pipeline:
 *   1. MirrorNFT.metadata (base64) → decode → URI string
 *   2. URI (ipfs:// or https://) → fetch JSON → extract "image" field
 *   3. Image URI (ipfs:// or https://) → convert to displayable HTTPS URL
 *   4. Render as borderless 96×96 thumbnail with shimmer → reveal animation
 *
 * Supports: IPFS, Arweave, HTTP/S, and inline base64 image URIs.
 * Caches resolved image URLs in a module-level Map to avoid refetching.
 */

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, ImageOff, Crown, Sparkles, Layers, ChevronDown } from "lucide-react";
import type { MirrorNFT } from "../lib/hedera-mirror";
import { decodeNFTMetadata } from "../lib/hedera-mirror";
import { TOKEN_IDS, getNetworkConfig } from "../lib/hedera-config";
import type { CategorizedNFTs } from "../lib/hedera-mirror";

// ---------------------------------------------------------------------------
// IPFS Gateway & URI Resolution
// ---------------------------------------------------------------------------

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

/** Convert any URI to an HTTPS-displayable URL */
function resolveUri(uri: string): string {
  if (!uri) return "";
  const trimmed = uri.trim();

  // IPFS protocol
  if (trimmed.startsWith("ipfs://")) {
    const cid = trimmed.slice(7);
    return `${IPFS_GATEWAYS[0]}${cid}`;
  }

  // Arweave protocol
  if (trimmed.startsWith("ar://")) {
    return `https://arweave.net/${trimmed.slice(5)}`;
  }

  // Already HTTP(S)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Bare CID (starts with Qm or bafy)
  if (trimmed.startsWith("Qm") || trimmed.startsWith("bafy")) {
    return `${IPFS_GATEWAYS[0]}${trimmed}`;
  }

  // Base64 inline image
  if (trimmed.startsWith("data:image")) {
    return trimmed;
  }

  return "";
}

// ---------------------------------------------------------------------------
// Module-level image cache — persists across renders, cleared on unmount
// ---------------------------------------------------------------------------

const imageCache = new Map<string, string | null>();
const pendingFetches = new Map<string, Promise<string | null>>();

/** Generate a stable cache key for an NFT */
function cacheKey(nft: MirrorNFT): string {
  return `${nft.token_id}:${nft.serial_number}`;
}

/**
 * Resolve an NFT's artwork URL from its on-chain metadata.
 * Returns a displayable HTTPS image URL, or null if unresolvable.
 */
async function resolveNFTImage(nft: MirrorNFT): Promise<string | null> {
  const key = cacheKey(nft);

  // Return from cache
  if (imageCache.has(key)) return imageCache.get(key)!;

  // Deduplicate in-flight fetches
  if (pendingFetches.has(key)) return pendingFetches.get(key)!;

  const promise = (async () => {
    try {
      // Step 1: Decode base64 metadata → URI
      const decoded = decodeNFTMetadata(nft);
      if (!decoded) {
        imageCache.set(key, null);
        return null;
      }

      const metadataUri = resolveUri(decoded);
      if (!metadataUri) {
        imageCache.set(key, null);
        return null;
      }

      // Step 2: If it's already an image URI, use it directly
      if (
        metadataUri.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)(\?.*)?$/i) ||
        metadataUri.startsWith("data:image")
      ) {
        imageCache.set(key, metadataUri);
        return metadataUri;
      }

      // Step 3: Fetch the metadata JSON
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(metadataUri, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        // Maybe the URI itself is an image — try to detect content type
        const contentType = res.headers.get("content-type") || "";
        if (contentType.startsWith("image/")) {
          imageCache.set(key, metadataUri);
          return metadataUri;
        }
        imageCache.set(key, null);
        return null;
      }

      const contentType = res.headers.get("content-type") || "";

      // If the response is an image, the metadata URI IS the image
      if (contentType.startsWith("image/")) {
        imageCache.set(key, metadataUri);
        return metadataUri;
      }

      const json = await res.json();

      // HIP-412 / ERC-721 standard: "image" field
      const imageField = json.image || json.image_url || json.artwork?.uri || json.properties?.image;
      if (!imageField) {
        imageCache.set(key, null);
        return null;
      }

      const resolved = resolveUri(imageField);
      imageCache.set(key, resolved || null);
      return resolved || null;
    } catch (err) {
      console.warn(`[NFT Thumb] Failed to resolve image for ${key}:`, err);
      imageCache.set(key, null);
      return null;
    } finally {
      pendingFetches.delete(key);
    }
  })();

  pendingFetches.set(key, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// useNFTImage hook
// ---------------------------------------------------------------------------

type ImageState = "loading" | "ready" | "error";

function useNFTImage(nft: MirrorNFT | null) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [state, setState] = useState<ImageState>("loading");

  useEffect(() => {
    if (!nft) {
      setState("error");
      return;
    }

    const key = cacheKey(nft);
    // Immediate cache hit
    if (imageCache.has(key)) {
      const cached = imageCache.get(key)!;
      setImageUrl(cached);
      setState(cached ? "ready" : "error");
      return;
    }

    let cancelled = false;
    setState("loading");

    resolveNFTImage(nft).then((url) => {
      if (cancelled) return;
      setImageUrl(url);
      setState(url ? "ready" : "error");
    });

    return () => { cancelled = true; };
  }, [nft?.token_id, nft?.serial_number]);

  return { imageUrl, state };
}

// ---------------------------------------------------------------------------
// Collection info helpers
// ---------------------------------------------------------------------------

interface CollectionMeta {
  name: string;
  color: string;
  icon: typeof Crown;
  multiplier: string;
}

function getCollectionMeta(tokenId: string): CollectionMeta {
  if (tokenId === TOKEN_IDS.GOVERNOR_NFT) {
    return { name: "Governor", color: "#f59e0b", icon: Crown, multiplier: "2x" };
  }
  if (TOKEN_IDS.SIGMA_NFT && tokenId === TOKEN_IDS.SIGMA_NFT) {
    return { name: "Sigma", color: "#7C5CDB", icon: Sparkles, multiplier: "1.5x" };
  }
  if (TOKEN_IDS.META_NFT && tokenId === TOKEN_IDS.META_NFT) {
    return { name: "Meta", color: "#10b981", icon: Layers, multiplier: "1x" };
  }
  if (
    TOKEN_IDS.EARLY_SUPPORTER_NFT &&
    tokenId === TOKEN_IDS.EARLY_SUPPORTER_NFT
  ) {
    return {
      name: "Early Supporter",
      color: "#D4A843",
      icon: Sparkles,
      multiplier: "",
    };
  }
  return { name: "NFT", color: "#4274B9", icon: Layers, multiplier: "" };
}

// ---------------------------------------------------------------------------
// NFT Thumbnail Component — 96×96 borderless art card
// ---------------------------------------------------------------------------

interface NFTThumbnailProps {
  nft: MirrorNFT;
  index: number;
  network?: string;
}

const NFTThumbnail = memo(function NFTThumbnail({ nft, index, network }: NFTThumbnailProps) {
  const { imageUrl, state } = useNFTImage(nft);
  const [hovered, setHovered] = useState(false);
  const meta = getCollectionMeta(nft.token_id);
  const Icon = meta.icon;
  const networkConfig = getNetworkConfig(network as any ?? undefined);

  const openOnHashScan = useCallback(() => {
    window.open(
      `${networkConfig.explorerUrl}/token/${nft.token_id}/${nft.serial_number}`,
      "_blank"
    );
  }, [networkConfig.explorerUrl, nft.token_id, nft.serial_number]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.06,
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      className="relative group cursor-pointer flex-shrink-0"
      style={{ width: 96, height: 96 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={openOnHashScan}
    >
      {/* Ambient glow on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute -inset-1 rounded-2xl blur-md z-0 pointer-events-none"
            style={{ background: `${meta.color}25` }}
          />
        )}
      </AnimatePresence>

      {/* Main thumbnail container */}
      <div
        className="relative w-full h-full rounded-xl overflow-hidden transition-transform duration-200"
        style={{
          transform: hovered ? "scale(1.08)" : "scale(1)",
        }}
      >
        {/* Loading shimmer */}
        {state === "loading" && (
          <div className="absolute inset-0 bg-[#111827] rounded-xl overflow-hidden">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#111827] via-[#1a2235] to-[#111827]" />
            <div
              className="absolute inset-0 animate-[shimmer_1.5s_infinite]"
              style={{
                background: `linear-gradient(110deg, transparent 25%, ${meta.color}08 37%, ${meta.color}12 50%, ${meta.color}08 63%, transparent 75%)`,
                backgroundSize: "200% 100%",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-5 h-5 animate-pulse" style={{ color: `${meta.color}40` }} />
            </div>
          </div>
        )}

        {/* Error / no image fallback */}
        {state === "error" && (
          <div
            className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-1"
            style={{ background: `${meta.color}08`, border: `1px solid ${meta.color}15` }}
          >
            <Icon className="w-6 h-6" style={{ color: `${meta.color}60` }} />
            <span
              className="text-[0.45rem] font-bold tracking-wider"
              style={{ color: `${meta.color}80`, fontFamily: "Orbitron, sans-serif" }}
            >
              #{nft.serial_number}
            </span>
          </div>
        )}

        {/* Loaded image */}
        {state === "ready" && imageUrl && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            src={imageUrl}
            alt={`${meta.name} #${nft.serial_number}`}
            className="w-full h-full object-cover rounded-xl"
            loading="lazy"
            onError={(e) => {
              // Fallback if image fails to load after URL was resolved
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        {/* Hover overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 rounded-xl flex flex-col items-center justify-center z-10"
              style={{
                background: `linear-gradient(135deg, ${meta.color}CC, ${meta.color}99)`,
              }}
            >
              <span
                className="text-white font-bold text-[0.55rem] tracking-wider mb-0.5"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                #{nft.serial_number}
              </span>
              <span className="text-white/80 text-[0.45rem] font-medium">
                {meta.name}
              </span>
              {meta.multiplier && (
                <span
                  className="text-white text-[0.5rem] font-bold mt-0.5"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  {meta.multiplier}
                </span>
              )}
              <ExternalLink className="w-2.5 h-2.5 text-white/60 mt-1" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle bottom edge collection color indicator (always visible) */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] z-5"
          style={{
            background: `linear-gradient(90deg, transparent, ${meta.color}60, transparent)`,
          }}
        />
      </div>
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// YOUR COLLECTION Gallery — horizontal scrolling NFT thumbnail strip
// ---------------------------------------------------------------------------

interface NFTCollectionGalleryProps {
  nftCategories: CategorizedNFTs | null;
  nftsOwned: number;
  governorNftsOwned: number;
  sigmaNftsOwned: number;
  votingPower: number;
  network?: string;
}

const MAX_VISIBLE = 10;

export function NFTCollectionGallery({
  nftCategories,
  nftsOwned,
  governorNftsOwned,
  sigmaNftsOwned,
  votingPower,
  network,
}: NFTCollectionGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Collect all WCO-whitelisted NFTs in display order
  const wcoNfts: MirrorNFT[] = [];
  if (nftCategories) {
    wcoNfts.push(...nftCategories.governor);
    wcoNfts.push(...nftCategories.sigma);
    wcoNfts.push(...nftCategories.meta);
    wcoNfts.push(...(nftCategories.earlySupporter ?? []));
  }

  const wcoCount = wcoNfts.length;
  const hasOverflow = wcoCount > MAX_VISIBLE;
  const visibleNfts = hasOverflow && !expanded ? wcoNfts.slice(0, MAX_VISIBLE) : wcoNfts;
  const overflowNfts = hasOverflow ? wcoNfts.slice(MAX_VISIBLE) : [];
  const overflowCount = overflowNfts.length;

  // Update scroll arrow visibility
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      const observer = new ResizeObserver(checkScroll);
      observer.observe(el);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        observer.disconnect();
      };
    }
  }, [checkScroll, wcoCount, expanded]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  // Empty state — no WCO NFTs
  if (wcoCount === 0) {
    return (
      <div className="bg-[#0B1120]/60 border border-[#4274B9]/10 rounded-2xl p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ImageOff className="w-5 h-5 text-[#4274B9]/20" />
        </div>
        <p className="text-[#8494A7] text-sm mb-1">
          No WCO NFTs detected in your wallet.
        </p>
        <p className="text-[#8494A7]/60 text-xs">
          Collect Governor or Sigma Series NFTs below to unlock voting multipliers.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Main gallery container */}
      <div className="flex items-stretch gap-3">
        {/* Scrollable NFT thumbnails */}
        <div className="relative flex-1 min-w-0">
          {/* Left fade + arrow */}
          <AnimatePresence>
            {canScrollLeft && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => scroll("left")}
                className="absolute left-0 top-0 bottom-0 w-10 z-20 flex items-center justify-start pl-1 cursor-pointer"
                style={{
                  background: "linear-gradient(90deg, #0B1120 30%, transparent)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#8494A7]">
                  <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Right fade + arrow */}
          <AnimatePresence>
            {canScrollRight && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => scroll("right")}
                className="absolute right-0 top-0 bottom-0 w-10 z-20 flex items-center justify-end pr-1 cursor-pointer"
                style={{
                  background: "linear-gradient(270deg, #0B1120 30%, transparent)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#8494A7]">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Scrollable row — capped at MAX_VISIBLE initially */}
          <div
            ref={scrollRef}
            className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide py-1 px-0.5"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {visibleNfts.map((nft, i) => (
              <NFTThumbnail
                key={`${nft.token_id}-${nft.serial_number}`}
                nft={nft}
                index={i}
                network={network}
              />
            ))}

            {/* Overflow teaser pill — shows when collapsed & more exist */}
            {hasOverflow && !expanded && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: MAX_VISIBLE * 0.06, type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => setExpanded(true)}
                className="flex-shrink-0 w-[96px] h-[96px] rounded-xl border border-[#4274B9]/20 bg-[#111827]/80 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#4274B9]/40 hover:bg-[#111827] transition-all group/more"
              >
                <span
                  className="text-lg font-bold text-[#4274B9] group-hover/more:text-[#6AA3E0] transition-colors"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  +{overflowCount}
                </span>
                <span className="text-[0.45rem] text-[#8494A7] group-hover/more:text-[#B0BCC9] transition-colors">
                  more NFTs
                </span>
                <ChevronDown className="w-3 h-3 text-[#4274B9]/50 group-hover/more:text-[#6AA3E0] transition-colors" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Active Power summary — anchored right */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-shrink-0 w-[96px] rounded-xl border border-[#D4A843]/15 bg-[#0B1120]/80 flex flex-col items-center justify-center text-center px-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mb-1">
            <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12z" stroke="#D4A843" strokeWidth="1.5" opacity="0.3"/>
            <path d="M8 12l3 3 5-6" stroke="#D4A843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p
            className="text-xl font-bold text-[#D4A843] leading-none"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            {votingPower}x
          </p>
          <p className="text-[0.45rem] text-[#8494A7] mt-0.5 leading-tight">
            Active Power
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            {governorNftsOwned > 0 && (
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-[#f59e0b]/10">
                <Crown className="w-2 h-2 text-[#f59e0b]" />
                <span className="text-[0.4rem] text-[#f59e0b] font-bold">{governorNftsOwned}</span>
              </div>
            )}
            {sigmaNftsOwned > 0 && (
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-[#7C5CDB]/10">
                <Sparkles className="w-2 h-2 text-[#7C5CDB]" />
                <span className="text-[0.4rem] text-[#7C5CDB] font-bold">{sigmaNftsOwned}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Overflow drawer — wrapping grid that slides open */}
      <AnimatePresence>
        {expanded && hasOverflow && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3 pb-1">
              <div className="flex items-center gap-2 mb-3 px-0.5">
                <div className="h-px flex-1 bg-[#4274B9]/10" />
                <span className="text-[0.5rem] text-[#8494A7]/50 uppercase tracking-widest" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  Full Collection
                </span>
                <div className="h-px flex-1 bg-[#4274B9]/10" />
              </div>
              <div className="flex flex-wrap gap-2.5 px-0.5">
                {overflowNfts.map((nft, i) => (
                  <NFTThumbnail
                    key={`overflow-${nft.token_id}-${nft.serial_number}`}
                    nft={nft}
                    index={i}
                    network={network}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer — count + collapse control */}
      <div className="flex items-center gap-3 mt-2.5 px-0.5">
        <p className="text-[0.55rem] text-[#8494A7]/60">
          {wcoCount} WCO NFT{wcoCount !== 1 ? "s" : ""} detected
        </p>
        <div className="flex-1 h-px bg-[#4274B9]/5" />
        {expanded && hasOverflow ? (
          <button
            onClick={() => setExpanded(false)}
            className="text-[0.5rem] text-[#4274B9]/60 hover:text-[#6AA3E0] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ChevronDown className="w-2.5 h-2.5 rotate-180" />
            Collapse
          </button>
        ) : (
          <p className="text-[0.5rem] text-[#8494A7]/40">
            Hover for details
          </p>
        )}
      </div>
    </div>
  );
}