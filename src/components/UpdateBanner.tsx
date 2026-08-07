import { useEffect } from "react";
import { useUpdater } from "../hooks/useUpdater";

export function UpdateBanner() {
  const { update, status, progress, checkForUpdate, installUpdate } = useUpdater();

  useEffect(() => {
    checkForUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "idle" || status === "checking" || status === "up-to-date" || status === "error") {
    return null;
  }
  if (!update) return null;

  return (
    <div className="update-banner">
      {status === "found" && (
        <>
          <span>Nouvelle version disponible : v{update.version}</span>
          <button type="button" className="update-banner-button" onClick={installUpdate}>
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
    </div>
  );
}
