import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-dialog";
import { ReactNode, useEffect, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { useUpdater } from "../hooks/useUpdater";
import { uid } from "../uid";
import { Game, GAME_LABELS, ThemeMode } from "../types";
import { ChevronIcon, TrashIcon } from "./icons";

const DISCORD_CONTACT = "2zt8";

interface Props {
  onClose: () => void;
}

const GAMES: Game[] = ["valorant", "fortnite"];

function SettingsChapter({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="settings-chapter">
      <button
        type="button"
        className="settings-chapter-header"
        onClick={() => setOpen((prev) => !prev)}
      >
        <h3 className="settings-chapter-title">{title}</h3>
        <ChevronIcon open={open} />
      </button>
      {open && <div className="settings-chapter-content">{children}</div>}
    </section>
  );
}

export function SettingsPanel({ onClose }: Props) {
  const { profile, setProfile, settings, setSettings } = useAppData();
  const [pseudoInput, setPseudoInput] = useState(profile?.pseudo ?? "");
  const [addModeOpen, setAddModeOpen] = useState(false);
  const [newModeGame, setNewModeGame] = useState<Game>("valorant");
  const [newModeLabel, setNewModeLabel] = useState("");
  const [newModeColor, setNewModeColor] = useState("#888888");
  const [appVersion, setAppVersion] = useState("");
  const { status, update, progress, checkForUpdate, installUpdate } = useUpdater();

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => {});
  }, []);

  function handlePseudoChange(value: string) {
    setPseudoInput(value);
    if (profile && value.trim().length > 0) {
      setProfile({ ...profile, pseudo: value.trim() });
    }
  }

  function toggleGame(game: Game) {
    if (!profile) return;
    const isActive = profile.activeGames.includes(game);
    if (isActive && profile.activeGames.length === 1) return;
    const activeGames = isActive
      ? profile.activeGames.filter((g) => g !== game)
      : [...profile.activeGames, game];
    setProfile({ ...profile, activeGames });
  }

  function setThemeMode(mode: ThemeMode) {
    setSettings({ ...settings, theme: { ...settings.theme, mode } });
  }

  function setAccentColor(game: Game, color: string) {
    setSettings({
      ...settings,
      theme: {
        ...settings.theme,
        accent: { ...settings.theme.accent, [game]: color },
      },
    });
  }

  function toggleAutoLaunch(game: Game) {
    setSettings({
      ...settings,
      autoLaunch: {
        ...settings.autoLaunch,
        [game]: {
          ...settings.autoLaunch[game],
          enabled: !settings.autoLaunch[game].enabled,
        },
      },
    });
  }

  function setExePath(game: Game, exePath: string) {
    setSettings({
      ...settings,
      autoLaunch: {
        ...settings.autoLaunch,
        [game]: { ...settings.autoLaunch[game], exePath },
      },
    });
  }

  async function browseExePath(game: Game) {
    const picked = await open({ multiple: false, directory: false });
    if (typeof picked === "string") {
      setExePath(game, picked);
    }
  }

  function setModeColor(game: Game, modeId: string, color: string) {
    setSettings({
      ...settings,
      customModes: {
        ...settings.customModes,
        [game]: settings.customModes[game].map((m) =>
          m.id === modeId ? { ...m, color } : m,
        ),
      },
    });
  }

  function deleteMode(game: Game, modeId: string) {
    if (settings.customModes[game].length <= 1) return;
    setSettings({
      ...settings,
      customModes: {
        ...settings.customModes,
        [game]: settings.customModes[game].filter((m) => m.id !== modeId),
      },
    });
  }

  function openAddMode() {
    setNewModeGame(profile?.activeGames[0] ?? "valorant");
    setNewModeLabel("");
    setNewModeColor("#888888");
    setAddModeOpen(true);
  }

  function confirmAddMode() {
    const label = newModeLabel.trim();
    if (label.length === 0) return;
    setSettings({
      ...settings,
      customModes: {
        ...settings.customModes,
        [newModeGame]: [
          ...settings.customModes[newModeGame],
          { id: uid(), label, color: newModeColor },
        ],
      },
    });
    setAddModeOpen(false);
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Reglages</h2>
          <button
            type="button"
            className="note-composer-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            x
          </button>
        </div>

        <SettingsChapter title="Profil">
          <label className="settings-field">
            <span>Pseudo</span>
            <input
              type="text"
              value={pseudoInput}
              onChange={(e) => handlePseudoChange(e.target.value)}
              maxLength={24}
            />
          </label>

          <div className="settings-field">
            <span>Jeux actifs</span>
            <div className="game-select-grid game-select-grid--compact">
              {GAMES.map((game) => (
                <button
                  key={game}
                  type="button"
                  className={`game-select-card game-select-card--${game} ${
                    profile?.activeGames.includes(game) ? "is-selected" : ""
                  }`}
                  onClick={() => toggleGame(game)}
                >
                  {GAME_LABELS[game]}
                </button>
              ))}
            </div>
          </div>
        </SettingsChapter>

        <SettingsChapter title="Theme">
          <div className="settings-field">
            <span>Apparence</span>
            <div className="theme-mode-grid">
              <button
                type="button"
                className={`theme-mode-card ${
                  settings.theme.mode === "dark" ? "is-selected" : ""
                }`}
                onClick={() => setThemeMode("dark")}
              >
                Sombre
              </button>
              <button
                type="button"
                className={`theme-mode-card ${
                  settings.theme.mode === "light" ? "is-selected" : ""
                }`}
                onClick={() => setThemeMode("light")}
              >
                Claire
              </button>
            </div>
          </div>

          <div className="settings-field">
            <span>Couleur d'accent</span>
            {GAMES.map((game) => (
              <div key={game} className="settings-color-row">
                <span>{GAME_LABELS[game]}</span>
                <input
                  type="color"
                  value={settings.theme.accent[game]}
                  onChange={(e) => setAccentColor(game, e.target.value)}
                />
              </div>
            ))}
          </div>
        </SettingsChapter>

        <SettingsChapter title="Lancement automatique">
          {GAMES.map((game) => (
            <div key={game} className="settings-launch-row">
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={settings.autoLaunch[game].enabled}
                  onChange={() => toggleAutoLaunch(game)}
                />
                {GAME_LABELS[game]}
              </label>
              <div className="settings-exe-row">
                <input
                  type="text"
                  className="settings-exe-input"
                  placeholder={`Exe ${GAME_LABELS[game]} non choisi`}
                  value={settings.autoLaunch[game].exePath}
                  readOnly
                  disabled={!settings.autoLaunch[game].enabled}
                />
                <button
                  type="button"
                  className="settings-browse-button"
                  disabled={!settings.autoLaunch[game].enabled}
                  onClick={() => browseExePath(game)}
                >
                  Parcourir...
                </button>
              </div>
            </div>
          ))}
        </SettingsChapter>

        <SettingsChapter title="Modes et couleurs">
          {GAMES.map((game) => (
            <div key={game} className="settings-field">
              <span>{GAME_LABELS[game]}</span>
              {settings.customModes[game].map((mode) => (
                <div key={mode.id} className="settings-color-row">
                  <span>{mode.label}</span>
                  <div className="settings-color-row-actions">
                    <input
                      type="color"
                      value={mode.color}
                      onChange={(e) => setModeColor(game, mode.id, e.target.value)}
                    />
                    <button
                      type="button"
                      className="settings-mode-delete"
                      onClick={() => deleteMode(game, mode.id)}
                      disabled={settings.customModes[game].length <= 1}
                      aria-label={`Supprimer le mode ${mode.label}`}
                    >
                      <TrashIcon size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <button
            type="button"
            className="settings-browse-button settings-add-mode-trigger"
            onClick={openAddMode}
          >
            + Ajouter un mode
          </button>
        </SettingsChapter>

        <div className="settings-footer">
          <div className="settings-update-row">
            <button
              type="button"
              className="settings-browse-button"
              onClick={checkForUpdate}
              disabled={status === "checking" || status === "downloading"}
            >
              {status === "checking" ? "Verification..." : "Verifier les mises a jour"}
            </button>
            {status === "up-to-date" && (
              <span className="settings-update-status">A jour</span>
            )}
            {status === "found" && update && (
              <button
                type="button"
                className="settings-browse-button settings-update-install"
                onClick={installUpdate}
              >
                Installer v{update.version}
              </button>
            )}
            {status === "downloading" && (
              <span className="settings-update-status">{progress}%</span>
            )}
            {status === "ready" && (
              <span className="settings-update-status">Redemarrage...</span>
            )}
            {status === "error" && (
              <span className="settings-update-status">Echec de la verification</span>
            )}
          </div>
          <div className="settings-meta">
            <span>Session{appVersion ? ` v${appVersion}` : ""}</span>
            <span>Discord : {DISCORD_CONTACT}</span>
          </div>
        </div>
      </div>

      {addModeOpen && (
        <div
          className="add-mode-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setAddModeOpen(false);
          }}
        >
          <div
            className="add-mode-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Nouveau mode</h3>

            <div className="settings-field">
              <span>Jeu</span>
              <div className="game-select-grid game-select-grid--compact">
                {GAMES.map((game) => (
                  <button
                    key={game}
                    type="button"
                    className={`game-select-card game-select-card--${game} ${
                      newModeGame === game ? "is-selected" : ""
                    }`}
                    onClick={() => setNewModeGame(game)}
                  >
                    {GAME_LABELS[game]}
                  </button>
                ))}
              </div>
            </div>

            <label className="settings-field">
              <span>Nom du mode</span>
              <input
                type="text"
                value={newModeLabel}
                onChange={(e) => setNewModeLabel(e.target.value)}
                placeholder="Ex: Zero Build"
                maxLength={20}
                autoFocus
              />
            </label>

            <label className="settings-field">
              <span>Couleur</span>
              <input
                type="color"
                value={newModeColor}
                onChange={(e) => setNewModeColor(e.target.value)}
              />
            </label>

            <div className="add-mode-actions">
              <button
                type="button"
                className="settings-browse-button"
                onClick={() => setAddModeOpen(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="onboarding-button add-mode-confirm"
                onClick={confirmAddMode}
                disabled={newModeLabel.trim().length === 0}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
