import { relaunch } from "@tauri-apps/plugin-process";
import { check, Update } from "@tauri-apps/plugin-updater";
import { useCallback, useState } from "react";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "found"
  | "downloading"
  | "ready"
  | "error";

export function useUpdater() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [progress, setProgress] = useState(0);

  const checkForUpdate = useCallback(async () => {
    setStatus("checking");
    try {
      const found = await check();
      if (found) {
        setUpdate(found);
        setStatus("found");
      } else {
        setUpdate(null);
        setStatus("up-to-date");
      }
    } catch {
      setStatus("error");
    }
  }, []);

  const installUpdate = useCallback(async () => {
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
          if (total > 0) {
            setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
          }
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      });
      setStatus("ready");
      await relaunch();
    } catch {
      setStatus("error");
    }
  }, [update]);

  return { update, status, progress, checkForUpdate, installUpdate };
}
