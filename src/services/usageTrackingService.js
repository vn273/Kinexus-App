/**
 * Usage Tracking Service - Monitor AI API usage and costs
 */

// Pricing (Gemini 1.5 Flash)
const PRICING = {
  inputPer1K: 0.000075,  // $0.000075 per 1K input tokens
  outputPer1K: 0.0003,   // $0.0003 per 1K output tokens
  dailyBudget: 0.20      // $0.20 daily limit
};

// In-memory storage (will reset on page refresh)
// In production, this should be stored in Firestore
const usageData = new Map();

/**
 * Get today's date key
 */
const getTodayKey = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Get or initialize user's daily usage
 */
const getUserUsage = (userId) => {
  const todayKey = getTodayKey();
  const userKey = `${userId}_${todayKey}`;
  
  if (!usageData.has(userKey)) {
    usageData.set(userKey, {
      queries: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      lastUpdated: new Date()
    });
  }
  
  return usageData.get(userKey);
};

/**
 * Track AI usage
 */
export const trackAIUsage = (userId, inputTokens, outputTokens) => {
  const usage = getUserUsage(userId);
  
  const inputCost = (inputTokens / 1000) * PRICING.inputPer1K;
  const outputCost = (outputTokens / 1000) * PRICING.outputPer1K;
  const queryCost = inputCost + outputCost;
  
  usage.queries += 1;
  usage.inputTokens += inputTokens;
  usage.outputTokens += outputTokens;
  usage.estimatedCost += queryCost;
  usage.lastUpdated = new Date();
  
  return {
    queryCost,
    totalCost: usage.estimatedCost,
    remaining: PRICING.dailyBudget - usage.estimatedCost
  };
};

/**
 * Check if user can make AI request
 */
export const canMakeAIRequest = (userId) => {
  const usage = getUserUsage(userId);
  return usage.estimatedCost < PRICING.dailyBudget;
};

/**
 * Get user's usage stats
 */
export const getUsageStats = (userId) => {
  const usage = getUserUsage(userId);
  
  return {
    queries: usage.queries,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.inputTokens + usage.outputTokens,
    estimatedCost: usage.estimatedCost.toFixed(4),
    dailyBudget: PRICING.dailyBudget,
    remaining: (PRICING.dailyBudget - usage.estimatedCost).toFixed(4),
    percentUsed: ((usage.estimatedCost / PRICING.dailyBudget) * 100).toFixed(1),
    lastUpdated: usage.lastUpdated
  };
};

/**
 * Get formatted usage display
 */
export const getUsageDisplay = (userId) => {
  const stats = getUsageStats(userId);
  return `${stats.queries} queries, $${stats.estimatedCost}`;
};

/**
 * Reset daily usage (for testing)
 */
export const resetDailyUsage = (userId) => {
  const todayKey = getTodayKey();
  const userKey = `${userId}_${todayKey}`;
  usageData.delete(userKey);
};

/**
 * Export usage data for persistence (call this before page unload)
 */
export const exportUsageData = () => {
  const data = {};
  usageData.forEach((value, key) => {
    data[key] = value;
  });
  return data;
};

/**
 * Import usage data (call this on page load)
 */
export const importUsageData = (data) => {
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([key, value]) => {
      usageData.set(key, value);
    });
  }
};
