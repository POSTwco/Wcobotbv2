import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { HomePage } from "./pages/home";
import { BattlesPage } from "./pages/battles";
import { AthletesPage } from "./pages/athletes";
import { NFTsPage } from "./pages/nfts";
import { GovernancePage } from "./pages/governance";
import { LeaderboardPage } from "./pages/leaderboard";
import { ApplyPage } from "./pages/apply";
import { PrivacyPage } from "./pages/privacy";
import { TermsPage } from "./pages/terms";
import { WhitepaperPage } from "./pages/whitepaper";
import { RouteErrorPage, NotFoundPage } from "./components/error-boundary";
import { SecurityAuditPage } from "./pages/security-audit";
import { UserPenTestPage } from "./pages/security-pentest-user";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    ErrorBoundary: RouteErrorPage,
    children: [
      { index: true, Component: HomePage },
      { path: "battles", Component: BattlesPage },
      { path: "athletes", Component: AthletesPage },
      { path: "nfts", Component: NFTsPage },
      { path: "governance", Component: GovernancePage },
      { path: "leaderboard", Component: LeaderboardPage },
      { path: "apply", Component: ApplyPage },
      { path: "privacy", Component: PrivacyPage },
      { path: "terms", Component: TermsPage },
      { path: "whitepaper", Component: WhitepaperPage },
      { path: "security-audit", Component: SecurityAuditPage },
      { path: "security-pentest", Component: UserPenTestPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);