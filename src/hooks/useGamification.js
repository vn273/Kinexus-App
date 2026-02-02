/**
 * useGamification Hook
 * React hook for gamification data with real-time updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useContacts } from '../contexts/ContactContext';
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
  calculateLocalStats,
  getGamificationSummary,
  syncMonthlyGoalsFromLeads
} from '../services/gamificationService';
import {
  calculateLeadStats,
  getAllLeadStats,
  LEAD_POINTS,
  getTodayKey,
  storeActivityScoreForDay,
  getHighScoreFrom7DayHistory,
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
  getStreakMultiplier,
  ACTIVITY_POINTS
} from '../utils/scoreCalculations';

const useGamification = () => {
  const { currentUser } = useAuth();
  const { contacts } = useContacts();
  
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

  // Load all gamification data
  const loadGamificationData = useCallback(async () => {
    if (!currentUser) {
      // Demo mode - set demo data with 4-goal structure
      const totalContacts = contacts?.length || 0;
      const demoHighScore = parseInt(localStorage.getItem('activityHighScore_guest') || '0', 10);
      
      setScore({
        totalScore: totalContacts * 10 + 15,
        activityScore: Math.min(totalContacts * 5, 200),
        activityHighScore: Math.max(demoHighScore, Math.min(totalContacts * 5, 200)),
        qualityScore: 100,
        relationshipScore: Math.min(totalContacts * 8, 400),
        consistencyScore: 30
      });
      
      // Demo mode activity dates (last few weekdays)
      const demoActivityDates = [];
      const today = new Date();
      let demoDate = new Date(today);
      let daysAdded = 0;
      while (daysAdded < 3) {
        const day = demoDate.getDay();
        if (day !== 0 && day !== 6) { // Skip weekends
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
      
      // Demo mode with 4 goals only
      setGoals({
        targets: {
          coldEmails: 20,
          followUps: 15,
          responses: 10,
          calls: 10
        },
        progress: {
          coldEmails: 5,
          followUps: 3,
          responses: 2,
          calls: 2
        }
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
      
      // Load activity high score from localStorage
      const storedHighScore = parseInt(localStorage.getItem(`activityHighScore_${currentUser.uid}`) || '0', 10);
      
      setScore({
        ...scoreData,
        activityHighScore: storedHighScore
      });
      // Preserve activityDates if not in Firebase data (they come from leads)
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
  }, [currentUser, contacts]);

  // Initial load
  useEffect(() => {
    loadGamificationData();
  }, [loadGamificationData]);

  // Log an activity and update scores
  const logNetworkingActivity = useCallback(async (activityType, details = {}) => {
    if (!currentUser) return null;
    
    try {
      const activity = {
        type: activityType,
        ...details
      };
      
      const result = await logActivity(currentUser.uid, activity);
      
      // Check for newly unlocked achievements
      const unlocked = await checkAndUnlockAchievements(currentUser.uid, contacts);
      if (unlocked.length > 0) {
        setNewAchievements(unlocked);
        // Refresh achievements
        const achievementsData = await getUserAchievements(currentUser.uid);
        setAchievements(achievementsData);
      }
      
      // Refresh data
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
  }, [currentUser, contacts, streak, loadGamificationData]);

  // Recalculate scores manually
  const refreshScores = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      await recalculateUserScore(currentUser.uid, contacts);
      await loadGamificationData();
    } catch (err) {
      console.error('Error refreshing scores:', err);
    }
  }, [currentUser, contacts, loadGamificationData]);

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

  // Sync monthly goals from lead data and calculate scores
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
        activityDates // Store all activity dates for calendar
      });
      
      // Update score based on lead stats (simple summation)
      setScore(prev => ({
        ...prev,
        totalScore: stats.allTime.totalPoints,
        activityScore: todayScore,
        activityHighScore: newHighScore
      }));
      
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
    
    // Check high score (using a general key for non-logged-in users)
    const userId = currentUser?.uid || 'guest';
    const todayScore = stats.today.totalPoints;
    
    // Store in 7-day history
    storeActivityScoreForDay(userId, getTodayKey(), todayScore);
    const newHighScore = updateHighScoreFromHistory(
      userId,
      parseInt(localStorage.getItem(`activityHighScore_${userId}`) || '0', 10)
    );
    
    // Calculate weekday streak
    const currentStreak = calculateWeekdayStreak(leads);
    const longestStreak = calculateLongestStreak(leads);
    const activityDates = getActivityDatesFromLeads(leads);
    
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
    
    return stats;
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
  }, [score]);

  const tierProgress = useMemo(() => {
    return getProgressToNextTier(score?.totalScore || 0);
  }, [score]);

  const currentMultiplier = useMemo(() => {
    return getStreakMultiplier(streak?.currentStreak || 0);
  }, [streak]);

  const targetCompanies = useMemo(() => {
    return companyScores.filter(c => c.isTargetCompany).map(c => c.companyName);
  }, [companyScores]);

  const unlockedAchievementsList = useMemo(() => {
    return (achievements.unlockedAchievements || []).map(id => ACHIEVEMENTS[id]).filter(Boolean);
  }, [achievements]);

  const lockedAchievements = useMemo(() => {
    const unlockedIds = achievements.unlockedAchievements || [];
    return Object.values(ACHIEVEMENTS).filter(a => !unlockedIds.includes(a.id));
  }, [achievements]);

  const achievementProgress = useMemo(() => {
    const localStats = calculateLocalStats(contacts, []);
    return Object.values(ACHIEVEMENTS).reduce((acc, achievement) => {
      acc[achievement.id] = getAchievementProgress(achievement, localStats);
      return acc;
    }, {});
  }, [contacts]);

  const goalsProgress = useMemo(() => {
    if (!goals?.goals) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = Object.values(goals.goals).filter(g => g.completed).length;
    const total = Object.keys(goals.goals).length;
    
    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100)
    };
  }, [goals]);

  // Local stats for demo mode
  const localStats = useMemo(() => {
    return calculateLocalStats(contacts, []);
  }, [contacts]);

  return {
    // Data
    score,
    streak,
    achievements,
    goals,
    companyScores,
    targetCompanies,
    activities,
    newAchievements,
    leadStats,
    
    // Computed
    tier,
    tierProgress,
    currentMultiplier,
    unlockedAchievementsList,
    lockedAchievements,
    achievementProgress,
    goalsProgress,
    localStats,
    
    // State
    loading,
    error,
    
    // Actions
    logNetworkingActivity,
    refreshScores,
    setMonthlyGoals,
    syncGoalsFromLeads,
    calculateScoresFromLeads,
    setTargetCompany,
    clearNewAchievements,
    reload: loadGamificationData,
    
    // Constants
    ACTIVITY_POINTS,
    ACHIEVEMENTS,
    LEAD_POINTS
  };
};

export default useGamification;
