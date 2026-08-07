import { useEffect, useState } from "react";
import { fetchCached } from "../apiCache";
import { Game } from "../types";

interface Props {
  game: Game;
}

interface ValorantAbility {
  slot: string;
  displayName: string;
  description: string;
  displayIcon: string | null;
}

interface ValorantAgent {
  uuid: string;
  displayName: string;
  displayIcon: string;
  abilities: ValorantAbility[];
}

interface ValorantMap {
  uuid: string;
  displayName: string;
  displayIcon: string;
  listViewIcon: string;
}

interface ValorantMapsResponse {
  data: ValorantMap[];
}

interface ValorantAgentsResponse {
  data: ValorantAgent[];
}

interface FortniteMapResponse {
  data: { images: { pois: string } };
}

function ValorantMaps() {
  const [maps, setMaps] = useState<ValorantMap[] | null>(null);
  const [agents, setAgents] = useState<ValorantAgent[] | null>(null);
  const [selectedMap, setSelectedMap] = useState<ValorantMap | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<ValorantAgent | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchCached<ValorantMapsResponse>(
        "maps-v1",
        "https://valorant-api.com/v1/maps?language=fr-FR",
      ),
      fetchCached<ValorantAgentsResponse>(
        "agents-v1",
        "https://valorant-api.com/v1/agents?language=fr-FR&isPlayableCharacter=true",
      ),
    ])
      .then(([mapsRes, agentsRes]) => {
        const mapList = mapsRes.data.filter((m) => m.displayName !== "The Range");
        setMaps(mapList);
        setAgents(agentsRes.data);
      })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="maps-error">
        Impossible de charger les donnees (verifie ta connexion).
      </div>
    );
  }

  if (!maps || !agents) {
    return <div className="maps-loading">Chargement...</div>;
  }

  return (
    <div className="maps-view">
      <div className="maps-section">
        <h3 className="maps-section-title">Cartes</h3>
        <div className="maps-grid">
          {maps.map((m) => (
            <button
              key={m.uuid}
              type="button"
              className="maps-card"
              onClick={() => setSelectedMap(m)}
            >
              <img src={m.listViewIcon} alt={m.displayName} loading="lazy" decoding="async" />
              <span>{m.displayName}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="maps-section">
        <h3 className="maps-section-title">Agents</h3>
        <div className="maps-agent-grid">
          {agents.map((a) => (
            <button
              key={a.uuid}
              type="button"
              className="maps-agent-card"
              onClick={() => setSelectedAgent(a)}
            >
              <img src={a.displayIcon} alt={a.displayName} loading="lazy" decoding="async" />
              <span>{a.displayName}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedMap && (
        <div className="maps-overlay" onClick={() => setSelectedMap(null)}>
          <div className="maps-modal" onClick={(e) => e.stopPropagation()}>
            <div className="maps-modal-header">
              <h3>{selectedMap.displayName}</h3>
              <button type="button" onClick={() => setSelectedMap(null)}>
                x
              </button>
            </div>
            <img
              className="maps-modal-image"
              src={selectedMap.displayIcon}
              alt={selectedMap.displayName}
            />
          </div>
        </div>
      )}

      {selectedAgent && (
        <div className="maps-overlay" onClick={() => setSelectedAgent(null)}>
          <div className="maps-modal" onClick={(e) => e.stopPropagation()}>
            <div className="maps-modal-header">
              <h3>{selectedAgent.displayName}</h3>
              <button type="button" onClick={() => setSelectedAgent(null)}>
                x
              </button>
            </div>
            <div className="maps-abilities">
              {selectedAgent.abilities
                .filter((ab) => ab.displayName)
                .map((ab) => (
                  <div key={ab.slot} className="maps-ability">
                    {ab.displayIcon && <img src={ab.displayIcon} alt={ab.displayName} />}
                    <div>
                      <div className="maps-ability-name">{ab.displayName}</div>
                      <p className="maps-ability-desc">{ab.description}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FortniteMap() {
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchCached<FortniteMapResponse>("fortnite-map-v1", "https://fortnite-api.com/v1/map")
      .then((res) => setImage(res.data.images.pois))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="maps-error">
        Impossible de charger la carte (verifie ta connexion).
      </div>
    );
  }

  if (!image) {
    return <div className="maps-loading">Chargement...</div>;
  }

  return (
    <div className="maps-view">
      <div className="maps-fortnite-map">
        <img src={image} alt="Carte Fortnite actuelle" />
      </div>
    </div>
  );
}

export function MapsView({ game }: Props) {
  return game === "valorant" ? <ValorantMaps /> : <FortniteMap />;
}
