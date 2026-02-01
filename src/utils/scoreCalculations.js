/**
 * Score Calculations Utility
 * Pure functions for gamification score math
 */

// Score tier definitions
export const SCORE_TIERS = [
  { min: 0, max: 500, name: 'Beginner Networker', icon: '🌱' },
  { min: 501, max: 1000, name: 'Active Networker', icon: '🚀' },
  { min: 1001, max: 1500, name: 'Skilled Connector', icon: '⭐' },
  { min: 1501, max: 2000, name: 'Networking Expert', icon: '💎' },
  { min: 2001, max: 2500, name: 'Elite Connector', icon: '🏆' },
  { min: 2501, max: 3000, name: 'Master Networker', icon: '👑' },
  { min: 3001, max: Infinity, name: 'Legendary', icon: '🌟' }
];

// Activity point values
export const ACTIVITY_POINTS = {
  cold_outreach: 5,
  warm_intro_request: 10,
  coffee_chat: 25,
  call_completed: 25,
  follow_up: 3,
  contact_added: 10,
  lead_converted: 30
};

// Streak multipliers
export const STREAK_MULTIPLIERS = {
  7: 1.2,  // 7-day streak
  14: 1.5, // 14-day streak
  30: 2.0  // 30-day streak
};

// Quality multipliers
export const QUALITY_MULTIPLIERS = {
  responseRate: { threshold: 0.7, multiplier: 1.3 },
  callConversion: { threshold: 0.6, multiplier: 1.3 }
};

// Company penetration levels
export const COMPANY_PENETRATION_LEVELS = [
  { name: 'No Presence', min: 0, max: 10, icon: '⚪', color: 'bg-gray-100 text-gray-600', borderColor: 'border-gray-200', barColor: 'bg-gray-400', textColor: 'text-gray-600' },
  { name: 'Initial Contact', min: 11, max: 30, icon: '🟡', color: 'bg-yellow-100 text-yellow-700', borderColor: 'border-yellow-300', barColor: 'bg-yellow-500', textColor: 'text-yellow-700' },
  { name: 'Building Relationships', min: 31, max: 50, icon: '🟢', color: 'bg-green-100 text-green-700', borderColor: 'border-green-300', barColor: 'bg-green-500', textColor: 'text-green-700' },
  { name: 'Strong Network', min: 51, max: 75, icon: '🔵', color: 'bg-blue-100 text-blue-700', borderColor: 'border-blue-300', barColor: 'bg-blue-500', textColor: 'text-blue-700' },
  { name: 'Deep Connections', min: 76, max: 100, icon: '🟣', color: 'bg-purple-100 text-purple-700', borderColor: 'border-purple-300', barColor: 'bg-purple-500', textColor: 'text-purple-700' }
];

/**
 * Get tier for a given score
 */
export const getTierForScore = (score) => {
  return SCORE_TIERS.find(tier => score >= tier.min && score <= tier.max) || SCORE_TIERS[0];
};

/**
 * Calculate percentage to next tier
 */
export const getProgressToNextTier = (score) => {
  const currentTier = getTierForScore(score);
  const currentIndex = SCORE_TIERS.indexOf(currentTier);
  
  if (currentIndex === SCORE_TIERS.length - 1) {
    return { progress: 100, nextTier: null, pointsNeeded: 0 };
  }
  
  const nextTier = SCORE_TIERS[currentIndex + 1];
  const tierRange = currentTier.max - currentTier.min;
  const progressInTier = score - currentTier.min;
  const progress = Math.round((progressInTier / tierRange) * 100);
  
  return {
    progress: Math.min(progress, 100),
    nextTier,
    pointsNeeded: nextTier.min - score
  };
};

/**
 * Get streak multiplier based on current streak
 */
export const getStreakMultiplier = (streakDays) => {
  if (streakDays >= 30) return STREAK_MULTIPLIERS[30];
  if (streakDays >= 14) return STREAK_MULTIPLIERS[14];
  if (streakDays >= 7) return STREAK_MULTIPLIERS[7];
  return 1.0;
};

/**
 * Calculate Activity Score (0-1000)
 */
export const calculateActivityScore = (activities, streakDays = 0) => {
  let baseScore = 0;
  
  // Sum up activity points
  activities.forEach(activity => {
    const points = ACTIVITY_POINTS[activity.type] || 0;
    baseScore += points;
  });
  
  // Apply streak multiplier
  const multiplier = getStreakMultiplier(streakDays);
  const finalScore = Math.round(baseScore * multiplier);
  
  // Cap at 1000
  return Math.min(finalScore, 1000);
};

/**
 * Get activity level label
 */
export const getActivityLevel = (monthlyPoints) => {
  if (monthlyPoints >= 201) return { label: 'Connector Elite', color: 'purple' };
  if (monthlyPoints >= 101) return { label: 'Networking Pro', color: 'green' };
  if (monthlyPoints >= 51) return { label: 'Active Networker', color: 'blue' };
  return { label: 'Getting Started', color: 'gray' };
};

/**
 * Calculate Quality Score (0-1000)
 */
export const calculateQualityScore = (stats) => {
  const { 
    outreachSent = 0, 
    responses = 0, 
    callsScheduled = 0,
    strategicContacts = 0,  // Contacts with strategic value 8-10
    introductionsReceived = 0
  } = stats;
  
  let score = 0;
  
  // Response rate component (0-300)
  if (outreachSent > 0) {
    const responseRate = responses / outreachSent;
    if (responseRate >= 0.6) score += 300;
    else if (responseRate >= 0.4) score += 200;
    else if (responseRate >= 0.2) score += 100;
    else score += 50;
  }
  
  // Conversion rate component (0-300)
  if (responses > 0) {
    const conversionRate = callsScheduled / responses;
    if (conversionRate >= 0.5) score += 300;
    else if (conversionRate >= 0.3) score += 200;
    else if (conversionRate >= 0.15) score += 100;
    else score += 50;
  }
  
  // Strategic connections (50 points each, max 200)
  score += Math.min(strategicContacts * 50, 200);
  
  // Introductions (20 points each, max 200)
  score += Math.min(introductionsReceived * 20, 200);
  
  return Math.min(score, 1000);
};

/**
 * Calculate Relationship Score (0-1000)
 */
export const calculateRelationshipScore = (contacts) => {
  if (!contacts || contacts.length === 0) return 0;
  
  let score = 0;
  
  // Average closeness component (0-400)
  const avgCloseness = contacts.reduce((sum, c) => sum + (c.relationshipCloseness || 5), 0) / contacts.length;
  if (avgCloseness >= 7) score += 400;
  else if (avgCloseness >= 5) score += 300;
  else if (avgCloseness >= 3) score += 200;
  else score += 100;
  
  // Relationship maintenance (0-300)
  const now = new Date();
  const maintainedCount = contacts.filter(c => {
    if (!c.lastContactDate) return false;
    const daysSince = Math.floor((now - new Date(c.lastContactDate)) / (1000 * 60 * 60 * 24));
    const targetDays = c.contactRegularity === 'weekly' ? 7 :
                       c.contactRegularity === 'biweekly' ? 14 :
                       c.contactRegularity === 'monthly' ? 30 :
                       c.contactRegularity === 'quarterly' ? 90 : 180;
    return daysSince <= targetDays;
  }).length;
  
  const maintenanceRate = maintainedCount / contacts.length;
  if (maintenanceRate >= 0.9) score += 300;
  else if (maintenanceRate >= 0.7) score += 200;
  else if (maintenanceRate >= 0.5) score += 100;
  else score += 50;
  
  // Network diversity (0-300)
  const sectors = [...new Set(contacts.map(c => c.sector).filter(Boolean))];
  if (sectors.length >= 5) score += 300;
  else if (sectors.length >= 3) score += 150;
  else score += 50;
  
  return Math.min(score, 1000);
};

/**
 * Calculate Consistency Score (0-1000)
 */
export const calculateConsistencyScore = (streakData) => {
  const {
    currentStreak = 0,
    weeksActiveInLast12 = 0,
    monthlyVariance = 1 // Lower is better, 0-1 scale
  } = streakData;
  
  let score = 0;
  
  // Streak component (0-400)
  if (currentStreak >= 30) score += 400;
  else if (currentStreak >= 14) score += 300;
  else if (currentStreak >= 7) score += 200;
  else score += currentStreak * 20;
  
  // Weekly activity component (0-400)
  if (weeksActiveInLast12 >= 12) score += 400;
  else if (weeksActiveInLast12 >= 9) score += 300;
  else if (weeksActiveInLast12 >= 6) score += 200;
  else score += weeksActiveInLast12 * 30;
  
  // Consistency component (0-200) - lower variance = higher score
  const consistencyScore = Math.round((1 - monthlyVariance) * 200);
  score += Math.max(consistencyScore, 0);
  
  return Math.min(score, 1000);
};

/**
 * Calculate total user score
 */
export const calculateTotalScore = (activityScore, qualityScore, relationshipScore, consistencyScore) => {
  return activityScore + qualityScore + relationshipScore + consistencyScore;
};

/**
 * Calculate company penetration score (0-100)
 */
export const calculateCompanyScore = (companyData) => {
  const {
    contactsAtCompany = 0,
    responseRate = 0,
    callsScheduled = 0,
    seniorContacts = 0,
    avgCloseness = 5,
    avgStrategicValue = 3
  } = companyData;
  
  const score = (
    (contactsAtCompany * 5) +
    (responseRate * 30) +
    (callsScheduled * 10) +
    (seniorContacts * 15) +
    (avgCloseness * 5) +
    (avgStrategicValue * 5)
  ) / 10;
  
  return Math.min(Math.round(score), 100);
};

/**
 * Get company penetration level
 */
export const getCompanyPenetrationLevel = (score) => {
  const level = COMPANY_PENETRATION_LEVELS.find(l => score >= l.min && score <= l.max);
  return level || COMPANY_PENETRATION_LEVELS[0];
};

/**
 * Calculate response rate
 */
export const calculateResponseRate = (responses, outreachSent) => {
  if (outreachSent === 0) return 0;
  return Math.round((responses / outreachSent) * 100);
};

/**
 * Calculate conversion rate (calls/responses)
 */
export const calculateConversionRate = (calls, responses) => {
  if (responses === 0) return 0;
  return Math.round((calls / responses) * 100);
};

/**
 * Format score with tier icon
 */
export const formatScoreWithTier = (score) => {
  const tier = getTierForScore(score);
  return {
    score,
    tierName: tier.name,
    tierIcon: tier.icon,
    display: `${tier.icon} ${score.toLocaleString()} pts`
  };
};

/**
 * Calculate points for specific activity
 */
export const getPointsForActivity = (activityType, streakDays = 0) => {
  const basePoints = ACTIVITY_POINTS[activityType] || 0;
  const multiplier = getStreakMultiplier(streakDays);
  return Math.round(basePoints * multiplier);
};
