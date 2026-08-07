import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { uid } from "../uid";
import { EXE_NAME_BY_GAME, Game, GameSession } from "../types";
import { ModePalette } from "./ModePalette";
import { Timeline } from "./Timeline";
import { NoteComposer } from "./NoteComposer";

interface Props {
  game: Game;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function SessionView({ game }: Props) {
  const { sessions, setSessions, settings } = useAppData();
  const [now, setNow] = useState(Date.now());
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    null,
  );
  const hasSeenRunning = useRef(false);
  const pollTimer = useRef<number | null>(null);

  const activeSession = useMemo(
    () =>
      sessions.find((s) => s.game === game && s.endedAt === null) ?? null,
    [sessions, game],
  );

  useEffect(() => {
    if (!activeSession) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    setSelectedSegmentId(null);
  }, [game]);

  useEffect(() => {
    hasSeenRunning.current = false;
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    if (!activeSession) return;

    const exeName = EXE_NAME_BY_GAME[game];
    pollTimer.current = window.setInterval(async () => {
      try {
        const running = await invoke<boolean>("is_process_running", {
          exeName,
        });
        if (running) {
          hasSeenRunning.current = true;
        } else if (hasSeenRunning.current) {
          endSession();
        }
      } catch {
        // process detection best-effort only, ignore failures
      }
    }, 5000);

    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  async function startSession() {
    const newSession: GameSession = {
      id: uid(),
      game,
      startedAt: Date.now(),
      endedAt: null,
      segments: [],
    };
    await setSessions((prev) => [...prev, newSession]);

    const launchSettings = settings.autoLaunch[game];
    if (launchSettings.enabled && launchSettings.exePath.trim().length > 0) {
      try {
        await invoke("launch_game", { exePath: launchSettings.exePath });
      } catch {
        // launch is best-effort, the session still starts
      }
    }
  }

  async function endSession() {
    setSelectedSegmentId(null);
    await setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession?.id ? { ...s, endedAt: Date.now() } : s,
      ),
    );
  }

  async function addSegment(modeId: string) {
    if (!activeSession) return;
    const segmentId = uid();
    await setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              segments: [
                ...s.segments,
                { id: segmentId, modeId, createdAt: Date.now(), notes: [] },
              ],
            }
          : s,
      ),
    );
  }

  async function addNote(segmentId: string, text: string, imageDataUrl?: string) {
    if (!activeSession) return;
    await setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              segments: s.segments.map((seg) =>
                seg.id === segmentId
                  ? {
                      ...seg,
                      notes: [
                        ...seg.notes,
                        { id: uid(), text, createdAt: Date.now(), imageDataUrl },
                      ],
                    }
                  : seg,
              ),
            }
          : s,
      ),
    );
  }

  const selectedSegment =
    activeSession?.segments.find((s) => s.id === selectedSegmentId) ?? null;
  const selectedSegmentModeLabel = selectedSegment
    ? settings.customModes[game].find((m) => m.id === selectedSegment.modeId)
        ?.label ?? selectedSegment.modeId
    : "";

  return (
    <div className="session-view">
      <div className={`session-toolbar ${activeSession ? "session-toolbar--active" : ""}`}>
        <div className="session-timer">
          {activeSession
            ? formatElapsed(now - activeSession.startedAt)
            : "00:00"}
        </div>
        {activeSession ? (
          <button className="session-button session-button--stop" onClick={endSession}>
            Terminer la session
          </button>
        ) : (
          <button className="session-button session-button--start" onClick={startSession}>
            Lancer une session
          </button>
        )}
      </div>

      {activeSession ? (
        <>
          <ModePalette game={game} onPick={addSegment} />
          <Timeline
            game={game}
            segments={activeSession.segments}
            selectedSegmentId={selectedSegmentId}
            onDropMode={addSegment}
            onSelectSegment={setSelectedSegmentId}
          />
        </>
      ) : (
        <div className="session-idle-hint">
          Lance une session pour demarrer la timeline.
        </div>
      )}

      {selectedSegment && (
        <NoteComposer
          segment={selectedSegment}
          modeLabel={selectedSegmentModeLabel}
          onAddNote={(text, imageDataUrl) =>
            addNote(selectedSegment.id, text, imageDataUrl)
          }
          onClose={() => setSelectedSegmentId(null)}
        />
      )}
    </div>
  );
}
