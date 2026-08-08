export type Game = "valorant" | "fortnite";

export const GAME_LABELS: Record<Game, string> = {
  valorant: "Valorant",
  fortnite: "Fortnite",
};

export interface ModeDef {
  id: string;
  label: string;
  color: string;
}

export const DEFAULT_MODES: Record<Game, ModeDef[]> = {
  valorant: [
    { id: "ranked", label: "Ranked", color: "#ff4655" },
    { id: "training", label: "Entrainement", color: "#34c759" },
  ],
  fortnite: [
    { id: "creative", label: "Creative", color: "#3aa8ff" },
    { id: "ranked", label: "Ranked", color: "#9b6bff" },
    { id: "cup", label: "Cup", color: "#f5b642" },
  ],
};

export interface Note {
  id: string;
  text: string;
  createdAt: number;
  imageDataUrl?: string;
}

export interface Segment {
  id: string;
  modeId: string;
  createdAt: number;
  notes: Note[];
}

export interface GameSession {
  id: string;
  game: Game;
  startedAt: number;
  endedAt: number | null;
  segments: Segment[];
}

export interface Profile {
  pseudo: string;
  activeGames: Game[];
}

export interface GameLaunchSettings {
  enabled: boolean;
  exePath: string;
}

export type ThemeMode = "dark" | "light";

export interface ThemeSettings {
  mode: ThemeMode;
  accent: Record<Game, string>;
}

export interface Settings {
  autoLaunch: Record<Game, GameLaunchSettings>;
  customModes: Record<Game, ModeDef[]>;
  theme: ThemeSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  autoLaunch: {
    valorant: { enabled: false, exePath: "" },
    fortnite: { enabled: false, exePath: "" },
  },
  customModes: DEFAULT_MODES,
  theme: {
    mode: "dark",
    accent: {
      valorant: "#ff4655",
      fortnite: "#7c5cff",
    },
  },
};

export const EXE_NAME_BY_GAME: Record<Game, string> = {
  valorant: "VALORANT-Win64-Shipping.exe",
  fortnite: "FortniteClient-Win64-Shipping.exe",
};

export type ShapeType = "line" | "arrow" | "rect" | "circle" | "text" | "pen" | "icon";

export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  type: ShapeType;
  color: string;
  points: Point[];
  text?: string;
  iconUrl?: string;
  sizeScale?: number;
}

export type MapAnnotations = Record<string, Shape[]>;
