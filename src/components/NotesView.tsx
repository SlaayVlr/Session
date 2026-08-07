import { useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { formatDate } from "../format";
import { Game } from "../types";
import { NoteContent } from "./NoteContent";

interface Props {
  game: Game;
}

interface FlatNote {
  id: string;
  text: string;
  imageDataUrl?: string;
  createdAt: number;
  modeId: string;
}

export function NotesView({ game }: Props) {
  const { sessions, settings } = useAppData();
  const [modeFilter, setModeFilter] = useState<string>("all");

  const modes = settings.customModes[game];
  const modeDef = (modeId: string) => modes.find((m) => m.id === modeId);

  const notes = useMemo(() => {
    const flat: FlatNote[] = [];
    for (const session of sessions) {
      if (session.game !== game || session.endedAt === null) continue;
      for (const segment of session.segments) {
        if (modeFilter !== "all" && segment.modeId !== modeFilter) continue;
        for (const note of segment.notes) {
          flat.push({
            id: note.id,
            text: note.text,
            imageDataUrl: note.imageDataUrl,
            createdAt: note.createdAt,
            modeId: segment.modeId,
          });
        }
      }
    }
    return flat.sort((a, b) => b.createdAt - a.createdAt);
  }, [sessions, game, modeFilter]);

  return (
    <div className="notes-view">
      <div className="journal-toolbar">
        <select
          className="journal-select"
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
        >
          <option value="all">Tous les modes</option>
          {modes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <span className="notes-view-count">
          {notes.length} note{notes.length > 1 ? "s" : ""}
        </span>
      </div>

      {notes.length === 0 ? (
        <div className="journal-empty">
          Aucune remarque {modeFilter !== "all" ? "pour ce mode" : ""} pour
          l'instant.
        </div>
      ) : (
        <div className="notes-list">
          {notes.map((note) => (
            <div key={note.id} className="notes-list-item">
              <div className="notes-list-meta">
                <span
                  className="journal-segment-label"
                  style={{ backgroundColor: modeDef(note.modeId)?.color ?? "#666" }}
                >
                  {modeDef(note.modeId)?.label ?? note.modeId}
                </span>
                <span className="notes-list-date">
                  {formatDate(note.createdAt)}
                </span>
              </div>
              <NoteContent text={note.text} imageDataUrl={note.imageDataUrl} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
