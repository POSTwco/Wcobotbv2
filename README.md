
  # Web 3 Interactive Voting Site (Copy)

  This is a code bundle for Web 3 Interactive Voting Site (Copy). The original project is available at https://www.figma.com/design/ONYFF4b0z10GlNzXDm0rZs/Web-3-Interactive-Voting-Site--Copy-.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  ## 🛡️ Security & Setup

### Security Highlights
- **User funds and wallets are 100% safe**: This is a pure client-side dApp. Private keys **never** touch the server or this codebase.
- All transactions are signed directly in the user’s wallet (HashPack, Blade, Kabila, etc.).
- WalletConnect Project ID is loaded from environment variables (never hardcoded in source code).
- No admin backdoors or centralized vote manipulation — voting is handled on-chain via Hedera Consensus Service (HCS).
- Supabase storage is used only for public assets (images/videos). Sensitive operations use Row Level Security where applicable.

### 🚀 Local Development Setup
1. Clone the repository
2. Copy `.env.example` → `.env`
3. Fill in your `VITE_WC_PROJECT_ID` (create one free at https://cloud.reown.com)
4. Run `pnpm install`
5. Run `pnpm run dev`

Open http://localhost:5173 to test.

### Production Deployment
- Automatically deployed to Vercel on every push to `main`
- **Important**: Add the following environment variable in Vercel Dashboard → Settings → Environment Variables:
  - `VITE_WC_PROJECT_ID` = your real WalletConnect Project ID

**Never commit real secrets, `.env` files, or private keys.**

### Additional Security Notes
- `.gitignore` is configured to protect environment files and build artifacts
- All dependencies are audited and kept up-to-date
- Branch protection and pull-request reviews are recommended for the `main` branch

For questions or contributions, open an issue or reach out to the team.