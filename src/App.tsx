import "./App.css";
import { AppDataProvider, useAppData } from "./context/AppDataContext";
import { Welcome } from "./screens/Welcome";
import { GameSelect } from "./screens/GameSelect";
import { AppShell } from "./components/AppShell";
import { Game } from "./types";

function Root() {
  const { ready, profile, setProfile } = useAppData();

  if (!ready) {
    return <div className="loading-screen">Chargement...</div>;
  }

  if (!profile || profile.pseudo.trim().length === 0) {
    return (
      <Welcome
        onSubmit={(pseudo) => setProfile({ pseudo, activeGames: [] })}
      />
    );
  }

  if (profile.activeGames.length === 0) {
    return (
      <GameSelect
        pseudo={profile.pseudo}
        onSubmit={(games: Game[]) =>
          setProfile({ ...profile, activeGames: games })
        }
      />
    );
  }

  return <AppShell />;
}

function App() {
  return (
    <AppDataProvider>
      <Root />
    </AppDataProvider>
  );
}

export default App;
