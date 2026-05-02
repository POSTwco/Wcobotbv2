# BOTB Token Launch Guide

**For: WCO CEO / Treasury Operator**
**Written: March 12, 2026**
**Status: PRE-LAUNCH — Delete this file after successful token launch**

---

## Table of Contents

1. [What You Are About to Do (Big Picture)](#1-what-you-are-about-to-do)
2. [What You Need Before You Start](#2-what-you-need-before-you-start)
3. [Step 1 — Create the BOTB Token on Hedera](#3-step-1--create-the-botb-token-on-hedera)
4. [Step 2 — Write Down the Token ID](#4-step-2--write-down-the-token-id)
5. [Step 3 — Mint the Initial Supply](#5-step-3--mint-the-initial-supply)
6. [Step 4 — Distribute to Early Holders / Airdrop](#6-step-4--distribute-to-early-holders--airdrop)
7. [Step 5 — Update the BOTB Server Code](#7-step-5--update-the-botb-server-code)
8. [Step 6 — Test with a Real Wallet](#8-step-6--test-with-a-real-wallet)
9. [Step 7 — Announce and Go Live](#9-step-7--announce-and-go-live)
10. [Token Settings Explained (Every Single One)](#10-token-settings-explained)
11. [The "Clean Three" Revenue Model — What Burns When](#11-the-clean-three-revenue-model)
12. [Common Mistakes and How to Avoid Them](#12-common-mistakes)
13. [Emergency Procedures](#13-emergency-procedures)
14. [Glossary](#14-glossary)

---

## 1. What You Are About to Do

You are creating a brand new digital token (like a digital coin) called "BOTB" on the
Hedera network. This token does NOT transfer money — it is a **voting weight token**.
People who hold BOTB tokens can use them to vote on athlete battles on your website.
More tokens = more voting power. The tokens never leave their wallets when they vote.

Think of it like this: owning BOTB tokens is like owning season tickets. The more
tickets you hold, the louder your voice when you cheer. But the tickets stay in your
pocket the whole time.

**After you create the token, you will:**
- Give (distribute) tokens to your community members
- Paste one line of code into the server (or tell your developer the Token ID)
- The website will automatically start checking everyone's token balance and
  weighting their votes accordingly

That is it. The website already knows what to do with the token. You just need to
create it and tell the website its ID number.

---

## 2. What You Need Before You Start

Check each box before continuing:

- [ ] **A Hedera mainnet account** (your "treasury" account, like 0.0.5402824)
- [ ] **HashPack wallet** installed (browser extension or mobile) with that account loaded
- [ ] **HBAR in your treasury account** — you need at least 5-10 HBAR for fees
  (creating a token costs about 1-2 HBAR, transactions cost fractions of a cent)
- [ ] **A second Hedera account** for testing (any account will do — even a friend's)
- [ ] **Access to the BOTB GitHub repo** (POSTwco/Wcobotb) OR a developer who does
- [ ] **A quiet 30 minutes** — do not rush this

**IMPORTANT: Do this on a computer, not a phone. You will need to copy-paste things.**

---

## 3. Step 1 — Create the BOTB Token on Hedera

There are two ways to create a token. Pick whichever feels more comfortable:

### Option A: Use HashPack's Built-in Token Creator (Easiest)

1. Open **HashPack** in your browser
2. Click on your treasury account (the one with HBAR in it)
3. Look for **"Create Token"** or **"Token Studio"** in the menu
   - In newer versions: click the "+" button near your token list
   - Or go to the HashPack web app: https://wallet.hashpack.app
4. You will see a form. Fill it out exactly as described in
   [Section 10 (Token Settings Explained)](#10-token-settings-explained) below
5. Click **"Create"** and approve the transaction in your wallet
6. HashPack will show you the new **Token ID** (looks like `0.0.XXXXXXX`)
7. **WRITE THIS DOWN IMMEDIATELY.** This is the single most important number.

### Option B: Use Hedera Token Service (HTS) via the Portal

1. Go to https://portal.hedera.com
2. Sign in or create an account (this is just for the portal UI, not your wallet)
3. Navigate to **"Tokens"** in the left sidebar
4. Click **"Create Token"**
5. Fill in the settings as described in
   [Section 10 (Token Settings Explained)](#10-token-settings-explained) below
6. When it asks for your account, enter your treasury account ID (like 0.0.5402824)
7. Approve the transaction via HashPack
8. The portal will display the new **Token ID**
9. **WRITE THIS DOWN IMMEDIATELY.**

### Option C: Use a HashScan-Compatible Creator Tool

1. Go to https://www.hashgraph.tools/tokens or a similar community tool
2. Connect your HashPack wallet
3. Fill in settings per [Section 10](#10-token-settings-explained)
4. Create and approve
5. **WRITE DOWN THE TOKEN ID.**

---

## 4. Step 2 — Write Down the Token ID

After creation, Hedera assigns your token a unique ID. It looks like this:

```
0.0.1234567
```

The first two numbers are always `0.0.` — the last number is what is unique to YOUR token.

**Write this number in three places right now:**

1. A sticky note on your monitor
2. A note in your phone
3. A message to yourself (email, Slack, whatever you use)

You will need this number for every step that follows. If you lose it, you can find it
again by searching your treasury account on https://hashscan.io — look under the
"Tokens Created" tab.

**Verify it worked:**
1. Go to https://hashscan.io
2. Search for your Token ID (e.g., `0.0.1234567`)
3. You should see a page showing:
   - Token Name: WCO (or whatever you chose)
   - Token Symbol: WCO
   - Treasury: your account ID
   - Total Supply: whatever you set
4. If you see this, congratulations — your token exists on the blockchain.

---

## 5. Step 3 — Mint the Initial Supply

**If you set an "Initial Supply" during creation**, your treasury account already holds
those tokens. You can skip this step.

**If you set Initial Supply to 0 and plan to mint later:**

1. Open HashPack
2. Go to your treasury account
3. Find the WCO token in your token list
4. Look for a **"Mint"** option (or use the Hedera Portal / SDK)
5. Enter the number of tokens you want to create
6. Approve the transaction

**HOW MANY TOKENS SHOULD YOU MINT?**

This depends on your community size and tokenomics plan. Here is a simple starting point:

| Community Size | Suggested Total Supply | Tokens Per Member (avg) |
|----------------|----------------------|------------------------|
| 100 people     | 1,000,000            | 10,000 each            |
| 500 people     | 10,000,000           | 20,000 each            |
| 1,000 people   | 100,000,000          | 100,000 each           |
| 5,000+ people  | 1,000,000,000        | 200,000 each           |

The exact number does not matter much — what matters is that everyone gets a meaningful
amount relative to the total supply. You can always mint more later (if you kept the
Supply Key — see Section 10).

---

## 6. Step 4 — Distribute to Early Holders / Airdrop

Now you need to send tokens from your treasury to your community members' wallets.

### Important: Token Association

**Before someone can receive your WCO token, they must "associate" with it.**
This is a Hedera security feature — it prevents random people from sending you
unwanted tokens. It costs the RECEIVER about 0.05 HBAR.

**Tell your community members to do this:**

1. Open HashPack
2. Click **"Add Token"** or the "+" icon in their token list
3. Search for your Token ID (e.g., `0.0.1234567`) or token name "WCO"
4. Click **"Associate"** and approve the small HBAR fee
5. They are now ready to receive WCO tokens

**If they do NOT associate first**, your transfer to them will FAIL. This is the
number one mistake people make. Tell them to associate BEFORE you send.

### Sending Tokens (Small Batch — Under 50 People)

1. Open HashPack
2. Click **"Send"**
3. Select the **WCO** token (not HBAR)
4. Enter the recipient's account ID (e.g., `0.0.987654`)
5. Enter the amount (e.g., `10000`)
6. Click **"Send"** and approve
7. Repeat for each person

### Sending Tokens (Large Batch — Airdrop to 50+ People)

For large distributions, use a batch transfer tool:

1. **HashPack Batch Send** — Some versions of HashPack support batch transfers
2. **Hedera Airdrop Tools** — Community tools like https://www.launchpage.xyz
   or https://www.hashgraph.tools support CSV-based airdrops
3. **Custom Script** — Your developer can write a simple script using the
   Hedera JavaScript SDK (but this requires coding knowledge)

For a CSV airdrop, you will need a file like:

```
account_id,amount
0.0.5402824,50000
0.0.10445281,50000
0.0.435185,10000
0.0.5402804,10000
```

---

## 7. Step 5 — Update the BOTB Server Code

This is the step where you "flip the switch" on the website. You have two options:

### Option A: Tell Your Developer (Recommended)

Send your developer this exact message:

> "The WCO token is live. The Token ID is `0.0.XXXXXXX` (replace with your real ID).
> Please update the `BOTB_TOKEN_ID` constant in
> `/supabase/functions/server/index.tsx` line 2388
> from `null` to the token ID string, and deploy."

That is it. They will know exactly what to do. The change is literally one line of code.

### Option B: Do It Yourself (If You Have GitHub Access)

1. Go to the GitHub repo: https://github.com/POSTwco/Wcobotb
2. Navigate to: `supabase/functions/server/index.tsx`
3. Find this line (around line 2388):

```typescript
const BOTB_TOKEN_ID: string | null = null; // TODO: Set to real 0.0.XXXXXXX when BOTB launches
```

4. Change it to (replace with YOUR real token ID):

```typescript
const BOTB_TOKEN_ID: string | null = "0.0.1234567"; // WCO token — launched 2026-XX-XX
```

5. Commit and push the change
6. Vercel will automatically redeploy (takes about 2-3 minutes)

### What This Change Does

When `BOTB_TOKEN_ID` is `null` (current state):
- Everyone gets 1 vote per wallet ("headcount mode")
- Token balances are not checked
- No tokens are required to vote

When `BOTB_TOKEN_ID` is set to a real token ID:
- The server checks every voter's WCO balance on the Hedera mirror node
- Voters allocate their token holdings as voting weight
- More tokens = more influence on battle outcomes
- NFT holders (Governor Series, Sigma Series) get voting power multipliers
- The "Clean Three" burn model activates on winner declarations

**THIS IS A ONE-WAY SWITCH** — once you flip it, going back to headcount mode would
reset everyone's expectations. Make sure tokens are distributed first.

---

## 8. Step 6 — Test with a Real Wallet

Before announcing to the world, test the full flow:

1. Make sure at least 2 wallets hold WCO tokens (your treasury + one test wallet)
2. Both wallets should have associated with the WCO token
3. Open the BOTB website in your browser
4. Connect with the TEST wallet (not treasury — use a wallet with a small amount)
5. Go to the Battles page
6. You should see your WCO balance displayed in the wallet panel
7. Open a battle that is in "Voting Open" status
8. Click an athlete to vote
9. You should see the stake slider showing your token balance
10. Set a stake amount and submit
11. Approve the signature in HashPack
12. The vote should succeed with the weighted amount

**Check the Supabase logs** (or ask your developer to check):
- Look for `[VOTE]` log entries
- You should see `verifiedBalance: XXXXX` matching the wallet's token count
- The `weightedVote` should equal `stakeAmount * votingPower`

**If the vote fails with "Insufficient balance":**
- The wallet does not hold enough WCO tokens
- Or the tokens have not been associated
- Check on https://hashscan.io/mainnet/account/0.0.XXXXXX → Tokens tab

---

## 9. Step 7 — Announce and Go Live

Once testing passes:

1. **Post an announcement** telling your community:
   - The WCO token is live
   - The Token ID is `0.0.XXXXXXX`
   - Everyone needs to "Associate" with the token in HashPack before they can receive it
   - Explain the voting weight system (more tokens = more vote power)
   - Explain that tokens are NOT transferred when voting — they stay in their wallet

2. **Distribute tokens** to all eligible community members (see Step 4)

3. **Open a battle** and let people vote

4. **Monitor the first few votes** in Supabase logs to make sure everything works

---

## 10. Token Settings Explained

When you create the token, you will see a form with many settings. Here is exactly
what to put for each one, and WHY.

### Required Settings

| Setting | What to Enter | Why |
|---------|--------------|-----|
| **Token Name** | `Battle of the Bars` | The full human-readable name. Shows up on HashScan, wallets, etc. |
| **Token Symbol** | `WCO` | The short ticker symbol (like "BTC" or "ETH"). Keep it 3-5 characters. |
| **Token Type** | `Fungible` | This means every token is identical (like dollars). NOT "Non-Fungible" — that is for NFTs. |
| **Decimals** | `0` | How many decimal places. Use `0` for whole-number tokens (1 WCO, 2 WCO, etc.). If you want fractions like 1.5 WCO, use `2` or `8`. **Recommendation: use 0 for simplicity.** |
| **Initial Supply** | Your chosen number (e.g., `100000000`) | How many tokens exist right now. You can mint more later if you keep the Supply Key. Enter the number WITHOUT commas. |
| **Treasury Account** | Your treasury account ID (e.g., `0.0.5402824`) | This is the account that will hold all newly minted tokens. It is the "bank vault." |

### Key Settings (VERY IMPORTANT — Read Each One Carefully)

Hedera tokens have "keys" that control who can do what. Think of each key as a
permission. **If you do not set a key, that action is PERMANENTLY IMPOSSIBLE.**

| Key | What It Controls | Recommendation | Explanation |
|-----|-----------------|----------------|-------------|
| **Admin Key** | Can change all other keys later | **SET THIS to your treasury account** | This is the "master key." Without it, you can never change any settings. Set it to your treasury account's key. |
| **Supply Key** | Can mint (create) or burn (destroy) tokens | **SET THIS to your treasury account** | Without this, you can NEVER create more tokens or burn tokens. The "Clean Three" burn model needs this. |
| **Freeze Key** | Can freeze a specific account's tokens | **SET THIS to your treasury account** | Lets you freeze a bad actor's tokens (e.g., if someone is cheating). |
| **Wipe Key** | Can wipe (delete) tokens from a specific account | **Optional — SET if you want** | Nuclear option: lets you delete tokens from someone's account. Useful for emergencies. Some communities see this as "too much power" — your call. |
| **KYC Key** | Can mark accounts as KYC-verified | **DO NOT SET (leave blank)** | You do not need this. It would require every holder to be manually approved before they can use their tokens. Way too much friction. |
| **Pause Key** | Can pause ALL token transfers globally | **SET THIS to your treasury account** | Emergency brake: lets you freeze ALL WCO transfers if something goes wrong. |
| **Fee Schedule Key** | Can set custom transfer fees | **Optional** | Only set this if you plan to charge a fee on every WCO transfer. Most voting tokens do not need this. |
| **Metadata Key** | Can update token metadata | **SET THIS to your treasury account** | Lets you update the token's description or image later. |

### THE GOLDEN RULE OF KEYS

**If you are not sure whether to set a key: SET IT.**

You can always remove a key later (using the Admin Key). But if you do not set a key
during creation, you can NEVER add it later. It is permanent.

The worst case of setting a key you do not need: you have a permission you never use.
The worst case of NOT setting a key you DO need: you are permanently locked out of
that feature forever, and there is nothing anyone can do about it.

### Optional Settings

| Setting | What to Enter | Notes |
|---------|--------------|-------|
| **Memo** | `WCO Battle of the Bars voting token` | A short description stored on-chain. Optional but looks professional. |
| **Max Supply** | Leave blank OR set a cap | If you set this, you can NEVER mint more than this amount. Leave blank for no cap (recommended during early launch — you can always set a cap later with Admin Key). |
| **Freeze Default** | `false` | If `true`, every new holder would start frozen and need manual unfreezing. DO NOT set to true. |
| **Custom Fees** | Leave blank | Only needed if you want to charge per-transfer fees. |
| **Token Image / Logo** | Upload the BOTB shield logo | Some creation tools let you attach an image. This shows up in wallets and explorers. |

---

## 11. The "Clean Three" Revenue Model

The BOTB platform uses a revenue model called "Clean Three" that automatically handles
tokens when a battle winner is declared. Here is how it works:

When an admin declares a winner for a battle:

1. **The server takes a snapshot** of all votes for that battle
2. **Losing voters' staked tokens** are redistributed:
   - **1/3 goes to winning voters** (proportional to their stake)
   - **1/3 goes to the WCO treasury** (revenue for the organization)
   - **1/3 is burned** (permanently destroyed, reducing total supply)

**IMPORTANT:** The server code for the Clean Three model references the Supply Key.
For burns to work, the treasury account (which holds the Supply Key) must be able to
execute burn transactions. The current server implementation handles the accounting
in the database — actual on-chain burns will require a separate step.

**For launch day**, the accounting (who won what, what gets burned) is tracked in the
database. You can execute the actual on-chain token transfers and burns in batches
after each battle completes. This can be automated later.

---

## 12. Common Mistakes

### Mistake 1: "I created the token but nobody can receive it"
**Fix:** Recipients must "associate" with the token first. Have them open HashPack,
search for your Token ID, and click Associate. This costs them about 0.05 HBAR.

### Mistake 2: "I set the wrong number of decimals"
**Fix:** You cannot change decimals after creation. If you set decimals to 8 but
wanted 0, you will need to create a new token. This is why we recommend 0 decimals
for simplicity. If you already created with decimals, it still works — you just need
to account for them (e.g., with 2 decimals, "10000" in the code means 100.00 tokens).

### Mistake 3: "I forgot to set the Supply Key and now I can't mint more tokens"
**Fix:** There is no fix. You cannot add keys after creation. You would need to
create a brand new token. This is why Section 10 says SET EVERY KEY.

### Mistake 4: "I entered the Token ID in the code but votes still show headcount"
**Fix:** Did you deploy? The code change only takes effect after Vercel rebuilds.
Check https://vercel.com for deployment status. Also make sure the Token ID string
is wrapped in quotes: `"0.0.1234567"` not `0.0.1234567`.

### Mistake 5: "The token shows on HashScan but not in my HashPack"
**Fix:** You need to associate with your own token too (even though you are the
treasury). Open HashPack, add token, search for your Token ID.

### Mistake 6: "I sent tokens to someone and they disappeared"
**Fix:** They did not disappear. Check the recipient's account on HashScan. If the
transfer shows as successful but they do not see it in HashPack, they need to add/
associate the token. Tokens are on-chain even if the wallet UI does not show them yet.

### Mistake 7: "I want to change the token name or symbol"
**Fix:** Token name and symbol cannot be changed after creation on Hedera. Make sure
you spell everything correctly before creating. If you really need to change it, you
must create a new token.

### Mistake 8: "Votes are failing with 'Insufficient balance'"
**Fix:** This means the voter's wallet does not have enough WCO tokens for the
stake amount they are trying to allocate. They either need more tokens or should
reduce their stake. Check their actual balance on HashScan.

---

## 13. Emergency Procedures

### "Something is wrong and I need to stop everything"

**Pause all token transfers:**
1. Open HashPack
2. Go to your treasury account
3. Find the WCO token settings
4. Use the **Pause Key** to pause the token
5. This freezes ALL transfers of WCO globally — nobody can send or receive

**Revert to headcount mode (no token weighting):**
1. Change `BOTB_TOKEN_ID` back to `null` in the code
2. Deploy to Vercel
3. The site will immediately revert to one-wallet-one-vote mode
4. All existing votes remain in the database but new votes will not check balances

### "Someone is cheating / using a bot"

**Freeze a specific account:**
1. Using the Freeze Key, you can freeze WCO tokens in a specific account
2. This prevents that account from transferring tokens but their tokens still exist
3. They can still vote with their existing balance (votes are off-chain)
4. To fully block them, you would need to add them to a deny list in the server code

### "I need to recover from a bad token launch"

1. Pause the token (Pause Key)
2. Revert the server to headcount mode (`BOTB_TOKEN_ID = null`)
3. Create a NEW token with corrected settings
4. Airdrop the new token to all holders of the old token
5. Update `BOTB_TOKEN_ID` to the new token ID
6. Deploy

---

## 14. Glossary

| Term | What It Means |
|------|---------------|
| **Token** | A digital unit on the blockchain. Like a poker chip but digital. |
| **Fungible** | Every unit is identical and interchangeable. One WCO = one WCO. |
| **Non-Fungible (NFT)** | Every unit is unique. Governor NFTs are non-fungible. |
| **Treasury** | The account that holds the "master supply" of tokens. Your main wallet. |
| **Mint** | Creating new tokens (increasing total supply). |
| **Burn** | Permanently destroying tokens (decreasing total supply). |
| **Associate** | A one-time action a wallet must take before it can hold a specific token. Costs ~0.05 HBAR. |
| **Token ID** | The unique identifier Hedera assigns to your token, like `0.0.1234567`. |
| **Mirror Node** | A read-only copy of the Hedera blockchain. The BOTB website uses it to check balances. |
| **HBAR** | Hedera's native cryptocurrency. Used to pay for all transaction fees. |
| **HTS** | Hedera Token Service — the system that manages tokens on Hedera. |
| **HashScan** | The block explorer for Hedera (like a public ledger viewer). https://hashscan.io |
| **Decimals** | How many fractional places a token supports. 0 = whole numbers only. 8 = up to 0.00000001. |
| **Supply Key** | The cryptographic key that allows minting and burning tokens. |
| **Admin Key** | The master key that can modify all other keys on the token. |
| **Headcount Mode** | The current BOTB voting mode where 1 wallet = 1 vote, regardless of token balance. |
| **Token-Weighted Mode** | The mode that activates when BOTB_TOKEN_ID is set. More tokens = more vote weight. |
| **Voting Power** | A multiplier applied to token stake. NFT holders get higher multipliers (e.g., 2x, 3x). |
| **WalletConnect** | The protocol that lets the BOTB website talk to HashPack. |
| **ED25519** | The cryptographic algorithm used by most Hedera wallets for signing. |

---

## Quick Reference Card

```
============================================
  BOTB TOKEN LAUNCH — QUICK CHECKLIST
============================================

BEFORE LAUNCH:
  [ ] Treasury has 5+ HBAR for fees
  [ ] Token created with ALL keys set
  [ ] Token ID written down: 0.0._________
  [ ] Token visible on HashScan
  [ ] Initial supply minted to treasury
  [ ] At least 2 test wallets associated

ACTIVATION:
  [ ] Update BOTB_TOKEN_ID in server code
  [ ] Deploy to Vercel
  [ ] Test vote with real tokens
  [ ] Check Supabase logs for weighted votes

DISTRIBUTION:
  [ ] Community notified to associate
  [ ] Tokens sent to early holders
  [ ] First real battle opened

AFTER LAUNCH:
  [ ] Monitor first 10 votes in logs
  [ ] Verify weighted tallies are correct
  [ ] Delete this file from the repo
============================================

THE ONE LINE OF CODE:
  File: /supabase/functions/server/index.tsx
  Line: ~2388
  Change: null  -->  "0.0.YOUR_TOKEN_ID"
============================================
```

---

*This document is temporary. Remove it from the repository after the BOTB token
has been successfully launched and verified in production.*