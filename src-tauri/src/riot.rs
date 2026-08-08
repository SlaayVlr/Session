use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::header::{HeaderMap, HeaderValue};
use reqwest::Client;
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
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
