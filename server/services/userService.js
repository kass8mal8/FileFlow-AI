const User = require('../models/User');

class UserService {
  /**
   * Get user by email, create if doesn't exist
   */
  async getUserByEmail(email) {
    try {
      let user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        user = await User.create({ 
          email: email.toLowerCase(),
          subscription: {
            tier: 'FREE',
            status: 'active'
          }
        });
        console.log(`✨ Created new user: ${email}`);
      }
      
      return user;
    } catch (error) {
      console.error('Error fetching/creating user:', error);
      throw error;
    }
  }

  /**
   * Update user subscription
   */
  async updateSubscription(email, tier, status = 'active') {
    try {
      const update = {
        'subscription.tier': tier,
        'subscription.status': status
      };

      if (tier === 'TRIAL') {
        // 7-day trial
        update['subscription.trialEndsAt'] = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else if (tier === 'PRO') {
        update['subscription.proStartedAt'] = new Date();
      }

      const user = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        update,
        { new: true }
      );

      return user;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Check if user can use a feature (quota check)
   */
  async canUseFeature(email, feature) {
    try {
      const user = await this.getUserByEmail(email);
      
      // Pro users have unlimited access
      if (user.subscription.tier === 'PRO' || user.subscription.tier === 'TRIAL') {
        return { allowed: true, remaining: Infinity };
      }

      // Check if quota needs reset (daily)
      const now = new Date();
      const usageData = user.usage[feature];
      
      if (!usageData.resetAt || now > usageData.resetAt) {
        // Reset quota
        const tomorrow = new Date(now);
        tomorrow.setHours(24, 0, 0, 0);
        
        user.usage[feature].count = 0;
        user.usage[feature].resetAt = tomorrow;
        await user.save();
      }

      const remaining = usageData.limit - usageData.count;
      return { 
        allowed: remaining > 0, 
        remaining,
        limit: usageData.limit 
      };
    } catch (error) {
      console.error('Error checking feature quota:', error);
      return { allowed: true, remaining: 0 }; // Fail open
    }
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(email, feature) {
    try {
      await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { $inc: { [`usage.${feature}.count`]: 1 } }
      );
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }

  /**
   * Get user subscription info
   */
  async getSubscriptionInfo(email) {
    try {
      const user = await this.getUserByEmail(email);
      return {
        tier: user.subscription.tier,
        status: user.subscription.status,
        trialEndsAt: user.subscription.trialEndsAt,
        isPro: user.subscription.tier === 'PRO' || user.subscription.tier === 'TRIAL'
      };
    } catch (error) {
      console.error('Error getting subscription info:', error);
      return { tier: 'FREE', status: 'active', isPro: false };
    }
  }
}

module.exports = new UserService();
