// Storage key prefix
const KEY_PREFIX = "hklo_comment_settings_";

export interface CommentSettings {
  locked: boolean; // no new comments can be posted
  hidden: boolean; // existing comments are hidden
}

export function getCommentSettings(postId: string): CommentSettings {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + postId);
    if (!raw) return { locked: false, hidden: false };
    return JSON.parse(raw) as CommentSettings;
  } catch {
    return { locked: false, hidden: false };
  }
}

export function saveCommentSettings(
  postId: string,
  settings: CommentSettings,
): void {
  localStorage.setItem(KEY_PREFIX + postId, JSON.stringify(settings));
}
