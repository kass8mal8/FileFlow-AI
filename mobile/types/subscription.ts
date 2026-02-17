export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  TRIAL = 'trial'
}

export interface SubscriptionState {
  tier: SubscriptionTier;
  expiresAt?: string; // ISO date string
  trialEndsAt?: string;
  purchaseDate?: string;
  platform?: 'ios' | 'android' | 'web' | 'mpesa';
  productId?: string;
}

export interface UsageQuota {
  aiSummaries: number;
  smartReplies: number;
  searches: number;
  lastReset: string; // ISO date string
}

export interface ProFeatures {
  unlimitedAI: boolean;
  premiumModels: boolean; // Qwen 2.5 / Mistral Nemo
  chatWithFiles: boolean; // RAG
  mpesaAutoPay: boolean;
  longDocAnalysis: boolean; // > 1000 words
  deepLinkage: boolean;
  autonomousReplies: boolean;
  batchActions: boolean;
  whatsappPrioritySupport: boolean;
  kraTaxPrep: boolean;
}

// Free tier limits
export const FREE_TIER_LIMITS = {
  aiSummariesPerDay: 5,
  smartRepliesPerEmail: 1,
  actionItemsPerEmail: 1,
  searchesPerDay: 5,
  emailHistoryDays: 30,
  maxWordsPerSummary: 1000,
};

// Pro tier features
export const PRO_FEATURES: ProFeatures = {
  unlimitedAI: true,
  premiumModels: true,
  chatWithFiles: true,
  mpesaAutoPay: true,
  longDocAnalysis: true,
  deepLinkage: true,
  autonomousReplies: true,
  batchActions: true,
  whatsappPrioritySupport: true,
  kraTaxPrep: true,
};

export const FREE_FEATURES: ProFeatures = {
  unlimitedAI: false,
  premiumModels: false,
  chatWithFiles: false,
  mpesaAutoPay: false,
  longDocAnalysis: false,
  deepLinkage: false,
  autonomousReplies: false,
  batchActions: false,
  whatsappPrioritySupport: false,
  kraTaxPrep: false,
};
