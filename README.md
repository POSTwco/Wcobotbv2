<p align="center">
  <img src="https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/WCO%20white%20on%20trans.png" alt="World Calisthenics Organization" width="180" />
</p>

<h1 align="center">WCO Platform</h1>

<p align="center">
  Official Web3 product for the
  <a href="https://worldcalisthenics.org">World Calisthenics Organization</a><br/>
  <strong>Battle of the Bars</strong> · governance · athletes · workouts · sponsorship
</p>

<p align="center">
  <a href="https://www.wcorg.io">www.wcorg.io</a>
  ·
  <a href="https://github.com/POSTwco/Wcobotbv2">GitHub</a>
  ·
  <a href="./SECURITY.md">Security</a>
  ·
  <a href="./LICENSE">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-public_beta-D4A843?labelColor=0B1120" alt="Public beta" />
  <img src="https://img.shields.io/badge/stack-React_·_Vite_·_Hedera_·_Supabase-4274B9?labelColor=0B1120" alt="Stack" />
  <img src="https://img.shields.io/badge/license-proprietary-8494A7?labelColor=0B1120" alt="License" />
</p>

---

## Overview

This repository powers **[www.wcorg.io](https://www.wcorg.io)** — WCO’s production fan and athlete platform. Fans connect a Hedera wallet (or create one with email), vote on live battles with token-weighted power, follow athletes, train in the calisthenics engine, and participate in Governor-gated governance. Operators run the product from a wallet-authenticated admin command center.

| Product area | Description |
|--------------|-------------|
| **Battles** | Token-weighted voting on calisthenics matchups; batch voting; reward snapshots |
| **Governance** | Governor NFT–gated proposals and votes; hybrid HCS path documented under `docs/governance/` |
| **Athletes** | Profiles, skill ratings, weight classes (lbs), Pro Card / NFT surfaces |
| **Arena Chat** | Fan chat with verified athlete and governor presentation |
| **Workouts** | Personalized calisthenics routines, PRs, XP, motion references |
| **Sponsors** | Multi-tier placements with impression and click analytics |
| **Access** | HashPack / WalletConnect **or** Magic email sign-in / create-account |

The live product is in **public beta**. Treat chain interactions and email-wallet custody with care; see the in-app beta notice and [Terms](https://www.wcorg.io/terms).

---

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────────┐
│  React SPA (Vite)   │────▶│  Supabase Edge (Hono)        │
│  Vercel CDN         │     │  make-server-57fcb0ee        │
└──────────┬──────────┘     └──────────────┬───────────────┘
           │                               │
           │  WalletConnect / Magic        │  KV (Postgres JSONB)
           ▼                               ▼
┌─────────────────────┐     ┌──────────────────────────────┐
│  Hedera mainnet     │◀────│  Mirror Node · HTS NFTs      │
│  AccountCreate API  │     │  (balances, holdings)        │
│  (Vercel serverless)│     └──────────────────────────────┘
└─────────────────────┘
```

| Layer | Role |
|-------|------|
| **Frontend** | Vite + React 18 + TypeScript + Tailwind — hosted on Vercel |
| **Edge API** | Hono on Supabase Edge Functions — sessions, votes, admin, chat, cali |
| **Vercel APIs** | Magic AccountCreate + session register (`api/magic-*.ts`) — Hedera gRPC where Edge cannot reach consensus |
| **Chain** | Hedera HTS tokens/NFTs; Mirror Node for reads; optional HCS governance topics |

Frontend deploys on push to `main`. Edge functions are deployed separately (`pnpm deploy:edge`). Keep both in sync when API contracts change.

---

## Authentication

| Path | Who it’s for | Notes |
|------|----------------|-------|
| **Connect (HashPack)** | Users with an existing Hedera wallet | WalletConnect; signs votes and privileged actions in-wallet |
| **Email sign-in / create account** | New or returning Magic users | OTP via Magic; WCO may sponsor AccountCreate (no starter HBAR). Keys are non-custodial to WCO — users should export/back up keys and may import into [HashPack](https://www.hashpack.app/) for day-to-day asset management |

Privileged fan actions require a server-issued **wallet session** after connect. Admin writes use a short-lived **challenge–sign–verify** session. Details: [`SECURITY.md`](./SECURITY.md).

---

## Stack

- **UI** — React 18, TypeScript, Vite, Tailwind CSS 4, Motion  
- **API** — Hono on Deno (Supabase Edge); selected Node routes on Vercel  
- **Data** — Supabase Postgres KV table + object storage  
- **Chain** — `@hashgraph/sdk`, Hedera WalletConnect, Magic Hedera extension  
- **Hosting** — Vercel (SPA + Magic APIs), Supabase (Edge + Storage)

---

## Repository layout

```
src/app/                 # Pages, components, typed API client
api/                     # Vercel serverless (Magic ensure + register)
supabase/functions/
  make-server-57fcb0ee/  # Production Edge API (deploy this package)
docs/governance/         # HCS hybrid governance design & runbooks
scripts/hedera/          # Local Hedera scripts (keys in gitignored env only)
SECURITY.md              # Security model & residual risks
```

Shared client types and the API surface live in `src/app/lib/api.ts` and `src/app/lib/types.ts`.

---

## Local development

**Requirements:** Node.js 20+, pnpm (recommended).

```bash
git clone https://github.com/POSTwco/Wcobotbv2.git
cd Wcobotbv2
pnpm install
pnpm dev
```

App: [http://localhost:5173](http://localhost:5173)

```bash
pnpm build          # production build smoke
pnpm preview        # serve build locally
pnpm deploy:edge    # deploy Edge function (requires Supabase CLI + link)
```

Health check:

```bash
curl -s https://wotsoauebnoyvegcvouo.supabase.co/functions/v1/make-server-57fcb0ee/health
```

---

## Deployment

| Target | How |
|--------|-----|
| **Frontend + Magic APIs** | Push to `main` → Vercel production |
| **Edge API** | `pnpm deploy:edge` (or Supabase Dashboard → `make-server-57fcb0ee`) |

When changing `supabase/functions/`, deploy Edge after (or with) the frontend release. Mismatched SPA and Edge versions are a common production issue.

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [`SECURITY.md`](./SECURITY.md) | Auth model, disclosure, residual risks |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Contribution expectations (invite-only by default) |
| [`docs/governance/`](./docs/governance/) | Hybrid HCS governance architecture & cutover |
| [`docs/magic-onboarding.md`](./docs/magic-onboarding.md) | Magic email onboarding notes |
| [Terms](https://www.wcorg.io/terms) · [Privacy](https://www.wcorg.io/privacy) · [Whitepaper](https://www.wcorg.io/whitepaper) | Product legal & design docs |

---

## Security

- No service-role, Magic secret, or operator private keys in the frontend bundle  
- Supabase **anon** key in client source is expected; protection is Edge auth, sessions, and policies  
- Rate limits and wallet/admin sessions gate sensitive routes  
- Report vulnerabilities privately via channels on [wcorg.io](https://www.wcorg.io) — see [`SECURITY.md`](./SECURITY.md)

---

## Brand

| Token | Hex |
|-------|-----|
| Gold | `#D4A843` |
| Blue | `#4274B9` |
| Sky | `#6AA3E0` |
| Void | `#0B1120` |
| Slate | `#8494A7` |
| Frost | `#E8ECF0` |

Assets: [WCO branding kit (Supabase Storage)](https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/WCO%20white%20on%20trans.png)

---

## Community

- [X / Twitter](https://x.com/WCO_ORG)  
- [Discord](https://discord.com/invite/Zt52bf8Ve)  
- [YouTube](https://www.youtube.com/@WorldCalisthenicsOrg)  
- [Instagram](https://www.instagram.com/world_calisthenics_org/)  
- [worldcalisthenics.org](https://worldcalisthenics.org)

---

<p align="center">
  <strong>World Calisthenics Organization</strong><br/>
  <sub>Proprietary software · All rights reserved</sub>
</p>
