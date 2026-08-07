import { FormEvent, useState } from "react";

interface Props {
  onSubmit: (pseudo: string) => void;
}

export function Welcome({ onSubmit }: Props) {
  const [pseudo, setPseudo] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = pseudo.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
  }

  return (
    <div className="onboarding-screen">
      <form className="onboarding-card" onSubmit={handleSubmit}>
        <h1 className="onboarding-title">Comment tu t'appelles ?</h1>
        <p className="onboarding-subtitle">
          Ca sert juste a personnaliser l'app.
        </p>
        <input
          className="onboarding-input"
          type="text"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="Ton pseudo"
          autoFocus
          maxLength={24}
        />
        <button
          className="onboarding-button"
          type="submit"
          disabled={pseudo.trim().length === 0}
        >
          Continuer
        </button>
      </form>
    </div>
  );
}
