/** The one structured signal we capture for grant/credit conversations. */
export const NEEDS = [
  "Compute",
  "API credits",
  "Design",
  "Distribution",
  "Mentorship",
] as const;

export type Need = (typeof NEEDS)[number];

export function normalizeNeeds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set<string>(NEEDS);
  return [...new Set(input.filter((n): n is string => typeof n === "string" && allowed.has(n)))];
}
