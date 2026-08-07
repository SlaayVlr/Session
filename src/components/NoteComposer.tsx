import { FormEvent, useState } from "react";
import { pickImageAsDataUrl } from "../imagePicker";
import { Segment } from "../types";
import { ImageIcon, XIcon } from "./icons";
import { NoteItem } from "./NoteItem";

interface Props {
  segment: Segment;
  modeLabel: string;
  onAddNote: (text: string, imageDataUrl?: string) => void;
  onEditNote: (noteId: string, newText: string) => void;
  onClose: () => void;
}

export function NoteComposer({
  segment,
  modeLabel,
  onAddNote,
  onEditNote,
  onClose,
}: Props) {
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
    onAddNote(trimmed, imageDataUrl);
    setText("");
    setImageDataUrl(undefined);
    onClose();
  }

  return (
    <div className="note-composer">
      <div className="note-composer-header">
        <span>Notes - {modeLabel}</span>
        <button
          type="button"
          className="note-composer-close"
          onClick={onClose}
          aria-label="Fermer"
        >
          x
        </button>
      </div>
      <div className="note-composer-thread">
        {segment.notes.length === 0 && (
          <p className="note-composer-empty">
            Pas encore de remarque sur ce segment.
          </p>
        )}
        {segment.notes.map((note) => (
          <div key={note.id} className="note-item">
            <NoteItem note={note} onEdit={(newText) => onEditNote(note.id, newText)} />
          </div>
        ))}
      </div>
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
      <form className="note-composer-form" onSubmit={handleSubmit}>
        <button
          type="button"
          className="note-attach-button"
          onClick={handleAttach}
          aria-label="Joindre une image"
        >
          <ImageIcon />
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Note ta remarque..."
          autoFocus
        />
        <button type="submit" disabled={text.trim().length === 0 && !imageDataUrl}>
          Envoyer
        </button>
      </form>
    </div>
  );
}
