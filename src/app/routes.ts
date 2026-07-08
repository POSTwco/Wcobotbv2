import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { HomePage } from "./pages/home";
import { BattlesPage } from "./pages/battles";
import { AthletesPage } from "./pages/athletes";
import { NFTsPage } from "./pages/nfts";
import { GovernancePage } from "./pages/governance";
import { LeaderboardPage } from "./pages/leaderboard";
import { ApplyPage } from "./pages/apply";
import { CalisthenicsPage } from "./pages/calisthenics";
import { CalisthenicsWorkoutPage } from "./pages/calisthenics-workout";
import { CalisthenicsHistoryPage } from "./pages/calisthenics-history";
import { CalisthenicsPRsPage } from "./pages/calisthenics-prs";
import { CalisthenicsAnalyticsPage } from "./pages/calisthenics-analytics";
import { CalisthenicsElitePage } from "./pages/calisthenics-elite";
import { CalisthenicsEliteWorkoutPage } from "./pages/calisthenics-elite-workout";
import { CalisthenicsEliteCustomPage } from "./pages/calisthenics-elite-custom";

import { PrivacyPage } from "./pages/privacy";
import { TermsPage } from "./pages/terms";
import { WhitepaperPage } from "./pages/whitepaper";
import { RouteErrorPage, NotFoundPage } from "./components/error-boundary";

// Historical client pen-test UIs removed from the tree (2026-07 hygiene pass).
// See docs/security-archive/README.md and SECURITY.md — not continuous certification.

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
      { path: "calisthenics", Component: CalisthenicsPage },
      { path: "calisthenics/workout/:id", Component: CalisthenicsWorkoutPage },
      { path: "calisthenics/history", Component: CalisthenicsHistoryPage },
      { path: "calisthenics/prs", Component: CalisthenicsPRsPage },
      { path: "calisthenics/analytics", Component: CalisthenicsAnalyticsPage },
      { path: "calisthenics/elite", Component: CalisthenicsElitePage },
      { path: "calisthenics/elite/workout/:id", Component: CalisthenicsEliteWorkoutPage },
      { path: "calisthenics/elite/custom", Component: CalisthenicsEliteCustomPage },

      { path: "privacy", Component: PrivacyPage },
      { path: "terms", Component: TermsPage },
      { path: "whitepaper", Component: WhitepaperPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
