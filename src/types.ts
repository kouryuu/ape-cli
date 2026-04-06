export interface PromptVariant {
  text: string;
  reasoning: string;
}

export interface ScoredVariant extends PromptVariant {
  scores: {
    clarity: number;
    specificity: number;
    effectiveness: number;
  };
  overall: number;
  feedback: string;
}

export interface RankedVariant extends ScoredVariant {
  rank: number;
}
