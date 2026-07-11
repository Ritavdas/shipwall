/** Shape produced by enrichment and consumed by the submission flow + UI. */
export type EnrichSource = "github" | "link";

export interface Enrichment {
  title: string;
  description: string;
  stack: string[];
  projectUrl: string;
  repoUrl?: string;
  screenshotUrl?: string;
  source: EnrichSource;
  isAi: boolean;
}

/** Internal enrichment with extra signal (readme) used for AI refinement. */
export interface RawEnrichment extends Partial<Enrichment> {
  readme?: string;
  topics?: string[];
}
