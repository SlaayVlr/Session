import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { FormEvent, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { pickImageAsDataUrl } from "../imagePicker";
import { uid } from "../uid";
import { Game, ModeDef } from "../types";
import { formatDate, formatDuration, formatTime, sessionDuration } from "../format";
import { DownloadIcon, ImageIcon, TrashIcon, XIcon } from "./icons";
import { NoteItem } from "./NoteItem";

interface Props {
  game: Game;
}

type SortOrder = "recent" | "oldest" | "longest";

function AddNoteRow({
  onAdd,
}: {
  onAdd: (text: string, imageDataUrl?: string) => void;
}) {
  const [text, setText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();

  async function handleAttach() {
    const dataUrl = await pickImageAsDataUrl();
    if (dataUrl) setImageDataUrl(dataUrl);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length === 0 && !imageDataUrl) return;
    onAdd(trimmed, imageDataUrl);
    setText("");
    setImageDataUrl(undefined);
  }

  return (
    <div className="journal-add-note">
      {imageDataUrl && (
        <div className="note-image-preview">
          <img src={imageDataUrl} alt="Piece jointe" />
          <button
            type="button"
            className="note-image-remove"
            onClick={() => setImageDataUrl(undefined)}
            aria-label="Retirer l'image"
          >
            <XIcon />
          </button>
        </div>
      )}
      <form className="journal-add-note-form" onSubmit={handleSubmit}>
        <button
          type="button"
          className="note-attach-button"
          onClick={handleAttach}
          aria-label="Joindre une image"
        >
          <ImageIcon size={14} />
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ajouter une remarque..."
        />
        <button type="submit" disabled={text.trim().length === 0 && !imageDataUrl}>
          Ajouter
        </button>
      </form>
    </div>
  );
}

export function JournalView({ game }: Props) {
  const { sessions, settings, setSessions } = useAppData();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const modeDef = (modeId: string) =>
    settings.customModes[game].find((m) => m.id === modeId);

  const pastSessions = useMemo(() => {
    const filtered = sessions.filter(
      (s) =>
        s.game === game &&
        s.endedAt !== null &&
        (modeFilter === "all" ||
          s.segments.some((seg) => seg.modeId === modeFilter)),
    );
    return filtered.sort((a, b) => {
      switch (sortOrder) {
        case "recent":
          return b.startedAt - a.startedAt;
        case "oldest":
          return a.startedAt - b.startedAt;
        case "longest":
          return sessionDuration(b) - sessionDuration(a);
      }
    });
  }, [sessions, game, modeFilter, sortOrder]);

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    await setSessions((prev) => prev.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
    setPendingDeleteId(null);
  }

  function sessionToExportData(
    session: (typeof pastSessions)[number],
    modeLookup: (id: string) => ModeDef | undefined,
  ) {
    return {
      date: new Date(session.startedAt).toISOString(),
      durationMinutes: Math.round(sessionDuration(session) / 60000),
      segments: session.segments.map((segment) => ({
        mode: modeLookup(segment.modeId)?.label ?? segment.modeId,
        time: new Date(segment.createdAt).toISOString(),
        notes: segment.notes.map((n) => ({
          text: n.text,
          image: n.imageDataUrl,
        })),
      })),
    };
  }

  async function exportToFile(defaultPath: string, contents: unknown) {
    const path = await save({
      defaultPath,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path) return;
    await invoke("write_text_file", {
      path,
      contents: JSON.stringify(contents, null, 2),
    });
  }

  async function handleExportAll() {
    const data = pastSessions.map((s) => sessionToExportData(s, modeDef));
    await exportToFile(`journal-${game}.json`, data);
  }

  async function handleExportOne(session: (typeof pastSessions)[number]) {
    const data = sessionToExportData(session, modeDef);
    await exportToFile(
      `session-${game}-${formatDate(session.startedAt).replace(/[^0-9a-z]/gi, "-")}.json`,
      data,
    );
  }

  async function addNoteToSegment(
    sessionId: string,
    segmentId: string,
    text: string,
    imageDataUrl?: string,
  ) {
    await setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
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

  async function editNoteInSegment(
    sessionId: string,
    segmentId: string,
    noteId: string,
    newText: string,
  ) {
    await setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              segments: s.segments.map((seg) =>
                seg.id === segmentId
                  ? {
                      ...seg,
                      notes: seg.notes.map((n) =>
                        n.id === noteId ? { ...n, text: newText } : n,
                      ),
                    }
                  : seg,
              ),
            }
          : s,
      ),
    );
  }

  const modes = settings.customModes[game];

  return (
    <div className="journal-view">
      <div className="journal-toolbar">
        <select
          className="journal-select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
        >
          <option value="recent">Plus recentes</option>
          <option value="oldest">Plus anciennes</option>
          <option value="longest">Plus longues</option>
        </select>
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
        <button
          type="button"
          className="journal-export-button"
          onClick={handleExportAll}
          disabled={pastSessions.length === 0}
        >
          <DownloadIcon />
          Exporter
        </button>
      </div>

      {pastSessions.length === 0 ? (
        <div className="journal-empty">
          Aucune session {modeFilter !== "all" ? "pour ce mode" : "terminee"}{" "}
          pour l'instant.
        </div>
      ) : (
        pastSessions.map((session) => {
          const isFiltered = modeFilter !== "all";
          const isExpanded = isFiltered || expandedId === session.id;
          const visibleSegments = isFiltered
            ? session.segments.filter((seg) => seg.modeId === modeFilter)
            : session.segments;
          const noteCount = visibleSegments.reduce(
            (acc, seg) => acc + seg.notes.length,
            0,
          );
          return (
            <div key={session.id} className="journal-entry">
              <div className="journal-entry-row">
                <button
                  type="button"
                  className="journal-entry-header"
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                >
                  <span className="journal-entry-date">
                    {formatDate(session.startedAt)}
                  </span>
                  <span className="journal-entry-duration">
                    {formatDuration(sessionDuration(session))}
                  </span>
                  <span className="journal-entry-notes">
                    {noteCount} note{noteCount > 1 ? "s" : ""}
                  </span>
                </button>
                <button
                  type="button"
                  className="journal-icon-button"
                  onClick={() => handleExportOne(session)}
                  aria-label="Exporter cette session"
                >
                  <DownloadIcon size={14} />
                </button>
                <button
                  type="button"
                  className="journal-icon-button journal-icon-button--danger"
                  onClick={() => setPendingDeleteId(session.id)}
                  aria-label="Supprimer la session"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
              {isExpanded && (
                <div className="journal-entry-detail">
                  {visibleSegments.length === 0 && (
                    <p className="journal-entry-empty">
                      {isFiltered
                        ? "Aucun segment pour ce mode."
                        : "Aucun segment sur cette session."}
                    </p>
                  )}
                  {visibleSegments.map((segment) => (
                    <div key={segment.id} className="journal-segment">
                      <div
                        className="journal-segment-label"
                        style={{
                          backgroundColor:
                            modeDef(segment.modeId)?.color ?? "#666",
                        }}
                      >
                        {modeDef(segment.modeId)?.label ?? segment.modeId}
                        <span className="journal-segment-time">
                          {formatTime(segment.createdAt)}
                        </span>
                      </div>
                      {segment.notes.length > 0 && (
                        <ul className="journal-segment-notes">
                          {segment.notes.map((note) => (
                            <li key={note.id}>
                              <NoteItem
                                note={note}
                                onEdit={(newText) =>
                                  editNoteInSegment(
                                    session.id,
                                    segment.id,
                                    note.id,
                                    newText,
                                  )
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                      <AddNoteRow
                        onAdd={(text, imageDataUrl) =>
                          addNoteToSegment(
                            session.id,
                            segment.id,
                            text,
                            imageDataUrl,
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {pendingDeleteId && (
        <div
          className="add-mode-overlay"
          onClick={() => setPendingDeleteId(null)}
        >
          <div className="add-mode-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Supprimer la session ?</h3>
            <p className="journal-confirm-text">Action definitive.</p>
            <div className="add-mode-actions">
              <button
                type="button"
                className="settings-browse-button"
                onClick={() => setPendingDeleteId(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="journal-confirm-delete"
                onClick={confirmDelete}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
