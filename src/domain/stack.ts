/**
 * Heuristics that turn raw repo/link signals into stack tags and an AI flag —
 * no self-reporting. Deliberately simple + dependency-free.
 */

const AI_MARKERS = [
  "openai",
  "anthropic",
  "claude",
  "gpt",
  "gemini",
  "mistral",
  "cohere",
  "llm",
  "langchain",
  "llamaindex",
  "llama",
  "ollama",
  "openrouter",
  "huggingface",
  "transformers",
  "diffusers",
  "stable-diffusion",
  "whisper",
  "pinecone",
  "chromadb",
  "weaviate",
  "qdrant",
  "ai-sdk",
  "vercel ai",
  "pytorch",
  "tensorflow",
  "keras",
  "scikit-learn",
  "spacy",
  "rag",
  "embedding",
  "vector db",
];

const FRONTEND = [
  "react",
  "next",
  "vue",
  "svelte",
  "angular",
  "typescript",
  "javascript",
  "html",
  "css",
  "tailwind",
  "flutter",
  "swift",
  "kotlin",
  "expo",
  "react native",
];

const BACKEND = [
  "node",
  "python",
  "go",
  "rust",
  "java",
  "ruby",
  "php",
  "c#",
  "elixir",
  "django",
  "flask",
  "fastapi",
  "express",
  "rails",
  "postgres",
  "mysql",
  "mongodb",
  "supabase",
  "prisma",
];

export function detectAI(signals: Array<string | undefined | null>): boolean {
  const hay = signals.filter(Boolean).join(" ").toLowerCase();
  return AI_MARKERS.some((m) => hay.includes(m));
}

/** Dedupe, trim, cap. Keeps the wall cards tidy. */
export function normalizeStack(input: string[], max = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}

export function isFullStack(stack: string[]): boolean {
  const hay = stack.join(" ").toLowerCase();
  const hasFront = FRONTEND.some((t) => hay.includes(t));
  const hasBack = BACKEND.some((t) => hay.includes(t));
  return hasFront && hasBack;
}
