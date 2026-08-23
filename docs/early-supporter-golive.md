# Early Supporter — Go-Live Checklist (Phase 2)

**Goal:** 5,000 NFTs in resolver wallet `0.0.10821146`, then auto-transfer on claim (staging → www).

**Status (Phase 1 done):** Claim UI + local mock + Edge routes exist. Real mint/transfer **off**. Code may be on `main` with flags defaulting false.

---

## Architecture (locked)

1. **Pre-mint** all serials into `0.0.10821146` (create token → batch mint).
2. **Public claim** = Edge verifies one-per-wallet → **auto-transfer** next available serial from treasury → claimant.
3. Treasury/supply **private key** lives only in secure Edge/Vercel secrets (or a dedicated mint worker) — never `VITE_*`, never GitHub.

---

## A. You (human) — secrets & media

### A1. Local key file (do this when we ask — never paste key in chat)

Copy example → local secret file:

```bash
copy scripts\hedera\.env.hedera.example scripts\hedera\.env.hedera
```

Edit `scripts/hedera/.env.hedera` (gitignored):

```
HEDERA_NETWORK=mainnet
TREASURY_ACCOUNT_ID=0.0.10821146
TREASURY_PRIVATE_KEY=<your key — never commit>
```

Confirm account has enough **HBAR** for TokenCreate + ~500 mint txs (chunked).

### A2. Public media — DONE

| Asset | Public URL |
|-------|------------|
| Thumbnail | `https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/NFT's/WCO%20EARLY%20SUPPORTER%20thumbnail.jpg` |
| Animation | `https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/NFT's/WCO%20EARLY%20SUPPORTER.mp4` |
| Metadata JSON | `https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/NFT's/early-supporter.json` |

Treasury `0.0.10821146` Mirror balance checked ≈ **185.7 HBAR** (enough for create + batch mint).

---

## B. Bots — on-chain create + mint (ask permission before each)

| Step | Command | Permission gate |
|------|---------|-----------------|
| Dry-run create | `node scripts/hedera/06-create-early-supporter-nft.mjs --dry-run` | Safe |
| **Create token** | `node scripts/hedera/06-create-early-supporter-nft.mjs` | **Ask you** |
| Save `EARLY_SUPPORTER_NFT_TOKEN_ID` | into `.env.hedera` + later Vercel/Supabase | Public ID OK to share |
| Dry-run mint | `node scripts/hedera/07-mint-early-supporter-batch.mjs --dry-run` | Safe |
| Test mint 10 | `node scripts/hedera/07-mint-early-supporter-batch.mjs --count 10` | **Ask you** |
| Full 5,000 | `node scripts/hedera/07-mint-early-supporter-batch.mjs` | **Ask you** (HBAR cost) |

---

## C. Product code — transfer path (bots)

1. Implement Edge `transfer` delivery (replace HTS stub) behind:
   - `EARLY_SUPPORTER_ENABLED=true`
   - `EARLY_SUPPORTER_MINT_ENABLED=true` (or dedicated transfer flag)
2. Store treasury key as **Edge secret** (not Vite).
3. Claim flow: session → one-per-wallet KV → pick unassigned serial → transfer → mark claimed.
4. Frontend: `VITE_EARLY_SUPPORTER_ENABLED=true`, **turn OFF** `LOCAL_MOCK`, set `VITE_EARLY_SUPPORTER_NFT_TOKEN_ID`.

---

## D. Rollout order (locked)

1. **Staging / WCO-Resolver** — enable flags, claim with a real wallet, verify HashScan transfer.
2. Second-claim rejection + refresh persistence.
3. **www.wcorg.io** — enable only after staging pass (**ask you**).

---

## E. Progress

- [x] Public metadata URLs
- [x] TokenCreate on mainnet → **`0.0.10821256`**
- [x] Mint **10** test serials into `0.0.10821146` (pause before full 5,000)
- [x] Edge auto-transfer implementation (behind flags)
- [ ] Staging flag enable + treasury key secret
- [ ] Production / www enable
- [ ] Mint remaining 4,990

Phase 1 mock on localhost does **not** move real NFTs.

---

## F. Staging enable checklist (you + bots)

### F1. Supabase Edge secrets (Dashboard → Project WCO → Edge Functions → Secrets)

| Secret name | Value |
|-------------|--------|
| `EARLY_SUPPORTER_ENABLED` | `true` |
| `EARLY_SUPPORTER_MINT_ENABLED` | `true` |
| `EARLY_SUPPORTER_NFT_TOKEN_ID` | `0.0.10821256` |
| `EARLY_SUPPORTER_TREASURY_ACCOUNT_ID` | `0.0.10821146` |
| `EARLY_SUPPORTER_TREASURY_PRIVATE_KEY` | *(same key as local `.env.hedera` — paste only in Dashboard)* |
| `HEDERA_NETWORK` | `mainnet` |
| `EARLY_SUPPORTER_REQUIRE_ACTIVITY` | `false` |
| `EARLY_SUPPORTER_DEBUG` | `false` on prod (turn OFF if still true from staging) |
| `EARLY_SUPPORTER_ALLOW_MOCK` | `false` (never true on mainnet) |
| `EARLY_SUPPORTER_ALLOW_KV_RESET` | `false` (blocks admin KV wipe double-claim) |

Then **redeploy** Edge function `make-server-57fcb0ee`.

### F2. Frontend (staging / WCO-Resolver env — not www yet)

```
VITE_EARLY_SUPPORTER_ENABLED=true
VITE_EARLY_SUPPORTER_LOCAL_MOCK=false
VITE_EARLY_SUPPORTER_NFT_TOKEN_ID=0.0.10821256
VITE_EARLY_SUPPORTER_TREASURY_ACCOUNT_ID=0.0.10821146
```

### F3. Claimant wallet

User may need to **associate** token `0.0.10821256` in HashPack before the first claim (auto-associations off on many accounts). Error code: `ASSOCIATION_REQUIRED`.

### F4. HashPack media

On-chain metadata URI + public image/mp4 return HTTP 200 from our checks. If HashPack still shows blank, wait for wallet CDN index, or remint later with a path that avoids `NFT's` apostrophe (`NFTs/early-supporter.json` also uploaded).
