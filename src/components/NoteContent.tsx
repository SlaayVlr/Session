import { openUrl } from "@tauri-apps/plugin-opener";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function linkify(text: string) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    // split() with a capturing regex puts the matched URLs at odd indices
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        className="note-link"
        onClick={(e) => {
          e.preventDefault();
          openUrl(part).catch(() => {});
        }}
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function NoteContent({
  text,
  imageDataUrl,
}: {
  text: string;
  imageDataUrl?: string;
}) {
  return (
    <>
      {text && <p className="note-text">{linkify(text)}</p>}
      {imageDataUrl && (
        <img className="note-image" src={imageDataUrl} alt="Piece jointe" />
      )}
    </>
  );
}
