import { Store } from "@tauri-apps/plugin-store";
import { DEFAULT_SETTINGS, GameSession, MapAnnotations, Profile, Settings } from "./types";

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = Store.load("session-data.json");
  }
  return storePromise;
}

export async function loadProfile(): Promise<Profile | null> {
  const store = await getStore();
  const value = await store.get<Profile>("profile");
  return value ?? null;
}

export async function saveProfile(profile: Profile): Promise<void> {
  const store = await getStore();
  await store.set("profile", profile);
  await store.save();
}

export async function loadSettings(): Promise<Settings> {
  const store = await getStore();
  const value = await store.get<Partial<Settings>>("settings");
  if (!value) return DEFAULT_SETTINGS;
  return {
    autoLaunch: { ...DEFAULT_SETTINGS.autoLaunch, ...value.autoLaunch },
    customModes: {
      valorant:
        value.customModes?.valorant ?? DEFAULT_SETTINGS.customModes.valorant,
      fortnite:
        value.customModes?.fortnite ?? DEFAULT_SETTINGS.customModes.fortnite,
    },
    theme: {
      mode: value.theme?.mode ?? DEFAULT_SETTINGS.theme.mode,
      accent: {
        ...DEFAULT_SETTINGS.theme.accent,
        ...value.theme?.accent,
      },
    },
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const store = await getStore();
  await store.set("settings", settings);
  await store.save();
}

export async function loadSessions(): Promise<GameSession[]> {
  const store = await getStore();
  const value = await store.get<GameSession[]>("sessions");
  return value ?? [];
}

export async function saveSessions(sessions: GameSession[]): Promise<void> {
  const store = await getStore();
  await store.set("sessions", sessions);
  await store.save();
}

export async function loadAnnotations(): Promise<MapAnnotations> {
  const store = await getStore();
  const value = await store.get<MapAnnotations>("mapAnnotations");
  return value ?? {};
}

export async function saveAnnotations(annotations: MapAnnotations): Promise<void> {
  const store = await getStore();
  await store.set("mapAnnotations", annotations);
  await store.save();
}
