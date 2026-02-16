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
  premiumModels: boolean; // GPT-4o, Gemini Pro
  semanticSearch: boolean;
  crossSenderLinking: boolean;
  driveIntegration: boolean;
  priorityNotifications: boolean;
  autoDraft: boolean;
}

// Free tier limits
export const FREE_TIER_LIMITS = {
  aiSummariesPerDay: 10,
  smartRepliesPerEmail: 3,
  searchesPerDay: 5,
  emailHistoryDays: 30
};

// Pro tier features
export const PRO_FEATURES: ProFeatures = {
  unlimitedAI: true,
  premiumModels: true,
  semanticSearch: true,
  crossSenderLinking: true,
  driveIntegration: true,
  priorityNotifications: true,
  autoDraft: true
};

export const FREE_FEATURES: ProFeatures = {
  unlimitedAI: false,
  premiumModels: false,
  semanticSearch: false,
  crossSenderLinking: false,
  driveIntegration: false,
  priorityNotifications: false,
  autoDraft: false
};
