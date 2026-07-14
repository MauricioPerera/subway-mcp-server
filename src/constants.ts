export const CHARACTER_LIMIT = 30000;
export const DEFAULT_TIMEOUT_SECONDS = 600;
export const MAX_TIMEOUT_SECONDS = 1800;
export const MIN_TIMEOUT_SECONDS = 10;

export function truncate(text: string, limit: number = CHARACTER_LIMIT): { text: string; truncated: boolean } {
  if (text.length <= limit) {
    return { text, truncated: false };
  }
  return {
    text: text.slice(0, limit) + `\n\n[...truncated ${text.length - limit} characters...]`,
    truncated: true
  };
}
