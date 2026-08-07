import { useEffect, useRef, useState, WheelEvent, MouseEvent, DragEvent } from "react";
import { fetchCached } from "../apiCache";
import { useDrawingTool } from "../hooks/useDrawingTool";
import { Game } from "../types";
import { DrawingCanvas, DrawingOverlay, DrawingToolbar } from "./DrawingOverlay";

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
  tacticalDescription: string | null;
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

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.4;

function handleIconDragStart(e: DragEvent<HTMLImageElement>, url: string) {
  e.dataTransfer.setData("application/x-icon-url", url);
  e.dataTransfer.effectAllowed = "copy";
}

function ValorantMaps() {
  const [maps, setMaps] = useState<ValorantMap[] | null>(null);
  const [agents, setAgents] = useState<ValorantAgent[] | null>(null);
  const [selectedMap, setSelectedMap] = useState<ValorantMap | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<ValorantAgent | null>(null);
  const [mapAgentRef, setMapAgentRef] = useState<ValorantAgent | null>(null);
  const [mapSide, setMapSide] = useState<"attack" | "defense">("attack");
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
        const mapList = mapsRes.data.filter((m) => m.tacticalDescription !== null);
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
        <div
          className="maps-overlay"
          onClick={() => {
            setSelectedMap(null);
            setMapAgentRef(null);
          }}
        >
          <div className="maps-modal maps-modal--map" onClick={(e) => e.stopPropagation()}>
            <div className="maps-modal-header">
              <h3>{selectedMap.displayName}</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedMap(null);
                  setMapAgentRef(null);
                }}
              >
                x
              </button>
            </div>
            <div className="maps-modal-image-frame">
              <img
                className="maps-modal-image"
                src={selectedMap.displayIcon}
                alt={selectedMap.displayName}
              />
              <DrawingOverlay mapKey={`valorant-${selectedMap.uuid}`} />

              <div className="maps-side-toggle">
                <button
                  type="button"
                  className={mapSide === "attack" ? "is-active" : ""}
                  onClick={() => setMapSide("attack")}
                >
                  Attaque
                </button>
                <button
                  type="button"
                  className={mapSide === "defense" ? "is-active" : ""}
                  onClick={() => setMapSide("defense")}
                >
                  Defense
                </button>
              </div>
            </div>

            <div className={`maps-agent-ref maps-agent-ref--${mapSide}`}>
              <div className="maps-agent-ref-strip">
                {agents.map((a) => (
                  <button
                    key={a.uuid}
                    type="button"
                    className={`maps-agent-ref-icon ${
                      mapAgentRef?.uuid === a.uuid ? "is-active" : ""
                    }`}
                    onClick={() => setMapAgentRef(mapAgentRef?.uuid === a.uuid ? null : a)}
                    title={a.displayName}
                  >
                    <img
                      src={a.displayIcon}
                      alt={a.displayName}
                      loading="lazy"
                      decoding="async"
                      draggable
                      onDragStart={(e) => handleIconDragStart(e, a.displayIcon)}
                    />
                  </button>
                ))}
              </div>
              {mapAgentRef && (
                <div className="maps-abilities maps-abilities--compact">
                  <p className="maps-agent-ref-hint">
                    Glisse une icone sur la carte pour la placer.
                  </p>
                  {mapAgentRef.abilities
                    .filter((ab) => ab.displayName)
                    .map((ab) => (
                      <div key={ab.slot} className="maps-ability">
                        {ab.displayIcon && (
                          <img
                            src={ab.displayIcon}
                            alt={ab.displayName}
                            draggable
                            onDragStart={(e) => handleIconDragStart(e, ab.displayIcon!)}
                          />
                        )}
                        <div>
                          <div className="maps-ability-name">{ab.displayName}</div>
                          <p className="maps-ability-desc">{ab.description}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
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
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null,
  );
  const dt = useDrawingTool("fortnite");

  useEffect(() => {
    fetchCached<FortniteMapResponse>("fortnite-map-v2", "https://fortnite-api.com/v1/map")
      .then((res) => setImage(res.data.images.pois))
      .catch(() => setError(true));
  }, []);

  function clampZoom(z: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  }

  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const next = clampZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    setZoom(next);
    if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
  }

  function handleMouseDown(e: MouseEvent<HTMLDivElement>) {
    if (zoom === MIN_ZOOM || dt.tool !== "cursor") return;
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    setPan({
      x: dragState.current.panX + (e.clientX - dragState.current.startX),
      y: dragState.current.panY + (e.clientY - dragState.current.startY),
    });
  }

  function endDrag() {
    dragState.current = null;
  }

  function zoomBy(delta: number) {
    const next = clampZoom(zoom + delta);
    setZoom(next);
    if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
  }

  function resetView() {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }

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
    <div
      className="maps-fortnite-viewport"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      style={{ cursor: dt.tool !== "cursor" ? "default" : zoom > MIN_ZOOM ? "grab" : "default" }}
    >
      <div
        className="maps-fortnite-canvas"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        <img src={image} alt="Carte Fortnite" draggable={false} />
        <DrawingCanvas dt={dt} className="drawing-canvas-contain" />
      </div>

      <div className="maps-zoom-floating">
        <button type="button" onClick={() => zoomBy(-ZOOM_STEP)} disabled={zoom <= MIN_ZOOM}>
          -
        </button>
        <span>{Math.round((zoom / MIN_ZOOM) * 100)}%</span>
        <button type="button" onClick={() => zoomBy(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM}>
          +
        </button>
        <button type="button" className="maps-zoom-reset" onClick={resetView}>
          Reinitialiser la vue
        </button>
      </div>

      <DrawingToolbar dt={dt} />
    </div>
  );
}

export function MapsView({ game }: Props) {
  return game === "valorant" ? <ValorantMaps /> : <FortniteMap />;
}
