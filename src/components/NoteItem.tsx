import { FormEvent, useState } from "react";
import { Note } from "../types";
import { NoteContent } from "./NoteContent";
import { PencilIcon } from "./icons";

interface Props {
  note: Note;
  onEdit: (newText: string) => void;
}

export function NoteItem({ note, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);

  function startEdit() {
    setText(note.text);
    setEditing(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length === 0 && !note.imageDataUrl) return;
    onEdit(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <form className="note-edit-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <button type="submit">OK</button>
        <button type="button" onClick={() => setEditing(false)}>
          Annuler
        </button>
      </form>
    );
  }

  return (
    <div className="note-item-row">
      <div className="note-item-content">
        <NoteContent text={note.text} imageDataUrl={note.imageDataUrl} />
      </div>
      <button
        type="button"
        className="note-edit-button"
        onClick={startEdit}
        aria-label="Modifier la note"
      >
        <PencilIcon />
      </button>
    </div>
  );
}
