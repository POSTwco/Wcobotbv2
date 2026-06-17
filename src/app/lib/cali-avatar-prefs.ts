export type AvatarGender = "male" | "female";

const STORAGE_KEY = "botb-cali-avatar-gender";

export function getAvatarGender(): AvatarGender {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "female" ? "female" : "male";
  } catch {
    return "male";
  }
}

export function setAvatarGender(gender: AvatarGender): void {
  try {
    localStorage.setItem(STORAGE_KEY, gender);
  } catch {
    /* ignore quota errors */
  }
}