import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export async function pickImageAsDataUrl(): Promise<string | null> {
  const picked = await open({
    multiple: false,
    directory: false,
    filters: [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"] },
    ],
  });
  if (typeof picked !== "string") return null;
  return invoke<string>("read_image_as_base64", { path: picked });
}
