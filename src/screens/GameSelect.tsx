import { useState } from "react";
import { Game, GAME_LABELS } from "../types";

interface Props {
  pseudo: string;
  onSubmit: (games: Game[]) => void;
}

const GAMES: Game[] = ["valorant", "fortnite"];

export function GameSelect({ pseudo, onSubmit }: Props) {
  const [selected, setSelected] = useState<Game[]>([]);

  function toggle(game: Game) {
    setSelected((prev) =>
      prev.includes(game) ? prev.filter((g) => g !== game) : [...prev, game],
    );
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card">
        <h1 className="onboarding-title">Salut {pseudo}</h1>
        <p className="onboarding-subtitle">
          Tu joues a quoi ? (tu pourras changer plus tard dans les reglages)
        </p>
        <div className="game-select-grid">
          {GAMES.map((game) => (
            <button
              key={game}
              type="button"
              className={`game-select-card game-select-card--${game} ${
                selected.includes(game) ? "is-selected" : ""
              }`}
              onClick={() => toggle(game)}
            >
              {GAME_LABELS[game]}
            </button>
          ))}
        </div>
        <button
          className="onboarding-button"
          type="button"
          disabled={selected.length === 0}
          onClick={() => onSubmit(selected)}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
