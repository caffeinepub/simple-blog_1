/**
 * Truncates blog post content to approximately the specified number of words,
 * preserving sentence boundaries when possible.
 */
export function truncateContent(content: string, maxWords: number = 150): string {
  const words = content.trim().split(/\s+/);
  if (words.length <= maxWords) return content;

  // Try to find a sentence boundary near maxWords
  const truncated = words.slice(0, maxWords).join(' ');

  // Look for the last sentence-ending punctuation within the truncated text
  const sentenceEndMatch = truncated.match(/^(.*[.!?])\s+\S/s);
  if (sentenceEndMatch && sentenceEndMatch[1].split(/\s+/).length >= Math.floor(maxWords * 0.6)) {
    return sentenceEndMatch[1] + '...';
  }

  return truncated + '...';
}
