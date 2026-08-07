import { DragEvent } from "react";
import { useAppData } from "../context/AppDataContext";
import { Game } from "../types";

interface Props {
  game: Game;
  onPick: (modeId: string) => void;
}

export function ModePalette({ game, onPick }: Props) {
  const { settings } = useAppData();
  const modes = settings.customModes[game];

  function handleDragStart(e: DragEvent<HTMLButtonElement>, modeId: string) {
    e.dataTransfer.setData("text/plain", modeId);
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <div className="mode-palette">
      <p className="mode-palette-label">Glisse un mode sur la timeline</p>
      <div className="mode-palette-chips">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            className="mode-chip"
            draggable
            onDragStart={(e) => handleDragStart(e, m.id)}
            onClick={() => onPick(m.id)}
          >
            <span className="mode-chip-dot" style={{ backgroundColor: m.color }} />
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
