import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { Game, GAME_LABELS } from "../types";
import { SessionView } from "./SessionView";
import { JournalView } from "./JournalView";
import { NotesView } from "./NotesView";
import { StatsView } from "./StatsView";
import { RiotStats } from "./RiotStats";
import { MapsView } from "./MapsView";
import { SettingsPanel } from "./SettingsPanel";
import { UpdateBanner } from "./UpdateBanner";
import { GearIcon, LiveIcon } from "./icons";

type SubTab = "session" | "journal" | "notes" | "stats" | "tracker" | "maps";

const BASE_SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "session", label: "Session" },
  { id: "journal", label: "Journal" },
  { id: "notes", label: "Notes" },
  { id: "stats", label: "Stats" },
  { id: "maps", label: "Maps" },
];

function subTabsFor(game: Game): { id: SubTab; label: string }[] {
  if (game !== "valorant") return BASE_SUB_TABS;
  return [
    ...BASE_SUB_TABS.slice(0, 4),
    { id: "tracker", label: "Tracker" },
    ...BASE_SUB_TABS.slice(4),
  ];
}

export function AppShell() {
  const { profile, sessions } = useAppData();
  const activeGames = profile?.activeGames ?? [];
  const [currentGame, setCurrentGame] = useState<Game>(
    activeGames[0] ?? "valorant",
  );
  const [subTab, setSubTab] = useState<SubTab>("session");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tabRefs = useRef<Partial<Record<SubTab, HTMLButtonElement>>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const hasActiveSession = sessions.some(
    (s) => s.game === currentGame && s.endedAt === null,
  );
  const subTabs = subTabsFor(currentGame);

  useEffect(() => {
    if (subTab === "tracker" && currentGame !== "valorant") {
      setSubTab("session");
    }
  }, [currentGame, subTab]);

  useLayoutEffect(() => {
    const el = tabRefs.current[subTab];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [subTab, currentGame]);

  return (
    <div className={`app-shell app-shell--${currentGame}`}>
      <UpdateBanner />
      <header className="app-header">
        <div className="game-tabs">
          {activeGames.map((game) => (
            <button
              key={game}
              type="button"
              className={`game-tab ${currentGame === game ? "is-active" : ""}`}
              onClick={() => setCurrentGame(game)}
            >
              {GAME_LABELS[game]}
            </button>
          ))}
        </div>
        <div className="app-header-brand">
          {hasActiveSession && <LiveIcon />}
        </div>
        <button
          type="button"
          className="settings-trigger"
          onClick={() => setSettingsOpen(true)}
          aria-label="Reglages"
        >
          <GearIcon />
        </button>
      </header>

      <nav className="sub-tabs">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el ?? undefined;
            }}
            type="button"
            className={`sub-tab ${subTab === tab.id ? "is-active" : ""}`}
            onClick={() => setSubTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <span
          className="sub-tab-indicator"
          style={{ left: indicator.left, width: indicator.width }}
        />
      </nav>

      <main className="app-content">
        {subTab === "session" && <SessionView game={currentGame} />}
        {subTab === "journal" && <JournalView game={currentGame} />}
        {subTab === "notes" && <NotesView game={currentGame} />}
        {subTab === "stats" && <StatsView game={currentGame} />}
        {subTab === "tracker" && currentGame === "valorant" && <RiotStats />}
        {subTab === "maps" && <MapsView game={currentGame} />}
      </main>

      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
