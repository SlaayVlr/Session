use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::header::{HeaderMap, HeaderValue};
use reqwest::Client;
use serde::Serialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::time::Duration;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ValorantMatch {
    pub match_id: String,
    pub map_id: String,
    pub queue_id: String,
    pub started_at: i64,
    pub agent_id: String,
    pub kills: i32,
    pub deaths: i32,
    pub assists: i32,
    pub score: i32,
    pub won: bool,
    pub rounds_won: i32,
    pub rounds_lost: i32,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ValorantRank {
    pub tier: i32,
    pub ranked_rating: i32,
    pub wins: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValorantProfile {
    pub puuid: String,
    pub region: String,
    pub rank: Option<ValorantRank>,
    pub matches: Vec<ValorantMatch>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ValorantScoreboardPlayer {
    pub puuid: String,
    pub display_name: String,
    pub agent_id: String,
    pub team_id: String,
    pub kills: i32,
    pub deaths: i32,
    pub assists: i32,
    pub score: i32,
    pub is_me: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ValorantTeamResult {
    pub team_id: String,
    pub won: bool,
    pub rounds_won: i32,
    pub rounds_played: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValorantMatchDetail {
    pub match_id: String,
    pub map_id: String,
    pub queue_id: String,
    pub started_at: i64,
    pub teams: Vec<ValorantTeamResult>,
    pub players: Vec<ValorantScoreboardPlayer>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentPlayCount {
    pub agent_id: String,
    pub games: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValorantActOverview {
    pub season_id: String,
    pub current_tier: i32,
    pub current_rr: i32,
    pub peak_tier: i32,
    pub peak_rr: i32,
    pub games_played: i32,
    pub wins: i32,
    pub losses: i32,
    pub win_rate: f32,
    pub kills: i32,
    pub deaths: i32,
    pub assists: i32,
    pub kd_ratio: f32,
    pub kad_ratio: f32,
    pub acs: f32,
    pub damage_per_round: f32,
    pub headshot_pct: f32,
    pub kast_pct: f32,
    pub first_bloods: i32,
    pub aces: i32,
    pub flawless_rounds: i32,
    pub top_agents_act: Vec<AgentPlayCount>,
    pub top_agents_recent: Vec<AgentPlayCount>,
    pub recent_games_analyzed: i32,
}

struct MatchAnalysis {
    won: bool,
    agent_id: String,
    kills: i32,
    deaths: i32,
    assists: i32,
    score: i32,
    rounds_played: i32,
    damage: i64,
    headshots: i64,
    bodyshots: i64,
    legshots: i64,
    first_bloods: i32,
    aces: i32,
    flawless_rounds: i32,
    kast_rounds: i32,
}

fn client_platform_header() -> String {
    let json = r#"{"platformType":"PC","platformOS":"Windows","platformOSVersion":"10.0.19042.1.256.64bit","platformChipset":"Unknown"}"#;
    STANDARD.encode(json)
}

#[cfg(target_os = "windows")]
fn read_lockfile() -> Result<(String, String), String> {
    let local_app_data = std::env::var("LOCALAPPDATA")
        .map_err(|_| "Variable LOCALAPPDATA introuvable".to_string())?;
    let path = format!("{local_app_data}\\Riot Games\\Riot Client\\Config\\lockfile");
    let contents = std::fs::read_to_string(&path)
        .map_err(|_| "Riot Client non lance (lockfile introuvable)".to_string())?;
    let parts: Vec<&str> = contents.trim().split(':').collect();
    if parts.len() < 5 {
        return Err("Format du lockfile inattendu".to_string());
    }
    Ok((parts[2].to_string(), parts[3].to_string()))
}

#[cfg(not(target_os = "windows"))]
fn read_lockfile() -> Result<(String, String), String> {
    Err("Disponible uniquement sur Windows".to_string())
}

fn local_client() -> Result<Client, String> {
    Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(Duration::from_secs(8))
        .build()
        .map_err(|e| format!("Client HTTP local indisponible: {e}"))
}

async fn fetch_entitlement(port: &str, password: &str) -> Result<(String, String, String), String> {
    let client = local_client()?;
    let auth = STANDARD.encode(format!("riot:{password}"));
    let resp = client
        .get(format!("https://127.0.0.1:{port}/entitlements/v1/token"))
        .header("Authorization", format!("Basic {auth}"))
        .send()
        .await
        .map_err(|e| format!("Connexion au Riot Client impossible: {e}"))?;
    let json: Value = resp
        .json()
        .await
        .map_err(|e| format!("Reponse entitlement invalide: {e}"))?;
    let access_token = json["accessToken"].as_str().unwrap_or_default().to_string();
    let entitlement_token = json["token"].as_str().unwrap_or_default().to_string();
    let puuid = json["subject"].as_str().unwrap_or_default().to_string();
    if access_token.is_empty() || puuid.is_empty() {
        return Err("Session Riot introuvable (es-tu connecte dans le Riot Client ?)".to_string());
    }
    Ok((access_token, entitlement_token, puuid))
}

async fn fetch_region(port: &str, password: &str) -> Result<String, String> {
    let client = local_client()?;
    let auth = STANDARD.encode(format!("riot:{password}"));
    let resp = client
        .get(format!("https://127.0.0.1:{port}/riotclient/region-locale"))
        .header("Authorization", format!("Basic {auth}"))
        .send()
        .await
        .map_err(|e| format!("Impossible de recuperer la region: {e}"))?;
    let json: Value = resp
        .json()
        .await
        .map_err(|e| format!("Reponse region invalide: {e}"))?;
    json["region"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Region introuvable".to_string())
}

async fn fetch_client_version() -> Result<String, String> {
    let client = Client::new();
    let resp = client
        .get("https://valorant-api.com/v1/version")
        .send()
        .await
        .map_err(|e| format!("Impossible de recuperer la version du jeu: {e}"))?;
    let json: Value = resp
        .json()
        .await
        .map_err(|e| format!("Reponse version invalide: {e}"))?;
    json["data"]["riotClientVersion"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Version du client introuvable".to_string())
}

fn header_value(value: &str) -> HeaderValue {
    HeaderValue::from_str(value).unwrap_or_else(|_| HeaderValue::from_static(""))
}

fn pd_headers(access_token: &str, entitlement_token: &str, client_version: &str) -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert("Authorization", header_value(&format!("Bearer {access_token}")));
    headers.insert("X-Riot-Entitlements-JWT", header_value(entitlement_token));
    headers.insert("X-Riot-ClientVersion", header_value(client_version));
    headers.insert("X-Riot-ClientPlatform", header_value(&client_platform_header()));
    headers
}

async fn fetch_match_ids(region: &str, puuid: &str, headers: &HeaderMap) -> Result<Vec<String>, String> {
    let client = Client::new();
    let url = format!(
        "https://pd.{region}.a.pvp.net/match-history/v1/history/{puuid}?startIndex=0&endIndex=5"
    );
    let resp = client
        .get(url)
        .headers(headers.clone())
        .send()
        .await
        .map_err(|e| format!("Historique de parties inaccessible: {e}"))?;
    let json: Value = resp
        .json()
        .await
        .map_err(|e| format!("Reponse historique invalide: {e}"))?;
    let history = json["History"].as_array().cloned().unwrap_or_default();
    Ok(history
        .iter()
        .filter_map(|m| m["MatchID"].as_str().map(|s| s.to_string()))
        .collect())
}

async fn fetch_match_detail(
    region: &str,
    match_id: &str,
    puuid: &str,
    headers: &HeaderMap,
) -> Result<Option<ValorantMatch>, String> {
    let client = Client::new();
    let url = format!("https://pd.{region}.a.pvp.net/match-details/v1/matches/{match_id}");
    let resp = client
        .get(url)
        .headers(headers.clone())
        .send()
        .await
        .map_err(|e| format!("Details de partie inaccessibles: {e}"))?;
    let json: Value = resp
        .json()
        .await
        .map_err(|e| format!("Reponse details de partie invalide: {e}"))?;

    let players = json["players"].as_array().cloned().unwrap_or_default();
    let me = match players.iter().find(|p| p["subject"].as_str() == Some(puuid)) {
        Some(p) => p.clone(),
        None => return Ok(None),
    };
    let team_id = me["teamId"].as_str().unwrap_or_default().to_string();
    let teams = json["teams"].as_array().cloned().unwrap_or_default();
    let my_team = teams.iter().find(|t| t["teamId"].as_str() == Some(team_id.as_str()));
    let won = my_team
        .map(|t| t["won"].as_bool().unwrap_or(false))
        .unwrap_or(false);
    let rounds_won = my_team.and_then(|t| t["roundsWon"].as_i64()).unwrap_or(0) as i32;
    let rounds_played_total = teams
        .iter()
        .filter_map(|t| t["roundsPlayed"].as_i64())
        .max()
        .unwrap_or(0) as i32;
    let rounds_lost = (rounds_played_total - rounds_won).max(0);

    let stats = &me["stats"];
    Ok(Some(ValorantMatch {
        match_id: match_id.to_string(),
        map_id: json["matchInfo"]["mapId"].as_str().unwrap_or_default().to_string(),
        queue_id: json["matchInfo"]["queueID"].as_str().unwrap_or_default().to_string(),
        started_at: json["matchInfo"]["gameStartMillis"].as_i64().unwrap_or(0),
        agent_id: me["characterId"].as_str().unwrap_or_default().to_string(),
        kills: stats["kills"].as_i64().unwrap_or(0) as i32,
        deaths: stats["deaths"].as_i64().unwrap_or(0) as i32,
        assists: stats["assists"].as_i64().unwrap_or(0) as i32,
        score: stats["score"].as_i64().unwrap_or(0) as i32,
        won,
        rounds_won,
        rounds_lost,
    }))
}

async fn fetch_player_names(
    region: &str,
    puuids: &[String],
    headers: &HeaderMap,
) -> HashMap<String, String> {
    let client = Client::new();
    let url = format!("https://pd.{region}.a.pvp.net/name-service/v3/players");
    let mut map = HashMap::new();
    let Ok(resp) = client.put(url).headers(headers.clone()).json(puuids).send().await else {
        return map;
    };
    let Ok(json) = resp.json::<Value>().await else {
        return map;
    };
    if let Some(arr) = json.as_array() {
        for entry in arr {
            let subject = entry["Subject"].as_str().unwrap_or_default().to_string();
            if subject.is_empty() {
                continue;
            }
            let game_name = entry["GameName"].as_str().unwrap_or_default();
            let tag_line = entry["TagLine"].as_str().unwrap_or_default();
            map.insert(subject, format!("{game_name}#{tag_line}"));
        }
    }
    map
}

async fn fetch_rank(region: &str, puuid: &str, headers: &HeaderMap) -> Option<ValorantRank> {
    let client = Client::new();
    let url = format!("https://pd.{region}.a.pvp.net/mmr/v1/players/{puuid}");
    let resp = client.get(url).headers(headers.clone()).send().await.ok()?;
    let json: Value = resp.json().await.ok()?;
    let update = &json["LatestCompetitiveUpdate"];
    let tier = update["TierAfterUpdate"].as_i64()?;
    let rr = update["RankedRatingAfterUpdate"].as_i64().unwrap_or(0);
    let wins = json["QueueSkills"]["competitive"]["TotalWinsForSeason"]
        .as_i64()
        .unwrap_or(0);
    Some(ValorantRank {
        tier: tier as i32,
        ranked_rating: rr as i32,
        wins: wins as i32,
    })
}

async fn fetch_raw_match(region: &str, match_id: &str, headers: &HeaderMap) -> Option<Value> {
    let client = Client::new();
    let url = format!("https://pd.{region}.a.pvp.net/match-details/v1/matches/{match_id}");
    let resp = client.get(url).headers(headers.clone()).send().await.ok()?;
    resp.json::<Value>().await.ok()
}

fn kill_time(kill: &Value) -> i64 {
    kill["timeSinceRoundStartMillis"].as_i64().unwrap_or(0)
}

fn analyze_match(json: &Value, puuid: &str) -> Option<MatchAnalysis> {
    let players = json["players"].as_array()?;
    let me = players.iter().find(|p| p["subject"].as_str() == Some(puuid))?;
    let my_team = me["teamId"].as_str().unwrap_or_default().to_string();
    let agent_id = me["characterId"].as_str().unwrap_or_default().to_string();
    let stats = &me["stats"];
    let kills = stats["kills"].as_i64().unwrap_or(0) as i32;
    let deaths = stats["deaths"].as_i64().unwrap_or(0) as i32;
    let assists = stats["assists"].as_i64().unwrap_or(0) as i32;
    let score = stats["score"].as_i64().unwrap_or(0) as i32;

    let teams = json["teams"].as_array().cloned().unwrap_or_default();
    let won = teams
        .iter()
        .find(|t| t["teamId"].as_str() == Some(my_team.as_str()))
        .map(|t| t["won"].as_bool().unwrap_or(false))
        .unwrap_or(false);

    let rounds = json["roundResults"].as_array().cloned().unwrap_or_default();
    let rounds_played = rounds.len() as i32;

    let mut damage = 0i64;
    let mut headshots = 0i64;
    let mut bodyshots = 0i64;
    let mut legshots = 0i64;
    let mut first_bloods = 0;
    let mut aces = 0;
    let mut flawless_rounds = 0;
    let mut kast_rounds = 0;

    for round in &rounds {
        let round_ceremony = round["roundCeremony"].as_str().unwrap_or_default();
        let winning_team = round["winningTeam"].as_str().unwrap_or_default();
        let player_stats = round["playerStats"].as_array().cloned().unwrap_or_default();
        let me_round = player_stats.iter().find(|p| p["subject"].as_str() == Some(puuid));

        let mut my_kills_this_round = 0;
        let mut earliest: Option<(i64, bool)> = None;
        let mut i_died = false;
        let mut my_killer = String::new();
        let mut my_death_time = 0i64;

        for ps in &player_stats {
            for k in ps["kills"].as_array().cloned().unwrap_or_default() {
                let t = kill_time(&k);
                let killer = k["killer"].as_str().unwrap_or_default();
                let victim = k["victim"].as_str().unwrap_or_default();
                let is_mine = killer == puuid;
                match earliest {
                    None => earliest = Some((t, is_mine)),
                    Some((best_t, _)) if t < best_t => earliest = Some((t, is_mine)),
                    _ => {}
                }
                if is_mine {
                    my_kills_this_round += 1;
                }
                if victim == puuid {
                    i_died = true;
                    my_killer = killer.to_string();
                    my_death_time = t;
                }
            }
        }

        if matches!(earliest, Some((_, true))) {
            first_bloods += 1;
        }
        if my_kills_this_round >= 5 {
            aces += 1;
        }
        if round_ceremony == "CeremonyFlawless" && winning_team == my_team {
            flawless_rounds += 1;
        }

        if let Some(me_round) = me_round {
            for d in me_round["damage"].as_array().cloned().unwrap_or_default() {
                damage += d["damage"].as_i64().unwrap_or(0);
                headshots += d["headshots"].as_i64().unwrap_or(0);
                bodyshots += d["bodyshots"].as_i64().unwrap_or(0);
                legshots += d["legshots"].as_i64().unwrap_or(0);
            }
        }

        let survived = !i_died;
        let mut assisted = false;
        let mut traded = false;
        if my_kills_this_round == 0 && !survived {
            for ps in &player_stats {
                for k in ps["kills"].as_array().cloned().unwrap_or_default() {
                    let victim = k["victim"].as_str().unwrap_or_default();
                    let has_my_damage = player_stats
                        .iter()
                        .find(|p| p["subject"].as_str() == Some(puuid))
                        .map(|p| {
                            p["damage"].as_array().cloned().unwrap_or_default().iter().any(|d| {
                                d["receiver"].as_str() == Some(victim) && d["damage"].as_i64().unwrap_or(0) > 0
                            })
                        })
                        .unwrap_or(false);
                    if k["killer"].as_str() != Some(puuid) && has_my_damage {
                        assisted = true;
                    }
                }
            }
        }
        if i_died && !my_killer.is_empty() {
            for ps in &player_stats {
                for k in ps["kills"].as_array().cloned().unwrap_or_default() {
                    let victim = k["victim"].as_str().unwrap_or_default();
                    let t = kill_time(&k);
                    if victim == my_killer && t >= my_death_time && t - my_death_time <= 3000 {
                        traded = true;
                    }
                }
            }
        }

        if my_kills_this_round > 0 || assisted || survived || traded {
            kast_rounds += 1;
        }
    }

    Some(MatchAnalysis {
        won,
        agent_id,
        kills,
        deaths,
        assists,
        score,
        rounds_played,
        damage,
        headshots,
        bodyshots,
        legshots,
        first_bloods,
        aces,
        flawless_rounds,
        kast_rounds,
    })
}

#[tauri::command]
pub async fn get_valorant_act_overview() -> Result<ValorantActOverview, String> {
    let (port, password) = read_lockfile()?;
    let (access_token, entitlement_token, puuid) = fetch_entitlement(&port, &password).await?;
    let region = fetch_region(&port, &password).await?;
    let client_version = fetch_client_version().await?;
    let headers = pd_headers(&access_token, &entitlement_token, &client_version);
    let client = Client::new();

    let cu_url = format!(
        "https://pd.{region}.a.pvp.net/mmr/v1/players/{puuid}/competitiveupdates?startIndex=0&endIndex=30&queueId=competitive"
    );
    let cu_resp = client
        .get(cu_url)
        .headers(headers.clone())
        .send()
        .await
        .map_err(|e| format!("Historique de rang inaccessible: {e}"))?;
    let cu_json: Value = cu_resp
        .json()
        .await
        .map_err(|e| format!("Reponse rang invalide: {e}"))?;
    let cu_matches = cu_json["Matches"].as_array().cloned().unwrap_or_default();

    if cu_matches.is_empty() {
        return Err("Aucune partie competitive trouvee".to_string());
    }

    let season_id = cu_matches[0]["SeasonID"].as_str().unwrap_or_default().to_string();
    let current_tier = cu_matches[0]["TierAfterUpdate"].as_i64().unwrap_or(0) as i32;
    let current_rr = cu_matches[0]["RankedRatingAfterUpdate"].as_i64().unwrap_or(0) as i32;

    let mut peak_tier = current_tier;
    let mut peak_rr = current_rr;
    let mut match_ids: Vec<String> = Vec::new();
    let mut act_ids: HashSet<String> = HashSet::new();

    for m in &cu_matches {
        let tier = m["TierAfterUpdate"].as_i64().unwrap_or(0) as i32;
        let rr = m["RankedRatingAfterUpdate"].as_i64().unwrap_or(0) as i32;
        let this_season = m["SeasonID"].as_str().unwrap_or_default() == season_id;
        if this_season && (tier > peak_tier || (tier == peak_tier && rr > peak_rr)) {
            peak_tier = tier;
            peak_rr = rr;
        }
        if let Some(id) = m["MatchID"].as_str() {
            match_ids.push(id.to_string());
            if this_season {
                act_ids.insert(id.to_string());
            }
        }
    }

    let fetches = match_ids.iter().map(|id| fetch_raw_match(&region, id, &headers));
    let raw_matches = futures::future::join_all(fetches).await;

    let mut wins = 0;
    let mut losses = 0;
    let mut kills = 0;
    let mut deaths = 0;
    let mut assists = 0;
    let mut score_total = 0i64;
    let mut rounds_total = 0i64;
    let mut damage_total = 0i64;
    let mut hs_total = 0i64;
    let mut bs_total = 0i64;
    let mut ls_total = 0i64;
    let mut first_bloods = 0;
    let mut aces = 0;
    let mut flawless_rounds = 0;
    let mut kast_rounds_total = 0;
    let mut act_games = 0;
    let mut games_analyzed = 0;
    let mut agent_counts_act: HashMap<String, i32> = HashMap::new();
    let mut agent_counts_recent: HashMap<String, i32> = HashMap::new();

    for (id, raw) in match_ids.iter().zip(raw_matches.iter()) {
        let Some(json) = raw else { continue };
        let Some(analysis) = analyze_match(json, &puuid) else {
            continue;
        };
        games_analyzed += 1;
        *agent_counts_recent.entry(analysis.agent_id.clone()).or_insert(0) += 1;

        if act_ids.contains(id) {
            act_games += 1;
            if analysis.won {
                wins += 1;
            } else {
                losses += 1;
            }
            kills += analysis.kills;
            deaths += analysis.deaths;
            assists += analysis.assists;
            score_total += analysis.score as i64;
            rounds_total += analysis.rounds_played as i64;
            damage_total += analysis.damage;
            hs_total += analysis.headshots;
            bs_total += analysis.bodyshots;
            ls_total += analysis.legshots;
            first_bloods += analysis.first_bloods;
            aces += analysis.aces;
            flawless_rounds += analysis.flawless_rounds;
            kast_rounds_total += analysis.kast_rounds;
            *agent_counts_act.entry(analysis.agent_id.clone()).or_insert(0) += 1;
        }
    }

    let rounds_f = (rounds_total.max(1)) as f32;
    let shots_f = ((hs_total + bs_total + ls_total).max(1)) as f32;
    let deaths_f = (deaths.max(1)) as f32;

    let mut top_agents_act: Vec<AgentPlayCount> = agent_counts_act
        .into_iter()
        .map(|(agent_id, games)| AgentPlayCount { agent_id, games })
        .collect();
    top_agents_act.sort_by(|a, b| b.games.cmp(&a.games));
    top_agents_act.truncate(5);

    let mut top_agents_recent: Vec<AgentPlayCount> = agent_counts_recent
        .into_iter()
        .map(|(agent_id, games)| AgentPlayCount { agent_id, games })
        .collect();
    top_agents_recent.sort_by(|a, b| b.games.cmp(&a.games));
    top_agents_recent.truncate(5);

    Ok(ValorantActOverview {
        season_id,
        current_tier,
        current_rr,
        peak_tier,
        peak_rr,
        games_played: act_games,
        wins,
        losses,
        win_rate: if act_games > 0 {
            wins as f32 / act_games as f32 * 100.0
        } else {
            0.0
        },
        kills,
        deaths,
        assists,
        kd_ratio: kills as f32 / deaths_f,
        kad_ratio: (kills + assists) as f32 / deaths_f,
        acs: score_total as f32 / rounds_f,
        damage_per_round: damage_total as f32 / rounds_f,
        headshot_pct: hs_total as f32 / shots_f * 100.0,
        kast_pct: if rounds_total > 0 {
            kast_rounds_total as f32 / rounds_total as f32 * 100.0
        } else {
            0.0
        },
        first_bloods,
        aces,
        flawless_rounds,
        top_agents_act,
        top_agents_recent,
        recent_games_analyzed: games_analyzed,
    })
}

#[tauri::command]
pub async fn get_valorant_profile() -> Result<ValorantProfile, String> {
    let (port, password) = read_lockfile()?;
    let (access_token, entitlement_token, puuid) = fetch_entitlement(&port, &password).await?;
    let region = fetch_region(&port, &password).await?;
    let client_version = fetch_client_version().await?;
    let headers = pd_headers(&access_token, &entitlement_token, &client_version);

    let match_ids = fetch_match_ids(&region, &puuid, &headers).await?;
    let mut matches = Vec::new();
    for id in match_ids {
        if let Ok(Some(m)) = fetch_match_detail(&region, &id, &puuid, &headers).await {
            matches.push(m);
        }
    }

    let rank = fetch_rank(&region, &puuid, &headers).await;

    Ok(ValorantProfile {
        puuid,
        region,
        rank,
        matches,
    })
}

#[tauri::command]
pub async fn get_valorant_match_detail(match_id: String) -> Result<ValorantMatchDetail, String> {
    let (port, password) = read_lockfile()?;
    let (access_token, entitlement_token, puuid) = fetch_entitlement(&port, &password).await?;
    let region = fetch_region(&port, &password).await?;
    let client_version = fetch_client_version().await?;
    let headers = pd_headers(&access_token, &entitlement_token, &client_version);

    let client = Client::new();
    let url = format!("https://pd.{region}.a.pvp.net/match-details/v1/matches/{match_id}");
    let resp = client
        .get(url)
        .headers(headers.clone())
        .send()
        .await
        .map_err(|e| format!("Details de partie inaccessibles: {e}"))?;
    let json: Value = resp
        .json()
        .await
        .map_err(|e| format!("Reponse details de partie invalide: {e}"))?;

    let players_json = json["players"].as_array().cloned().unwrap_or_default();
    let puuids: Vec<String> = players_json
        .iter()
        .filter_map(|p| p["subject"].as_str().map(|s| s.to_string()))
        .collect();
    let names = fetch_player_names(&region, &puuids, &headers).await;

    let players: Vec<ValorantScoreboardPlayer> = players_json
        .iter()
        .map(|p| {
            let stats = &p["stats"];
            let subject = p["subject"].as_str().unwrap_or_default().to_string();
            ValorantScoreboardPlayer {
                is_me: subject == puuid,
                display_name: names.get(&subject).cloned().unwrap_or_default(),
                puuid: subject,
                agent_id: p["characterId"].as_str().unwrap_or_default().to_string(),
                team_id: p["teamId"].as_str().unwrap_or_default().to_string(),
                kills: stats["kills"].as_i64().unwrap_or(0) as i32,
                deaths: stats["deaths"].as_i64().unwrap_or(0) as i32,
                assists: stats["assists"].as_i64().unwrap_or(0) as i32,
                score: stats["score"].as_i64().unwrap_or(0) as i32,
            }
        })
        .collect();

    let teams: Vec<ValorantTeamResult> = json["teams"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .iter()
        .map(|t| ValorantTeamResult {
            team_id: t["teamId"].as_str().unwrap_or_default().to_string(),
            won: t["won"].as_bool().unwrap_or(false),
            rounds_won: t["roundsWon"].as_i64().unwrap_or(0) as i32,
            rounds_played: t["roundsPlayed"].as_i64().unwrap_or(0) as i32,
        })
        .collect();

    Ok(ValorantMatchDetail {
        map_id: json["matchInfo"]["mapId"].as_str().unwrap_or_default().to_string(),
        queue_id: json["matchInfo"]["queueID"].as_str().unwrap_or_default().to_string(),
        started_at: json["matchInfo"]["gameStartMillis"].as_i64().unwrap_or(0),
        match_id,
        teams,
        players,
    })
}
