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

      {status === "ready" && profile && (
        <>
          {profile.rank && (
            <div className="riot-rank-card">
              {tierInfo(profile.rank.tier)?.smallIcon && (
                <img src={tierInfo(profile.rank.tier)!.smallIcon!} alt="" />
              )}
              <div>
                <div className="riot-rank-name">
                  {tierInfo(profile.rank.tier)?.tierName ?? `Rang ${profile.rank.tier}`}
                </div>
                <div className="riot-rank-rr">{profile.rank.rankedRating} RR</div>
              </div>
            </div>
          )}

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
