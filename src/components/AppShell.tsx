import { useLayoutEffect, useRef, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { Game, GAME_LABELS } from "../types";
import { SessionView } from "./SessionView";
import { JournalView } from "./JournalView";
import { NotesView } from "./NotesView";
import { StatsView } from "./StatsView";
import { SettingsPanel } from "./SettingsPanel";
import { UpdateBanner } from "./UpdateBanner";
import { GearIcon } from "./icons";

type SubTab = "session" | "journal" | "notes" | "stats";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "session", label: "Session" },
  { id: "journal", label: "Journal" },
  { id: "notes", label: "Notes" },
  { id: "stats", label: "Stats" },
];

export function AppShell() {
  const { profile } = useAppData();
  const activeGames = profile?.activeGames ?? [];
  const [currentGame, setCurrentGame] = useState<Game>(
    activeGames[0] ?? "valorant",
  );
  const [subTab, setSubTab] = useState<SubTab>("session");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tabRefs = useRef<Partial<Record<SubTab, HTMLButtonElement>>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = tabRefs.current[subTab];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [subTab]);

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
        {SUB_TABS.map((tab) => (
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
      </main>

      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
