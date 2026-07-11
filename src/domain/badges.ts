import { isFullStack } from "./stack";

export const BADGES = {
  first_ship: { label: "First Ship", emoji: "🚀" },
  ai_builder: { label: "AI Builder", emoji: "🤖" },
  full_stack: { label: "Full-Stack", emoji: "🧱" },
  serial_builder: { label: "Serial Builder", emoji: "🔥" },
} as const;

export type BadgeKind = keyof typeof BADGES;

/**
 * All badges are derived from data we already have — never asked for.
 */
export function computeBadges(opts: {
  priorSubmissionCount: number;
  isAi: boolean;
  stack: string[];
}): BadgeKind[] {
  const out: BadgeKind[] = [];
  if (opts.priorSubmissionCount === 0) out.push("first_ship");
  if (opts.priorSubmissionCount >= 2) out.push("serial_builder"); // 3rd+ ship
  if (opts.isAi) out.push("ai_builder");
  if (isFullStack(opts.stack)) out.push("full_stack");
  return out;
}
