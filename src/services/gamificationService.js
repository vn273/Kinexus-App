/**
 * Gamification Service
 * Main service for calculating scores, tracking activities, and managing gamification data
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit,
  addDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import {
  calculateActivityScore,
  calculateQualityScore,
  calculateRelationshipScore,
  calculateConsistencyScore,
  calculateTotalScore,
  calculateCompanyScore,
  getCompanyPenetrationLevel,
  getTierForScore,
  getProgressToNextTier,
  ACTIVITY_POINTS,
  getStreakMultiplier
} from '../utils/scoreCalculations';
import {
  ACHIEVEMENTS,
  checkAchievementUnlocked,
  getAchievementProgress,
  getNewlyUnlockedAchievements
} from './achievementService';

// Collection names
const COLLECTIONS = {
  USER_SCORES: 'userScores',
  ACTIVITIES: 'networkingActivities',
  ACHIEVEMENTS: 'userAchievements',
  STREAKS: 'networkingStreaks',
  GOALS: 'monthlyGoals',
  COMPANY_SCORES: 'companyScores'
};

/**
 * Log a networking activity
 */
export const logActivity = async (userId, activity) => {
  const activityData = {
    userId,
    type: activity.type,
    points: ACTIVITY_POINTS[activity.type] || 0,
    contactId: activity.contactId || null,
    company: activity.company || null,
    notes: activity.notes || '',
    timestamp: serverTimestamp(),
    date: new Date().toISOString().split('T')[0],
    hour: new Date().getHours()
  };
  
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.ACTIVITIES), activityData);
    
    // Update streak
    await updateStreak(userId);
    
    // Recalculate scores
    await recalculateUserScore(userId);
    
    // Check for new achievements
    await checkAndUnlockAchievements(userId);
    
    return { id: docRef.id, ...activityData };
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
};

/**
 * Get user's activity history
 */
export const getActivityHistory = async (userId, days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  try {
    const q = query(
      collection(db, COLLECTIONS.ACTIVITIES),
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting activity history:', error);
    return [];
  }
};

/**
 * Get activities from the last 24 hours (for rolling activity score)
 */
export const getRecentActivities24h = async (userId) => {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  
  try {
    const q = query(
      collection(db, COLLECTIONS.ACTIVITIES),
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(twentyFourHoursAgo)),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
    }));
  } catch (error) {
    console.error('Error getting 24h activities:', error);
    return [];
  }
};

/**
 * Get or create user score document
 */
export const getUserScore = async (userId) => {
  try {
    const docRef = doc(db, COLLECTIONS.USER_SCORES, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    
    // Initialize new user score
    const initialScore = {
      userId,
      totalScore: 0,
      activityScore: 0,
      qualityScore: 0,
      relationshipScore: 0,
      consistencyScore: 0,
      tier: 'Beginner Networker',
      tierIcon: '🌱',
      lastCalculated: serverTimestamp(),
      createdAt: serverTimestamp()
    };
    
    await setDoc(docRef, initialScore);
    return initialScore;
  } catch (error) {
    console.error('Error getting user score:', error);
    return null;
  }
};

/**
 * Get user's streak data
 */
export const getStreakData = async (userId) => {
  try {
    const docRef = doc(db, COLLECTIONS.STREAKS, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    
    // Initialize new streak
    const initialStreak = {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      freezesUsed: 0,
      freezeMonth: null,
      streakHistory: [],
      weeksActiveInLast12: 0,
      consecutiveWeeks: 0,
      consecutiveMonths: 0
    };
    
    await setDoc(docRef, initialStreak);
    return initialStreak;
  } catch (error) {
    console.error('Error getting streak data:', error);
    return null;
  }
};

/**
 * Update user's streak
 */
export const updateStreak = async (userId) => {
  try {
    const streakRef = doc(db, COLLECTIONS.STREAKS, userId);
    const streakDoc = await getDoc(streakRef);
    const today = new Date().toISOString().split('T')[0];
    
    let streakData = streakDoc.exists() ? streakDoc.data() : {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      freezesUsed: 0,
      freezeMonth: null,
      streakHistory: []
    };
    
    const lastDate = streakData.lastActivityDate;
    
    if (lastDate === today) {
      // Already logged activity today
      return streakData;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastDate === yesterdayStr) {
      // Consecutive day - extend streak
      streakData.currentStreak += 1;
    } else if (lastDate) {
      // Check if we can use a freeze
      const currentMonth = new Date().toISOString().slice(0, 7);
      const daysSinceLastActivity = Math.floor(
        (new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastActivity === 2 && 
          streakData.freezeMonth !== currentMonth && 
          streakData.freezesUsed < 1) {
        // Use freeze to save streak
        streakData.freezesUsed = 1;
        streakData.freezeMonth = currentMonth;
        streakData.currentStreak += 1;
      } else {
        // Streak broken
        streakData.currentStreak = 1;
      }
    } else {
      // First activity
      streakData.currentStreak = 1;
    }
    
    // Update longest streak if needed
    if (streakData.currentStreak > streakData.longestStreak) {
      streakData.longestStreak = streakData.currentStreak;
    }
    
    // Update last activity date
    streakData.lastActivityDate = today;
    
    // Add to streak history (keep last 90 days)
    streakData.streakHistory = streakData.streakHistory || [];
    streakData.streakHistory.push({ date: today, streak: streakData.currentStreak });
    if (streakData.streakHistory.length > 90) {
      streakData.streakHistory = streakData.streakHistory.slice(-90);
    }
    
    // Calculate weeks active in last 12 weeks
    const weeksActive = calculateWeeksActive(streakData.streakHistory);
    streakData.weeksActiveInLast12 = weeksActive;
    
    await setDoc(streakRef, streakData);
    return streakData;
  } catch (error) {
    console.error('Error updating streak:', error);
    throw error;
  }
};

/**
 * Calculate weeks active in last 12 weeks
 */
const calculateWeeksActive = (streakHistory) => {
  const now = new Date();
  const weekSet = new Set();
  
  streakHistory.forEach(entry => {
    const entryDate = new Date(entry.date);
    const weekDiff = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24 * 7));
    if (weekDiff < 12) {
      weekSet.add(weekDiff);
    }
  });
  
  return weekSet.size;
};

/**
 * Recalculate full user score
 */
export const recalculateUserScore = async (userId, contacts = [], leads = []) => {
  try {
    // Get activity data - 30 days for quality/consistency metrics
    const activitiesMonth = await getActivityHistory(userId, 30);
    // Get 24-hour activities for rolling activity score
    const activities24h = await getRecentActivities24h(userId);
    const streakData = await getStreakData(userId);
    
    // Calculate activity score from LAST 24 HOURS only (rolling window)
    const activityScore = calculateActivityScore(activities24h, streakData?.currentStreak || 0);
    
    // Calculate quality metrics from monthly activities (for overall quality tracking)
    const outreachSent = activitiesMonth.filter(a => a.type === 'cold_outreach' || a.type === 'message_sent').length;
    const responses = activitiesMonth.filter(a => a.type === 'response_received').length;
    const callsScheduled = activitiesMonth.filter(a => a.type === 'call_scheduled' || a.type === 'coffee_chat').length;
    const strategicContacts = contacts.filter(c => (c.strategicValue || 3) >= 8).length;
    
    const qualityScore = calculateQualityScore({
      outreachSent,
      responses,
      callsScheduled,
      strategicContacts,
      introductionsReceived: 0 // TODO: Track this
    });
    
    // Calculate relationship score
    const relationshipScore = calculateRelationshipScore(contacts);
    
    // Calculate consistency score
    const consistencyScore = calculateConsistencyScore({
      currentStreak: streakData?.currentStreak || 0,
      weeksActiveInLast12: streakData?.weeksActiveInLast12 || 0,
      monthlyVariance: 0.3 // TODO: Calculate actual variance
    });
    
    // Calculate total
    const totalScore = calculateTotalScore(activityScore, qualityScore, relationshipScore, consistencyScore);
    const tier = getTierForScore(totalScore);
    
    // Update user score document
    const scoreData = {
      userId,
      totalScore,
      activityScore,
      qualityScore,
      relationshipScore,
      consistencyScore,
      tier: tier.name,
      tierIcon: tier.icon,
      lastCalculated: serverTimestamp(),
      // Additional stats for display
      monthlyStats: {
        outreachSent,
        responses,
        callsScheduled,
        responseRate: outreachSent > 0 ? Math.round((responses / outreachSent) * 100) : 0,
        newContacts: activitiesMonth.filter(a => a.type === 'contact_added' || a.type === 'lead_added').length
      },
      // 24-hour activity stats for quick reference
      last24hStats: {
        activitiesCount: activities24h.length,
        pointsEarned: activities24h.reduce((sum, a) => sum + (a.points || 0), 0)
      },
      streakData: {
        currentStreak: streakData?.currentStreak || 0,
        longestStreak: streakData?.longestStreak || 0
      }
    };
    
    await setDoc(doc(db, COLLECTIONS.USER_SCORES, userId), scoreData, { merge: true });
    
    return scoreData;
  } catch (error) {
    console.error('Error recalculating user score:', error);
    throw error;
  }
};

/**
 * Calculate and save company score
 */
export const calculateAndSaveCompanyScore = async (userId, companyName, contacts, activities) => {
  const companyContacts = contacts.filter(c => 
    c.company?.toLowerCase() === companyName.toLowerCase()
  );
  
  const companyActivities = activities.filter(a => 
    a.company?.toLowerCase() === companyName.toLowerCase()
  );
  
  // Calculate metrics
  const outreachSent = companyActivities.filter(a => a.type === 'cold_outreach').length;
  const responses = companyActivities.filter(a => a.type === 'response_received').length;
  const callsScheduled = companyActivities.filter(a => 
    a.type === 'call_scheduled' || a.type === 'coffee_chat'
  ).length;
  
  // Seniority breakdown (based on job title keywords)
  const seniorKeywords = ['director', 'managing', 'partner', 'chief', 'head', 'vp', 'vice president', 'principal'];
  const midKeywords = ['senior', 'associate', 'manager'];
  
  const seniorContacts = companyContacts.filter(c => 
    seniorKeywords.some(k => c.jobTitle?.toLowerCase().includes(k))
  ).length;
  
  const midLevelContacts = companyContacts.filter(c => 
    midKeywords.some(k => c.jobTitle?.toLowerCase().includes(k)) &&
    !seniorKeywords.some(k => c.jobTitle?.toLowerCase().includes(k))
  ).length;
  
  const juniorContacts = companyContacts.length - seniorContacts - midLevelContacts;
  
  // Calculate averages
  const avgCloseness = companyContacts.length > 0
    ? companyContacts.reduce((sum, c) => sum + (c.relationshipCloseness || 5), 0) / companyContacts.length
    : 0;
    
  const avgStrategicValue = companyContacts.length > 0
    ? companyContacts.reduce((sum, c) => sum + (c.strategicValue || 3), 0) / companyContacts.length
    : 0;
  
  const responseRate = outreachSent > 0 ? responses / outreachSent : 0;
  
  // Calculate company score
  const companyData = {
    contactsAtCompany: companyContacts.length,
    responseRate,
    callsScheduled,
    seniorContacts,
    avgCloseness,
    avgStrategicValue
  };
  
  const score = calculateCompanyScore(companyData);
  const penetration = getCompanyPenetrationLevel(score);
  
  const companyScoreData = {
    userId,
    companyName,
    isTargetCompany: false, // User can toggle this
    contactsAtCompany: companyContacts.length,
    outreachSent,
    responses,
    callsScheduled,
    responseRate: Math.round(responseRate * 100),
    seniorContacts,
    midLevelContacts,
    juniorContacts,
    avgCloseness: Math.round(avgCloseness * 10) / 10,
    avgStrategicValue: Math.round(avgStrategicValue * 10) / 10,
    companyScore: score,
    penetrationLevel: penetration.level,
    penetrationStars: penetration.stars,
    lastUpdated: serverTimestamp()
  };
  
  // Save to Firestore
  const docId = `${userId}_${companyName.toLowerCase().replace(/\s+/g, '_')}`;
  await setDoc(doc(db, COLLECTIONS.COMPANY_SCORES, docId), companyScoreData, { merge: true });
  
  return companyScoreData;
};

/**
 * Get all company scores for a user
 */
export const getCompanyScores = async (userId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.COMPANY_SCORES),
      where('userId', '==', userId),
      orderBy('companyScore', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting company scores:', error);
    return [];
  }
};

/**
 * Toggle company as target company
 */
export const toggleTargetCompany = async (userId, companyName, isTarget) => {
  const docId = `${userId}_${companyName.toLowerCase().replace(/\s+/g, '_')}`;
  await updateDoc(doc(db, COLLECTIONS.COMPANY_SCORES, docId), {
    isTargetCompany: isTarget
  });
};

/**
 * Get user's achievements
 */
export const getUserAchievements = async (userId) => {
  try {
    const docRef = doc(db, COLLECTIONS.ACHIEVEMENTS, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    
    // Initialize achievements
    const initialData = {
      userId,
      unlockedAchievements: [],
      totalPoints: 0,
      lastChecked: serverTimestamp()
    };
    
    await setDoc(docRef, initialData);
    return initialData;
  } catch (error) {
    console.error('Error getting achievements:', error);
    return { unlockedAchievements: [], totalPoints: 0 };
  }
};

/**
 * Check and unlock new achievements
 */
export const checkAndUnlockAchievements = async (userId, contacts = [], stats = {}) => {
  try {
    const achievementsDoc = await getUserAchievements(userId);
    const unlockedIds = achievementsDoc.unlockedAchievements || [];
    
    // Build stats object from various sources
    const activityHistory = await getActivityHistory(userId, 365); // Full year
    const streakData = await getStreakData(userId);
    const companyScores = await getCompanyScores(userId);
    
    const fullStats = {
      ...stats,
      totalContacts: contacts.length,
      coldOutreachSent: activityHistory.filter(a => a.type === 'cold_outreach').length,
      responsesReceived: activityHistory.filter(a => a.type === 'response_received').length,
      callsScheduled: activityHistory.filter(a => 
        a.type === 'call_scheduled' || a.type === 'coffee_chat'
      ).length,
      currentStreak: streakData?.currentStreak || 0,
      seniorContacts: contacts.filter(c => {
        const title = c.jobTitle?.toLowerCase() || '';
        return ['director', 'managing', 'partner', 'chief', 'vp', 'principal'].some(k => title.includes(k));
      }).length,
      highClosenessContacts: contacts.filter(c => (c.relationshipCloseness || 5) >= 8).length,
      uniqueCompanies: [...new Set(contacts.map(c => c.company).filter(Boolean))].length,
      uniqueCities: [...new Set(contacts.map(c => c.location).filter(Boolean))].length,
      maxCompanyScore: companyScores.length > 0 
        ? Math.max(...companyScores.map(c => c.companyScore))
        : 0,
      alumniContacts: contacts.filter(c => 
        c.relationshipTypes?.some(t => t.includes('college') || t.includes('alumni'))
      ).length,
      morningSessions: activityHistory.filter(a => a.hour < 10).length,
      eveningSessions: activityHistory.filter(a => a.hour >= 20).length,
      consecutiveWeeks: streakData?.consecutiveWeeks || 0,
      avgStrategicValue: contacts.length > 0
        ? contacts.reduce((sum, c) => sum + (c.strategicValue || 3), 0) / contacts.length
        : 0
    };
    
    // Check each achievement
    const newlyUnlocked = [];
    
    Object.values(ACHIEVEMENTS).forEach(achievement => {
      if (!unlockedIds.includes(achievement.id)) {
        if (checkAchievementUnlocked(achievement, fullStats)) {
          newlyUnlocked.push(achievement);
        }
      }
    });
    
    // Save newly unlocked achievements
    if (newlyUnlocked.length > 0) {
      const newIds = newlyUnlocked.map(a => a.id);
      const allUnlocked = [...unlockedIds, ...newIds];
      const totalPoints = allUnlocked.reduce((sum, id) => {
        return sum + (ACHIEVEMENTS[id]?.points || 0);
      }, 0);
      
      await updateDoc(doc(db, COLLECTIONS.ACHIEVEMENTS, userId), {
        unlockedAchievements: allUnlocked,
        totalPoints,
        lastChecked: serverTimestamp(),
        lastUnlocked: newIds,
        lastUnlockedAt: serverTimestamp()
      });
    }
    
    return newlyUnlocked;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
};

/**
 * Get or create monthly goals
 */
export const getMonthlyGoals = async (userId, month = null) => {
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const docId = `${userId}_${targetMonth}`;
  
  try {
    const docRef = doc(db, COLLECTIONS.GOALS, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    
    // Default goals - only 4 core metrics
    const defaultGoals = {
      userId,
      month: targetMonth,
      goals: {
        coldEmails: { target: 20, current: 0, completed: false },
        followUps: { target: 15, current: 0, completed: false },
        responses: { target: 10, current: 0, completed: false },
        calls: { target: 10, current: 0, completed: false }
      },
      goalsCompleted: 0,
      totalGoals: 4,
      createdAt: serverTimestamp()
    };
    
    await setDoc(docRef, defaultGoals);
    return defaultGoals;
  } catch (error) {
    console.error('Error getting monthly goals:', error);
    return null;
  }
};

/**
 * Update monthly goals
 */
export const updateMonthlyGoals = async (userId, goals) => {
  const targetMonth = new Date().toISOString().slice(0, 7);
  const docId = `${userId}_${targetMonth}`;
  
  try {
    await setDoc(doc(db, COLLECTIONS.GOALS, docId), {
      userId,
      month: targetMonth,
      goals,
      goalsCompleted: Object.values(goals).filter(g => g.completed).length,
      totalGoals: Object.keys(goals).length,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating monthly goals:', error);
    throw error;
  }
};

/**
 * Update goal progress
 */
export const updateGoalProgress = async (userId, goalKey, current) => {
  const targetMonth = new Date().toISOString().slice(0, 7);
  const docId = `${userId}_${targetMonth}`;
  
  try {
    const docRef = doc(db, COLLECTIONS.GOALS, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const goal = data.goals[goalKey];
      
      if (goal) {
        goal.current = current;
        goal.completed = current >= goal.target;
        
        data.goals[goalKey] = goal;
        data.goalsCompleted = Object.values(data.goals).filter(g => g.completed).length;
        
        await updateDoc(docRef, {
          goals: data.goals,
          goalsCompleted: data.goalsCompleted
        });
      }
    }
  } catch (error) {
    console.error('Error updating goal progress:', error);
  }
};

/**
 * Sync monthly goals with actual lead data
 * Auto-calculates current progress from leads while preserving user-set targets
 */
export const syncMonthlyGoalsFromLeads = async (userId, leads = [], customTargets = null) => {
  const targetMonth = new Date().toISOString().slice(0, 7);
  const docId = `${userId}_${targetMonth}`;
  
  // Filter leads created or updated this month
  const currentMonthStart = new Date(targetMonth + '-01');
  const nextMonth = new Date(currentMonthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  // Helper to check if a date is in current month
  const isThisMonth = (dateValue) => {
    if (!dateValue) return false;
    const date = dateValue?.toDate?.() || new Date(dateValue);
    return date >= currentMonthStart && date < nextMonth;
  };
  
  // Count activities from leads this month
  const messagesThisMonth = leads.filter(l => l.reachedOut && isThisMonth(l.dateReachedOut)).length;
  const responsesThisMonth = leads.filter(l => l.response && isThisMonth(l.responseDate)).length;
  const callsThisMonth = leads.filter(l => l.callScheduled && isThisMonth(l.callDate)).length;
  const followUpsThisMonth = leads.filter(l => l.status === 'Follow-up Needed').length;
  
  try {
    const docRef = doc(db, COLLECTIONS.GOALS, docId);
    const docSnap = await getDoc(docRef);
    
    let goalData;
    if (docSnap.exists()) {
      goalData = docSnap.data();
    } else {
      // Create default goals if not exists
      goalData = await getMonthlyGoals(userId);
    }
    
    if (goalData && goalData.goals) {
      // Apply custom targets if provided (from settings)
      if (customTargets) {
        if (customTargets.coldEmails !== undefined && goalData.goals.coldEmails) {
          goalData.goals.coldEmails.target = customTargets.coldEmails;
        }
        if (customTargets.followUps !== undefined && goalData.goals.followUps) {
          goalData.goals.followUps.target = customTargets.followUps;
        }
        if (customTargets.responses !== undefined && goalData.goals.responses) {
          goalData.goals.responses.target = customTargets.responses;
        }
        if (customTargets.calls !== undefined && goalData.goals.calls) {
          goalData.goals.calls.target = customTargets.calls;
        }
      }
      
      // Update current values from lead data
      if (goalData.goals.coldEmails) {
        goalData.goals.coldEmails.current = messagesThisMonth;
        goalData.goals.coldEmails.completed = messagesThisMonth >= goalData.goals.coldEmails.target;
      }
      if (goalData.goals.followUps) {
        goalData.goals.followUps.current = followUpsThisMonth;
        goalData.goals.followUps.completed = followUpsThisMonth >= goalData.goals.followUps.target;
      }
      if (goalData.goals.responses) {
        goalData.goals.responses.current = responsesThisMonth;
        goalData.goals.responses.completed = responsesThisMonth >= goalData.goals.responses.target;
      }
      if (goalData.goals.calls) {
        goalData.goals.calls.current = callsThisMonth;
        goalData.goals.calls.completed = callsThisMonth >= goalData.goals.calls.target;
      }
      
      // Recalculate goals completed
      goalData.goalsCompleted = Object.values(goalData.goals).filter(g => g.completed).length;
      goalData.totalGoals = 4;
      
      await setDoc(docRef, {
        ...goalData,
        lastSynced: serverTimestamp()
      }, { merge: true });
      
      return goalData;
    }
    
    return null;
  } catch (error) {
    console.error('Error syncing monthly goals from leads:', error);
    return null;
  }
};

/**
 * Get gamification stats summary
 */
export const getGamificationSummary = async (userId, contacts = []) => {
  const [score, streak, achievements, goals, companyScores] = await Promise.all([
    getUserScore(userId),
    getStreakData(userId),
    getUserAchievements(userId),
    getMonthlyGoals(userId),
    getCompanyScores(userId)
  ]);
  
  const activities = await getActivityHistory(userId, 30);
  
  return {
    score,
    streak,
    achievements: {
      ...achievements,
      total: Object.keys(ACHIEVEMENTS).length
    },
    goals,
    companyScores: companyScores.filter(c => c.isTargetCompany).slice(0, 5),
    recentActivities: activities.slice(0, 10),
    tierProgress: getProgressToNextTier(score?.totalScore || 0)
  };
};

/**
 * Calculate stats for local/demo mode
 */
export const calculateLocalStats = (contacts, leads, activities = []) => {
  // For demo/guest mode without Firebase
  const totalContacts = contacts.length;
  const coldOutreachSent = leads.filter(l => l.reachedOut).length;
  const responses = leads.filter(l => l.status === 'Pending Response' || l.status === 'Call Scheduled').length;
  const callsScheduled = leads.filter(l => l.status === 'Call Scheduled').length;
  const converted = leads.filter(l => l.status === 'Converted to Contact').length;
  
  const uniqueCompanies = [...new Set(contacts.map(c => c.company).filter(Boolean))].length;
  const uniqueCities = [...new Set(contacts.map(c => c.location).filter(Boolean))].length;
  
  const avgCloseness = contacts.length > 0
    ? contacts.reduce((sum, c) => sum + (c.relationshipCloseness || 5), 0) / contacts.length
    : 5;
    
  const avgStrategicValue = contacts.length > 0
    ? contacts.reduce((sum, c) => sum + (c.strategicValue || 3), 0) / contacts.length
    : 3;
  
  return {
    totalContacts,
    coldOutreachSent,
    responsesReceived: responses,
    callsScheduled,
    leadsConverted: converted,
    uniqueCompanies,
    uniqueCities,
    avgCloseness: Math.round(avgCloseness * 10) / 10,
    avgStrategicValue: Math.round(avgStrategicValue * 10) / 10,
    responseRate: coldOutreachSent > 0 ? Math.round((responses / coldOutreachSent) * 100) : 0
  };
};
