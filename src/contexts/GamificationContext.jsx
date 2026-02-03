/**
 * GamificationContext
 * Provides shared gamification state across the entire app
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  getUserScore,
  getStreakData,
  getUserAchievements,
  getMonthlyGoals,
  getCompanyScores,
  getActivityHistory,
  logActivity,
  recalculateUserScore,
  checkAndUnlockAchievements,
  updateMonthlyGoals,
  toggleTargetCompany,
  syncMonthlyGoalsFromLeads
} from '../services/gamificationService';
import {
  getAllLeadStats,
  getTodayKey,
  storeActivityScoreForDay,
  updateHighScoreFromHistory,
  calculateWeekdayStreak,
  calculateLongestStreak,
  getActivityDatesFromLeads
} from '../services/leadStatsService';
import {
  ACHIEVEMENTS,
  getAchievementProgress,
  checkAchievementUnlocked
} from '../services/achievementService';
import {
  getTierForScore,
  getProgressToNextTier,
  getStreakMultiplier
} from '../utils/scoreCalculations';

const GamificationContext = createContext(null);

export const useGamificationContext = () => {
  const context = useContext(GamificationContext);
  // Return safe defaults if context is not available (e.g., before provider mounts)
  if (!context) {
    return {
      score: { totalScore: 0, activityScore: 0, activityHighScore: 0 },
      streak: { currentStreak: 0, longestStreak: 0, activityDates: [] },
      achievements: { unlockedAchievements: [], totalPoints: 0 },
      goals: { targets: {}, progress: {} },
      companyScores: [],
      activities: [],
      leadStats: { today: {}, month: {}, allTime: {} },
      loading: true,
      error: null,
      newAchievements: [],
      scoresSyncedFromLeads: false,
      tier: { name: 'Starter', icon: '🌱', minScore: 0 },
      tierProgress: { progress: 0, pointsNeeded: 100 },
      currentMultiplier: 1,
      goalsProgress: 0,
      targetCompanies: [],
      unlockedAchievementsList: [],
      lockedAchievements: [],
      achievementProgress: {},
      localStats: { totalContacts: 0, newThisWeek: 0, totalInteractions: 0, averageContactAge: 0 },
      logNetworkingActivity: async () => null,
      refreshScores: async () => {},
      setMonthlyGoals: async () => {},
      setTargetCompany: async () => {},
      clearNewAchievements: () => {},
      loadGamificationData: async () => {},
      syncGoalsFromLeads: async () => {},
      calculateScoresFromLeads: () => ({})
    };
  }
  return context;
};

export const GamificationProvider = ({ children }) => {
  const { currentUser } = useAuth();
  
  // State - with safe defaults
  const [score, setScore] = useState({ totalScore: 0, activityScore: 0, activityHighScore: 0, qualityScore: 0, relationshipScore: 0, consistencyScore: 0 });
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, lastActivityDate: null, activityDates: [] });
  const [achievements, setAchievements] = useState({ unlockedAchievements: [], totalPoints: 0 });
  const [goals, setGoals] = useState({ targets: {}, progress: {} });
  const [companyScores, setCompanyScores] = useState([]);
  const [activities, setActivities] = useState([]);
  const [leadStats, setLeadStats] = useState({ today: {}, month: {}, allTime: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);
  const [scoresSyncedFromLeads, setScoresSyncedFromLeads] = useState(false);

  // Load all gamification data
  const loadGamificationData = useCallback(async () => {
    if (!currentUser) {
      // Demo mode - set demo data
      const demoHighScore = parseInt(localStorage.getItem('activityHighScore_guest') || '0', 10);
      
      setScore({
        totalScore: 0,
        activityScore: 0,
        activityHighScore: demoHighScore,
        qualityScore: 0,
        relationshipScore: 0,
        consistencyScore: 0
      });
      
      // Demo mode activity dates
      const demoActivityDates = [];
      const today = new Date();
      let demoDate = new Date(today);
      let daysAdded = 0;
      while (daysAdded < 3) {
        const day = demoDate.getDay();
        if (day !== 0 && day !== 6) {
          demoActivityDates.unshift(`${demoDate.getFullYear()}-${String(demoDate.getMonth() + 1).padStart(2, '0')}-${String(demoDate.getDate()).padStart(2, '0')}`);
          daysAdded++;
        }
        demoDate.setDate(demoDate.getDate() - 1);
      }
      
      setStreak({
        currentStreak: 3,
        longestStreak: 7,
        lastActivityDate: new Date().toISOString(),
        activityDates: demoActivityDates
      });
      
      setGoals({
        targets: { coldEmails: 20, followUps: 15, responses: 10, calls: 10 },
        progress: { coldEmails: 5, followUps: 3, responses: 2, calls: 2 }
      });
      
      setLeadStats({
        today: { messagesSent: 0, followUps: 0, responses: 0, calls: 0, totalPoints: 0 },
        month: { messagesSent: 5, followUps: 3, responses: 2, calls: 2, totalPoints: 95 },
        allTime: { messagesSent: 20, followUps: 10, responses: 8, calls: 5, totalPoints: 350 }
      });
      
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const [scoreData, streakData, achievementsData, goalsData, companyData, activityData] = 
        await Promise.all([
          getUserScore(currentUser.uid),
          getStreakData(currentUser.uid),
          getUserAchievements(currentUser.uid),
          getMonthlyGoals(currentUser.uid),
          getCompanyScores(currentUser.uid),
          getActivityHistory(currentUser.uid, 30)
        ]);
      
      const storedHighScore = parseInt(localStorage.getItem(`activityHighScore_${currentUser.uid}`) || '0', 10);
      
      setScore({
        ...scoreData,
        activityHighScore: storedHighScore
      });
      setStreak(prev => ({
        ...streakData,
        activityDates: streakData.activityDates || prev.activityDates || []
      }));
      setAchievements(achievementsData);
      setGoals(goalsData);
      setCompanyScores(companyData);
      setActivities(activityData);
    } catch (err) {
      console.error('Error loading gamification data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Initial load
  useEffect(() => {
    loadGamificationData();
  }, [loadGamificationData]);

  // Sync goals from leads - THE KEY FUNCTION that syncs scores
  const syncGoalsFromLeads = useCallback(async (leads = [], customTargets = null) => {
    if (!currentUser) return;
    
    try {
      // Calculate lead stats for all periods
      const stats = getAllLeadStats(leads);
      setLeadStats(stats);
      
      // Store today's activity score in 7-day history
      const todayScore = stats.today.totalPoints;
      storeActivityScoreForDay(currentUser.uid, getTodayKey(), todayScore);
      
      // Get high score from 7-day rolling history
      const newHighScore = updateHighScoreFromHistory(
        currentUser.uid, 
        parseInt(localStorage.getItem(`activityHighScore_${currentUser.uid}`) || '0', 10)
      );
      
      // Calculate weekday streak from lead dates
      const currentStreak = calculateWeekdayStreak(leads);
      const longestStreak = calculateLongestStreak(leads);
      const activityDates = getActivityDatesFromLeads(leads);
      
      // Update streak state
      setStreak({
        currentStreak,
        longestStreak,
        lastActivityDate: activityDates.length > 0 ? activityDates[activityDates.length - 1] : null,
        activityDates
      });
      
      // Update score based on lead stats
      setScore(prev => ({
        ...prev,
        totalScore: stats.allTime.totalPoints,
        activityScore: todayScore,
        activityHighScore: newHighScore
      }));
      
      // Mark that scores have been synced from leads
      setScoresSyncedFromLeads(true);
      
      // Sync goals with lead data
      const updatedGoals = await syncMonthlyGoalsFromLeads(currentUser.uid, leads, customTargets);
      if (updatedGoals) {
        setGoals(updatedGoals);
      }
      return { goals: updatedGoals, stats, streak: { currentStreak, longestStreak } };
    } catch (err) {
      console.error('Error syncing goals from leads:', err);
      throw err;
    }
  }, [currentUser]);

  // Calculate scores from leads (local calculation without Firebase)
  const calculateScoresFromLeads = useCallback((leads = []) => {
    const stats = getAllLeadStats(leads);
    setLeadStats(stats);
    
    const userId = currentUser?.uid || 'guest';
    const todayScore = stats.today.totalPoints;
    
    storeActivityScoreForDay(userId, getTodayKey(), todayScore);
    const newHighScore = updateHighScoreFromHistory(
      userId,
      parseInt(localStorage.getItem(`activityHighScore_${userId}`) || '0', 10)
    );
    
    const currentStreak = calculateWeekdayStreak(leads);
    const longestStreak = calculateLongestStreak(leads);
    const activityDates = getActivityDatesFromLeads(leads);
    
    setStreak({
      currentStreak,
      longestStreak,
      lastActivityDate: activityDates.length > 0 ? activityDates[activityDates.length - 1] : null,
      activityDates
    });
    
    setScore(prev => ({
      ...prev,
      totalScore: stats.allTime.totalPoints,
      activityScore: todayScore,
      activityHighScore: newHighScore
    }));
    
    setScoresSyncedFromLeads(true);
    
    return stats;
  }, [currentUser]);

  // Log activity
  const logNetworkingActivity = useCallback(async (activityType, details = {}) => {
    if (!currentUser) return null;
    
    try {
      const activity = { type: activityType, ...details };
      const result = await logActivity(currentUser.uid, activity);
      
      const unlocked = await checkAndUnlockAchievements(currentUser.uid, []);
      if (unlocked.length > 0) {
        setNewAchievements(unlocked);
        const achievementsData = await getUserAchievements(currentUser.uid);
        setAchievements(achievementsData);
      }
      
      await loadGamificationData();
      
      return {
        activity: result,
        pointsEarned: result.points * getStreakMultiplier(streak?.currentStreak || 0),
        newAchievements: unlocked
      };
    } catch (err) {
      console.error('Error logging activity:', err);
      throw err;
    }
  }, [currentUser, streak, loadGamificationData]);

  // Recalculate scores manually
  const refreshScores = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      await recalculateUserScore(currentUser.uid, []);
      await loadGamificationData();
    } catch (err) {
      console.error('Error refreshing scores:', err);
    }
  }, [currentUser, loadGamificationData]);

  // Update monthly goals
  const setMonthlyGoals = useCallback(async (newGoals) => {
    if (!currentUser) return;
    
    try {
      await updateMonthlyGoals(currentUser.uid, newGoals);
      setGoals(prev => ({ ...prev, goals: newGoals }));
    } catch (err) {
      console.error('Error setting goals:', err);
      throw err;
    }
  }, [currentUser]);

  // Toggle target company
  const setTargetCompany = useCallback(async (companyName, isTarget) => {
    if (!currentUser) return;
    
    try {
      await toggleTargetCompany(currentUser.uid, companyName, isTarget);
      setCompanyScores(prev => prev.map(c => 
        c.companyName === companyName ? { ...c, isTargetCompany: isTarget } : c
      ));
    } catch (err) {
      console.error('Error toggling target company:', err);
    }
  }, [currentUser]);

  // Clear new achievements notification
  const clearNewAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  // Computed values
  const tier = useMemo(() => {
    return getTierForScore(score?.totalScore || 0);
  }, [score?.totalScore]);

  const tierProgress = useMemo(() => {
    return getProgressToNextTier(score?.totalScore || 0);
  }, [score?.totalScore]);

  const currentMultiplier = useMemo(() => {
    return getStreakMultiplier(streak?.currentStreak || 0);
  }, [streak?.currentStreak]);

  const goalsProgress = useMemo(() => {
    if (!goals?.targets || !goals?.progress) return 0;
    
    const targetKeys = Object.keys(goals.targets);
    if (targetKeys.length === 0) return 0;
    
    let totalProgress = 0;
    targetKeys.forEach(key => {
      const target = goals.targets[key] || 0;
      const progress = goals.progress[key] || 0;
      if (target > 0) {
        totalProgress += Math.min(progress / target, 1);
      }
    });
    
    return Math.round((totalProgress / targetKeys.length) * 100);
  }, [goals]);

  const targetCompanies = useMemo(() => {
    return companyScores.filter(c => c.isTargetCompany);
  }, [companyScores]);

  const unlockedAchievementsList = useMemo(() => {
    return Object.values(ACHIEVEMENTS).filter(a => 
      achievements?.unlockedAchievements?.includes(a.id)
    );
  }, [achievements]);

  const lockedAchievements = useMemo(() => {
    const unlockedIds = achievements?.unlockedAchievements || [];
    return Object.values(ACHIEVEMENTS).filter(a => !unlockedIds.includes(a.id));
  }, [achievements]);

  const localStats = useMemo(() => {
    return { totalContacts: 0, newThisWeek: 0, totalInteractions: 0, averageContactAge: 0 };
  }, []);

  const achievementProgress = useMemo(() => {
    // Calculate progress for each achievement
    return Object.values(ACHIEVEMENTS).reduce((acc, achievement) => {
      const progress = getAchievementProgress(achievement, localStats);
      acc[achievement.id] = progress;
      return acc;
    }, {});
  }, [localStats]);

  const value = {
    // State
    score,
    streak,
    achievements,
    goals,
    companyScores,
    activities,
    leadStats,
    loading,
    error,
    newAchievements,
    scoresSyncedFromLeads,
    
    // Computed
    tier,
    tierProgress,
    currentMultiplier,
    goalsProgress,
    targetCompanies,
    unlockedAchievementsList,
    lockedAchievements,
    achievementProgress,
    localStats,
    
    // Actions
    logNetworkingActivity,
    refreshScores,
    setMonthlyGoals,
    setTargetCompany,
    clearNewAchievements,
    loadGamificationData,
    syncGoalsFromLeads,
    calculateScoresFromLeads
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
};

export default GamificationContext;
