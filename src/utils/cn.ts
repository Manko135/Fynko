/** Tiny class-name joiner. Filters falsy values; no external dependency. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
