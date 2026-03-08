/**
 * Frontend content moderation layer.
 *
 * Runs BEFORE backend calls so that blocked content is caught regardless of
 * whether the backend `containsBlockedContent` is case-sensitive or not.
 * The word list mirrors the backend list but matching is done case-insensitively
 * after HTML tags have been stripped.
 */

const BLOCKED_WORDS_SV = [
  "jävla",
  "fan",
  "helvete",
  "hora",
  "fitta",
  "kuk",
  "knulla",
  "skit",
  "idiot",
  "mongo",
  "neger",
  "bög",
  "rövhål",
  "djävul",
  "satan",
  "bastard",
  "kräk",
  "skitstövel",
  "jävel",
  "förbannad",
  "döda",
  "mörda",
  "slå ihjäl",
  "hata",
  "hatet",
  "rasist",
  "rasism",
  "nazist",
  "nazism",
  "pedofil",
  "terrorist",
  "terrorism",
];

const BLOCKED_WORDS_EN = [
  "fuck",
  "shit",
  "asshole",
  "bitch",
  "cunt",
  "dick",
  "bastard",
  "nigger",
  "faggot",
  "retard",
  "kill",
  "murder",
  "rape",
  "racist",
  "racism",
  "nazi",
  "pedophile",
  "terrorist",
  "terrorism",
  "hate speech",
  "kys",
  "go die",
];

const ALL_BLOCKED_WORDS = [...BLOCKED_WORDS_SV, ...BLOCKED_WORDS_EN];

/**
 * Strip HTML tags from a string so that moderation works on plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ") // replace tags with space
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns the first blocked word found in the text, or null if clean.
 * Matching is case-insensitive and uses word boundaries (\b) for all words
 * to prevent false positives (e.g. "kill" should not match "skillful").
 * Multi-word phrases (containing spaces) are matched with word boundaries
 * at the phrase edges only.
 */
export function findBlockedWord(rawText: string): string | null {
  const plainText = stripHtml(rawText);
  for (const word of ALL_BLOCKED_WORDS) {
    // Escape any regex special chars in the word/phrase, then wrap in \b
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");
    if (pattern.test(plainText)) {
      return word;
    }
  }
  return null;
}

/**
 * Convenience: check title + content combined.
 */
export function checkPostContent(
  title: string,
  content: string,
): string | null {
  const combined = `${title} ${content}`;
  return findBlockedWord(combined);
}
