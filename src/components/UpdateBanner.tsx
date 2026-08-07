import { relaunch } from "@tauri-apps/plugin-process";
import { check, Update } from "@tauri-apps/plugin-updater";
import { useEffect, useState } from "react";

type Status = "idle" | "found" | "downloading" | "ready" | "error";

export function UpdateBanner() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    check()
      .then((found) => {
        if (found) {
          setUpdate(found);
          setStatus("found");
        }
      })
      .catch(() => {
        // no network, no release yet, or endpoint unreachable: fail silently
      });
  }, []);

  async function handleUpdate() {
    if (!update) return;
    setStatus("downloading");
    let total = 0;
    let downloaded = 0;
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      });
      setStatus("ready");
      await relaunch();
    } catch {
      setStatus("error");
    }
  }

  if (status === "idle" || !update) return null;

  return (
    <div className="update-banner">
      {status === "found" && (
        <>
          <span>Nouvelle version disponible : v{update.version}</span>
          <button type="button" className="update-banner-button" onClick={handleUpdate}>
            Mettre a jour
          </button>
        </>
      )}
      {status === "downloading" && (
        <>
          <span>Telechargement... {progress > 0 ? `${progress}%` : ""}</span>
          <div className="update-banner-track">
            <div className="update-banner-fill" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}
      {status === "ready" && <span>Mise a jour installee, redemarrage...</span>}
      {status === "error" && <span>Echec de la mise a jour, reessaie plus tard.</span>}
    </div>
  );
}
