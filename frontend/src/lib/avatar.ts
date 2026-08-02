import type { Gender } from "@/lib/api/types";

const DEFAULT_AVATARS: Record<Gender, string> = {
  MALE: "/avatars/default-male.jpg",
  FEMALE: "/avatars/default-female.jpg",
};

/**
 * A user's own uploaded avatar if they have one, otherwise a static default picked by their
 * gender (falls back to the male default when gender isn't set — there are only the two
 * defaults to choose from).
 */
export function getAvatarUrl(user?: { avatar?: string; gender?: Gender } | null): string {
  if (user?.avatar) return user.avatar;
  return DEFAULT_AVATARS[user?.gender ?? "MALE"];
}

/** Resize + compress an image file client-side and resolve to a small base64 data URL. */
export function fileToAvatarDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas mavjud emas"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
