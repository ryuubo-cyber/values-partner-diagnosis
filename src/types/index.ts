// ========== カテゴリ定義 ==========
export interface CategoryDef {
  id: string;
  label: string;
  order: number;
}

// ========== 質問 ==========
export interface Question {
  id: string;
  categoryId: string;
  displayOrder: number;
  questionText: string;
  reverseScore: boolean;
  activeFlag: boolean;
}

// ========== 回答 ==========
export interface AnswerInput {
  questionId: string;
  answer: number; // 1-5
}

// ========== プロフィール ==========
export interface ProfileInput {
  birthDate?: string;
  birthPlace?: string;
  currentResidence?: string;
  favoriteMusic?: string;
  politicalInterest?: string;
  occupation?: string;
  familyStructure?: string;
  lifestyle?: string;
  smartphone?: string;
  snsUsage?: string;
}

// ========== セッション ==========
export type SessionStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "result_generated"
  | "error";

export interface SessionState {
  sessionId: string;
  status: SessionStatus;
  currentCategoryIndex: number;
  completedQuestionCount: number;
  nextSetNumber: number;
  startedAt: string | null;
  lastAnsweredAt: string | null;
  completedAt: string | null;
}

// ========== スコア ==========
export interface CategoryScores {
  [categoryId: string]: number;
}

export interface ScoreResult {
  categoryScores: CategoryScores;
  weightedScores: CategoryScores;
  mainType: string;
  subType: string;
  highCategories: string[];
  lowCategories: string[];
}

// ========== タイプ判定ルール ==========
export interface TypeRule {
  typeName: string;
  requiredCategories: string[]; // 上位にこのカテゴリがあれば該当
  priority: number;
}

// ========== AIレポート ==========
export interface ReportJson {
  mainType: string;
  subType: string;
  overallType: { title: string; text: string };
  highScoreDeepDive: Array<{
    categoryId: string;
    title: string;
    text: string;
  }>;
  categoryFeedbacks: Array<{
    categoryId: string;
    title: string;
    score: number;
    text: string;
  }>;
  idealPartnerAnalysis: { title: string; text: string };
  compatibilityTop5: {
    romance: Array<{ rank: number; typeName: string; reason: string }>;
    marriage: Array<{ rank: number; typeName: string; reason: string }>;
    business: Array<{ rank: number; typeName: string; reason: string }>;
    friendship: Array<{ rank: number; typeName: string; reason: string }>;
    client: Array<{ rank: number; typeName: string; reason: string }>;
  };
  encounterHints: { title: string; text: string };
  moneyAnalysis: { title: string; text: string };
  loveAndMarriageAnalysis: { title: string; text: string };
  regionalCompatibility: { title: string; text: string };
  fourPillarsInsight: { title: string; text: string };
  partnerCheckGuide: { title: string; text: string };
  counselorMessage: { title: string; text: string };
}

// ========== API レスポンス ==========
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
