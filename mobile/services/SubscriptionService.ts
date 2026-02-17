import { appStorage } from '../utils/storage';
import { SubscriptionTier, SubscriptionState, UsageQuota, ProFeatures, FREE_TIER_LIMITS, PRO_FEATURES, FREE_FEATURES } from '../types/subscription';
import { API_BASE_URL } from '../utils/constants';

class SubscriptionService {
  private currentState: SubscriptionState | null = null;
  private todayQuota: UsageQuota | null = null;

  /**
   * Initialize subscription state from storage
   */
  async initialize(): Promise<void> {
    this.currentState = await appStorage.getSubscriptionState();
    this.todayQuota = await appStorage.getUsageQuota();
    
    // Auto-sync with server if possible
    try {
        const userInfo = await appStorage.getUserInfo();
        if (userInfo?.email) {
            // Run in background so we don't block initialization
            this.syncWithServer(userInfo.email).catch(console.error);
        }
    } catch (e) {
        console.log("Failed to auto-sync subscription", e);
    }

    // Default to free tier if no state exists
    if (!this.currentState) {
      this.currentState = { tier: SubscriptionTier.FREE };
      await appStorage.setSubscriptionState(this.currentState);
    }

    // Reset quota if it's a new day
    if (this.todayQuota && !this.isToday(this.todayQuota.lastReset)) {
      await this.resetDailyQuota();
    } else if (!this.todayQuota) {
      await this.resetDailyQuota();
    }
  }

  /**
   * Get current subscription tier
   */
  getTier(): SubscriptionTier {
    return this.currentState?.tier || SubscriptionTier.FREE;
  }

  /**
   * Check if user is Pro (or in trial)
   */
  isPro(): boolean {
    const tier = this.getTier();
    
    // Check if trial has expired
    if (tier === SubscriptionTier.TRIAL) {
      const trialEndsAt = this.currentState?.trialEndsAt;
      if (trialEndsAt && new Date(trialEndsAt) < new Date()) {
        // Trial expired, downgrade to free
        this.updateTier(SubscriptionTier.FREE);
        return false;
      }
      return true;
    }
    
    return tier === SubscriptionTier.PRO;
  }

  /**
   * Get available features based on tier
   */
  getFeatures(): ProFeatures {
    return this.isPro() ? PRO_FEATURES : FREE_FEATURES;
  }

  /**
   * Check if user can use a specific feature
   */
  canUseFeature(feature: keyof ProFeatures): boolean {
    const features = this.getFeatures();
    return features[feature];
  }

  /**
   * Check if user has quota remaining for an action
   */
  async canUseAI(action: 'summary' | 'reply' | 'search'): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    if (this.isPro()) {
      return { allowed: true, remaining: -1, limit: -1 }; // Unlimited
    }

    if (!this.todayQuota) {
      await this.resetDailyQuota();
    }

    const quota = this.todayQuota!;
    let used = 0;
    let limit = 0;

    switch (action) {
      case 'summary':
        used = quota.aiSummaries;
        limit = FREE_TIER_LIMITS.aiSummariesPerDay;
        break;
      case 'reply':
        used = quota.smartReplies;
        limit = FREE_TIER_LIMITS.smartRepliesPerEmail;
        break;
      case 'search':
        used = quota.searches;
        limit = FREE_TIER_LIMITS.searchesPerDay;
        break;
    }

    return {
      allowed: used < limit,
      remaining: Math.max(0, limit - used),
      limit
    };
  }

  /**
   * Check if document length is allowed for Free tier
   */
  isLengthAllowed(text: string): boolean {
    if (this.isPro()) return true;
    const wordCount = text.trim().split(/\s+/).length;
    return wordCount <= FREE_TIER_LIMITS.maxWordsPerSummary;
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(action: 'summary' | 'reply' | 'search'): Promise<void> {
    if (this.isPro()) return; // No tracking for Pro users

    if (!this.todayQuota) {
      await this.resetDailyQuota();
    }

    const quota = this.todayQuota!;

    switch (action) {
      case 'summary':
        quota.aiSummaries++;
        break;
      case 'reply':
        quota.smartReplies++;
        break;
      case 'search':
        quota.searches++;
        break;
    }

    await appStorage.setUsageQuota(quota);
  }

  /**
   * Start free trial
   */
  async startTrial(): Promise<void> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7-day trial

    this.currentState = {
      tier: SubscriptionTier.TRIAL,
      trialEndsAt: trialEndsAt.toISOString(),
      purchaseDate: new Date().toISOString()
    };

    await appStorage.setSubscriptionState(this.currentState);
  }

  /**
   * Upgrade to Pro
   */
  async upgradeToPro(productId: string, platform: 'ios' | 'android' | 'web' | 'mpesa'): Promise<void> {
    this.currentState = {
      tier: SubscriptionTier.PRO,
      purchaseDate: new Date().toISOString(),
      platform,
      productId
    };

    await appStorage.setSubscriptionState(this.currentState);
  }

  /**
   * Update subscription tier
   */
  async updateTier(tier: SubscriptionTier): Promise<void> {
    if (this.currentState) {
      this.currentState.tier = tier;
      await appStorage.setSubscriptionState(this.currentState);
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): UsageQuota | null {
    return this.todayQuota;
  }

  /**
   * Reset daily quota
   */
  private async resetDailyQuota(): Promise<void> {
    this.todayQuota = {
      aiSummaries: 0,
      smartReplies: 0,
      searches: 0,
      lastReset: new Date().toISOString()
    };
    await appStorage.setUsageQuota(this.todayQuota);
  }

  /**
   * Sync subscription status with server
   */
  async syncWithServer(email: string): Promise<void> {
    try {
      console.log(`Syncing subscription for ${email}...`);
      const url = `${API_BASE_URL}/user/status?email=${encodeURIComponent(email)}`;
      console.log("Fetching URL:", url);
      
      const response = await fetch(url, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Server Subscription Data:", data);
        
        if (data.tier) {
            // Map server status to local state
            const newTier = data.tier === 'PRO' ? SubscriptionTier.PRO : 
                           data.tier === 'TRIAL' ? SubscriptionTier.TRIAL : 
                           SubscriptionTier.FREE;
                           
            await this.updateTier(newTier);
            
            // If server has expiration/trial data, update that too (simplified for now)
            if (data.trialEndsAt) {
                this.currentState = {
                    ...this.currentState!,
                    tier: newTier,
                    trialEndsAt: data.trialEndsAt
                };
                await appStorage.setSubscriptionState(this.currentState);
            }
        }
      }
    } catch (error) {
      console.error("Failed to sync subscription:", error);
    }
  }

  /**
   * Check if date is today
   */
  private isToday(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }
}

export default new SubscriptionService();
