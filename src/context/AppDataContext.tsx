import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  loadProfile,
  loadSessions,
  loadSettings,
  saveProfile,
  saveSessions,
  saveSettings,
} from "../store";
import { DEFAULT_SETTINGS, GameSession, Profile, Settings } from "../types";

interface AppData {
  ready: boolean;
  profile: Profile | null;
  setProfile: (profile: Profile) => Promise<void>;
  settings: Settings;
  setSettings: (settings: Settings) => Promise<void>;
  sessions: GameSession[];
  setSessions: (
    updater: GameSession[] | ((prev: GameSession[]) => GameSession[]),
  ) => Promise<void>;
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [sessions, setSessionsState] = useState<GameSession[]>([]);

  useEffect(() => {
    (async () => {
      const [p, s, sess] = await Promise.all([
        loadProfile(),
        loadSettings(),
        loadSessions(),
      ]);
      setProfileState(p);
      setSettingsState(s);
      setSessionsState(sess);
      setReady(true);
    })();
  }, []);

  const setProfile = useCallback(async (next: Profile) => {
    setProfileState(next);
    await saveProfile(next);
  }, []);

  const setSettings = useCallback(async (next: Settings) => {
    setSettingsState(next);
    await saveSettings(next);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme.mode;
    root.style.setProperty("--accent-valorant", settings.theme.accent.valorant);
    root.style.setProperty("--accent-fortnite", settings.theme.accent.fortnite);
  }, [settings.theme]);

  const setSessions = useCallback(
    async (
      updater: GameSession[] | ((prev: GameSession[]) => GameSession[]),
    ) => {
      setSessionsState((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (prev: GameSession[]) => GameSession[])(prev)
            : updater;
        saveSessions(next);
        return next;
      });
    },
    [],
  );

  return (
    <AppDataContext.Provider
      value={{
        ready,
        profile,
        setProfile,
        settings,
        setSettings,
        sessions,
        setSessions,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
