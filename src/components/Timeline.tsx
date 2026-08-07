import { DragEvent } from "react";
import { useAppData } from "../context/AppDataContext";
import { Game, Segment } from "../types";

interface Props {
  game: Game;
  segments: Segment[];
  selectedSegmentId: string | null;
  onDropMode: (modeId: string) => void;
  onSelectSegment: (segmentId: string) => void;
}

export function Timeline({
  game,
  segments,
  selectedSegmentId,
  onDropMode,
  onSelectSegment,
}: Props) {
  const { settings } = useAppData();
  const modes = settings.customModes[game];
  const modeDef = (modeId: string) => modes.find((m) => m.id === modeId);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const modeId = e.dataTransfer.getData("text/plain");
    if (modeId) onDropMode(modeId);
  }

  return (
    <div className="timeline-wrap">
      <div
        className="timeline"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {segments.length === 0 && (
          <div className="timeline-empty">
            Depose ici un mode pour demarrer un segment
          </div>
        )}
        {segments.map((segment) => (
          <button
            key={segment.id}
            type="button"
            className={`timeline-segment ${
              selectedSegmentId === segment.id ? "is-selected" : ""
            }`}
            style={{ backgroundColor: modeDef(segment.modeId)?.color ?? "#666" }}
            onClick={() => onSelectSegment(segment.id)}
          >
            <span className="timeline-segment-mode">
              {modeDef(segment.modeId)?.label ?? segment.modeId}
            </span>
            {segment.notes.length > 0 && (
              <span className="timeline-segment-badge">
                {segment.notes.length}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
