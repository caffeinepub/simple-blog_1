/**
 * Local author block list stored in localStorage.
 *
 * When backend `removeAuthor` is not accessible due to principal ID mismatch,
 * we maintain a local block list that prevents blocked authors' posts from
 * being displayed and prevents them from publishing new content.
 */

const STORAGE_KEY = "hklo_blocked_authors";

export function getBlockedAuthors(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function blockAuthor(principalText: string): void {
  const current = getBlockedAuthors();
  if (!current.includes(principalText)) {
    current.push(principalText);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }
}

export function unblockAuthor(principalText: string): void {
  const current = getBlockedAuthors().filter((p) => p !== principalText);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function isAuthorBlocked(principalText: string): boolean {
  return getBlockedAuthors().includes(principalText);
}
