import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { fetchCached } from "../apiCache";
import { formatDate } from "../format";

interface ValorantMatchStat {
  matchId: string;
  mapId: string;
  queueId: string;
  startedAt: number;
  agentId: string;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  won: boolean;
  roundsWon: number;
  roundsLost: number;
}

interface ValorantRank {
  tier: number;
  rankedRating: number;
  wins: number;
}

interface ValorantProfile {
  puuid: string;
  region: string;
  rank: ValorantRank | null;
  matches: ValorantMatchStat[];
}

interface MapInfo {
  mapUrl: string;
  displayName: string;
  listViewIcon: string;
}

interface AgentInfo {
  uuid: string;
  displayName: string;
  displayIcon: string;
}

interface TierInfo {
  tier: number;
  tierName: string;
  smallIcon: string | null;
}

interface TierTable {
  data: { tiers: TierInfo[] }[];
}

interface ScoreboardPlayer {
  puuid: string;
  displayName: string;
  agentId: string;
  teamId: string;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  isMe: boolean;
}

interface TeamResult {
  teamId: string;
  won: boolean;
  roundsWon: number;
  roundsPlayed: number;
}

interface MatchDetail {
  matchId: string;
  mapId: string;
  queueId: string;
  startedAt: number;
  teams: TeamResult[];
  players: ScoreboardPlayer[];
}

interface AgentPlayCount {
  agentId: string;
  games: number;
  hours: number;
}

interface ActOverview {
  seasonId: string;
  currentTier: number;
  currentRr: number;
  peakTier: number;
  peakRr: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kdRatio: number;
  kadRatio: number;
  acs: number;
  damagePerRound: number;
  headshotPct: number;
  kastPct: number;
  firstBloods: number;
  aces: number;
  flawlessRounds: number;
  topAgentsAct: AgentPlayCount[];
  topAgentsRecent: AgentPlayCount[];
  recentGamesAnalyzed: number;
}

const QUEUE_LABELS: Record<string, string> = {
  competitive: "Competitive",
  unrated: "Non classee",
  swiftplay: "Rapide",
  deathmatch: "Deathmatch",
  spikerush: "Spike Rush",
  hurm: "Team Deathmatch",
  ggteam: "Escalation",
  onefa: "Replication",
};

type Status = "idle" | "loading" | "error" | "ready";

export function RiotStats() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ValorantProfile | null>(null);
  const [overview, setOverview] = useState<ActOverview | null>(null);
  const [overviewError, setOverviewError] = useState("");
  const [maps, setMaps] = useState<MapInfo[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [detailMatchId, setDetailMatchId] = useState<string | null>(null);
  const [detailStatus, setDetailStatus] = useState<"loading" | "ready" | "error">("loading");
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState<MatchDetail | null>(null);

  async function openMatch(matchId: string) {
    setDetailMatchId(matchId);
    setDetailStatus("loading");
    setDetail(null);
    try {
      const result = await invoke<MatchDetail>("get_valorant_match_detail", { matchId });
      setDetail(result);
      setDetailStatus("ready");
    } catch (e) {
      setDetailError(typeof e === "string" ? e : "Impossible de recuperer le scoreboard.");
      setDetailStatus("error");
    }
  }

  function closeMatch() {
    setDetailMatchId(null);
    setDetail(null);
  }

  async function load() {
    setStatus("loading");
    setError("");
    setOverviewError("");
    setOverview(null);
    try {
      const [result, mapsRes, agentsRes, tiersRes] = await Promise.all([
        invoke<ValorantProfile>("get_valorant_profile"),
        fetchCached<{ data: MapInfo[] }>(
          "maps-v1",
          "https://valorant-api.com/v1/maps?language=fr-FR",
        ),
        fetchCached<{ data: AgentInfo[] }>(
          "agents-v1",
          "https://valorant-api.com/v1/agents?language=fr-FR&isPlayableCharacter=true",
        ),
        fetchCached<TierTable>("tiers-v1", "https://valorant-api.com/v1/competitivetiers"),
      ]);
      setProfile(result);
      setMaps(mapsRes.data);
      setAgents(agentsRes.data);
      setTiers(tiersRes.data[tiersRes.data.length - 1]?.tiers ?? []);
      setStatus("ready");
    } catch (e) {
      setError(typeof e === "string" ? e : "Impossible de recuperer tes stats.");
      setStatus("error");
      return;
    }

    try {
      const overviewResult = await invoke<ActOverview>("get_valorant_act_overview");
      setOverview(overviewResult);
    } catch (e) {
      setOverviewError(
        typeof e === "string" ? e : "Impossible de calculer les stats d'acte.",
      );
    }
  }

  const mapName = (mapId: string) =>
    maps.find((m) => m.mapUrl === mapId)?.displayName ?? "Carte inconnue";
  const mapIcon = (mapId: string) => maps.find((m) => m.mapUrl === mapId)?.listViewIcon;
  const agentInfo = (id: string) => agents.find((a) => a.uuid === id);
  const tierInfo = (tier: number) => tiers.find((t) => t.tier === tier);

  return (
    <div className="riot-stats">
      <div className="riot-stats-header">
        <h3 className="maps-section-title">Compte Riot</h3>
        <button
          type="button"
          className="settings-browse-button"
          onClick={load}
          disabled={status === "loading"}
        >
          {status === "loading"
            ? "Chargement..."
            : status === "ready"
              ? "Actualiser"
              : "Charger mes stats en direct"}
        </button>
      </div>

      {status === "idle" && (
        <p className="riot-stats-hint">
          Le Riot Client doit etre lance et connecte sur ce PC.
        </p>
      )}

      {status === "error" && (
        <p className="riot-stats-error">
          {error || "Echec de la recuperation. Le client Riot doit etre ouvert et connecte."}
        </p>
      )}

      {status === "ready" && overviewError && (
        <p className="riot-stats-error">{overviewError}</p>
      )}

      {status === "ready" && overview && (
        <div className="riot-overview">
          <div className="riot-overview-ranks">
            <div className="riot-rank-card">
              {tierInfo(overview.currentTier)?.smallIcon && (
                <img src={tierInfo(overview.currentTier)!.smallIcon!} alt="" />
              )}
              <div>
                <div className="riot-rank-label">Rang actuel</div>
                <div className="riot-rank-name">
                  {tierInfo(overview.currentTier)?.tierName ?? `Rang ${overview.currentTier}`}
                </div>
                <div className="riot-rank-rr">{overview.currentRr} RR</div>
              </div>
            </div>
            <div className="riot-rank-card">
              {tierInfo(overview.peakTier)?.smallIcon && (
                <img src={tierInfo(overview.peakTier)!.smallIcon!} alt="" />
              )}
              <div>
                <div className="riot-rank-label">Rang peak (cet acte)</div>
                <div className="riot-rank-name">
                  {tierInfo(overview.peakTier)?.tierName ?? `Rang ${overview.peakTier}`}
                </div>
                <div className="riot-rank-rr">{overview.peakRr} RR</div>
              </div>
            </div>
          </div>

          <p className="riot-overview-sub">
            {overview.gamesPlayed} partie{overview.gamesPlayed > 1 ? "s" : ""} competitive
            {overview.gamesPlayed > 1 ? "s" : ""} cet acte - {overview.wins}V / {overview.losses}D
          </p>

          <div className="stats-cards riot-overview-tiles">
            <div className="stats-card">
              <span className="stats-card-value">{Math.round(overview.damagePerRound)}</span>
              <span className="stats-card-label">Degats / round</span>
            </div>
            <div className="stats-card">
              <span className="stats-card-value">{overview.kdRatio.toFixed(2)}</span>
              <span className="stats-card-label">Ratio K/D</span>
            </div>
            <div className="stats-card">
              <span className="stats-card-value">{Math.round(overview.headshotPct)}%</span>
              <span className="stats-card-label">Tirs a la tete</span>
            </div>
            <div className="stats-card">
              <span className="stats-card-value">{Math.round(overview.winRate)}%</span>
              <span className="stats-card-label">Victoires</span>
            </div>
          </div>

          <div className="riot-overview-grid">
            <div>
              <span className="riot-overview-grid-value">{overview.wins}</span>
              <span className="riot-overview-grid-label">Victoires</span>
            </div>
            <div>
              <span className="riot-overview-grid-value">{Math.round(overview.kastPct)}%</span>
              <span className="riot-overview-grid-label">KAST</span>
            </div>
            <div>
              <span className="riot-overview-grid-value">{overview.kills}</span>
              <span className="riot-overview-grid-label">Kills</span>
            </div>
            <div>
              <span className="riot-overview-grid-value">{overview.deaths}</span>
              <span className="riot-overview-grid-label">Morts</span>
            </div>
            <div>
              <span className="riot-overview-grid-value">{overview.assists}</span>
              <span className="riot-overview-grid-label">Assists</span>
            </div>
            <div>
              <span className="riot-overview-grid-value">{Math.round(overview.acs)}</span>
              <span className="riot-overview-grid-label">ACS</span>
            </div>
            <div>
              <span className="riot-overview-grid-value">{overview.kadRatio.toFixed(2)}</span>
              <span className="riot-overview-grid-label">Ratio KAD</span>
            </div>
            <div>
              <span className="riot-overview-grid-value">{overview.firstBloods}</span>
              <span className="riot-overview-grid-label">First bloods</span>
            </div>
            <div>
              <span className="riot-overview-grid-value">{overview.flawlessRounds}</span>
              <span className="riot-overview-grid-label">Rounds flawless</span>
            </div>
            <div>
              <span className="riot-overview-grid-value">{overview.aces}</span>
              <span className="riot-overview-grid-label">Aces</span>
            </div>
          </div>

          {overview.topAgentsAct.length > 0 && (
            <div className="riot-overview-agents">
              <span className="riot-overview-agents-label">Agents joues cet acte</span>
              <div className="riot-overview-agents-row">
                {overview.topAgentsAct.map((a) => {
                  const agent = agentInfo(a.agentId);
                  return (
                    <div key={a.agentId} className="riot-overview-agent">
                      {agent?.displayIcon && <img src={agent.displayIcon} alt={agent.displayName} />}
                      <span>
                        {a.games} partie{a.games > 1 ? "s" : ""} - {a.hours.toFixed(1)}h
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {overview.topAgentsRecent.length > 0 && (
            <div className="riot-overview-agents">
              <span className="riot-overview-agents-label">
                Agents joues sur tes {overview.recentGamesAnalyzed} dernieres parties
              </span>
              <div className="riot-overview-agents-row">
                {overview.topAgentsRecent.map((a) => {
                  const agent = agentInfo(a.agentId);
                  return (
                    <div key={a.agentId} className="riot-overview-agent">
                      {agent?.displayIcon && <img src={agent.displayIcon} alt={agent.displayName} />}
                      <span>
                        {a.games} partie{a.games > 1 ? "s" : ""} - {a.hours.toFixed(1)}h
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {status === "ready" && profile && (
        <>
          <span className="riot-overview-agents-label">Dernieres parties</span>
          <div className="riot-match-list">
            {profile.matches.length === 0 && (
              <p className="journal-empty">Aucune partie recente trouvee.</p>
            )}
            {profile.matches.map((m) => {
              const agent = agentInfo(m.agentId);
              const icon = mapIcon(m.mapId);
              return (
                <button
                  type="button"
                  key={m.matchId}
                  className={`riot-match-row ${
                    m.won ? "riot-match-row--win" : "riot-match-row--loss"
                  }`}
                  onClick={() => openMatch(m.matchId)}
                >
                  {icon && <img className="riot-match-map" src={icon} alt="" />}
                  {agent?.displayIcon && (
                    <img
                      className="riot-match-agent"
                      src={agent.displayIcon}
                      alt={agent.displayName}
                    />
                  )}
                  <div className="riot-match-info">
                    <span className="riot-match-map-name">{mapName(m.mapId)}</span>
                    <span className="riot-match-queue">
                      {QUEUE_LABELS[m.queueId] ?? m.queueId}
                    </span>
                  </div>
                  <div className="riot-match-score">
                    {m.roundsWon}-{m.roundsLost}
                  </div>
                  <div className="riot-match-kda">
                    {m.kills}/{m.deaths}/{m.assists}
                  </div>
                  <span className="riot-match-date">{formatDate(m.startedAt)}</span>
                  <span className="riot-match-result">{m.won ? "Victoire" : "Defaite"}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {detailMatchId && (
        <div className="maps-overlay" onClick={closeMatch}>
          <div className="maps-modal riot-scoreboard-modal" onClick={(e) => e.stopPropagation()}>
            <div className="maps-modal-header">
              <h3>
                {detail
                  ? `${mapName(detail.mapId)} - ${QUEUE_LABELS[detail.queueId] ?? detail.queueId}`
                  : "Scoreboard"}
              </h3>
              <button type="button" onClick={closeMatch} aria-label="Fermer">
                x
              </button>
            </div>

            {detailStatus === "loading" && (
              <p className="riot-stats-hint">Chargement du scoreboard...</p>
            )}
            {detailStatus === "error" && (
              <p className="riot-stats-error">
                {detailError || "Echec de la recuperation du scoreboard."}
              </p>
            )}
            {detailStatus === "ready" && detail && (
              <div className="riot-scoreboard">
                {detail.teams.map((team) => {
                  const teamPlayers = detail.players
                    .filter((p) => p.teamId === team.teamId)
                    .sort((a, b) => b.score - a.score);
                  return (
                    <div key={team.teamId} className="riot-scoreboard-team">
                      <div
                        className={`riot-scoreboard-team-header ${
                          team.won ? "riot-scoreboard-team-header--win" : ""
                        }`}
                      >
                        <span>{team.won ? "Victoire" : "Defaite"}</span>
                        <span>
                          {team.roundsWon}/{team.roundsPlayed}
                        </span>
                      </div>
                      {teamPlayers.map((p) => {
                        const agent = agentInfo(p.agentId);
                        const acs =
                          team.roundsPlayed > 0
                            ? Math.round(p.score / team.roundsPlayed)
                            : p.score;
                        return (
                          <div
                            key={p.puuid}
                            className={`riot-scoreboard-row ${
                              p.isMe ? "riot-scoreboard-row--me" : ""
                            }`}
                          >
                            {agent?.displayIcon && (
                              <img
                                className="riot-scoreboard-agent"
                                src={agent.displayIcon}
                                alt={agent.displayName}
                              />
                            )}
                            <span className="riot-scoreboard-name">
                              {p.displayName || agent?.displayName || "Joueur inconnu"}
                            </span>
                            <span className="riot-scoreboard-kda">
                              {p.kills}/{p.deaths}/{p.assists}
                            </span>
                            <span className="riot-scoreboard-acs">{acs} ACS</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
