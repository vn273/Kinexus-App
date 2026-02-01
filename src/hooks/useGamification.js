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
  getGamificationSummary
} from '../services/gamificationService';
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
  const [score, setScore] = useState({ totalScore: 0, activityScore: 0, qualityScore: 0, relationshipScore: 0, consistencyScore: 0 });
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, lastActivityDate: null });
  const [achievements, setAchievements] = useState({ unlockedAchievements: [], totalPoints: 0 });
  const [goals, setGoals] = useState({ targets: {}, progress: {} });
  const [companyScores, setCompanyScores] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);

  // Load all gamification data
  const loadGamificationData = useCallback(async () => {
    if (!currentUser) {
      // Demo mode - set demo data based on contacts
      const totalContacts = contacts?.length || 0;
      
      setScore({
        totalScore: totalContacts * 10 + 15,
        activityScore: Math.min(totalContacts * 5, 200),
        qualityScore: 100,
        relationshipScore: Math.min(totalContacts * 8, 400),
        consistencyScore: 30
      });
      
      setStreak({
        currentStreak: 3,
        longestStreak: 7,
        lastActivityDate: new Date().toISOString()
      });
      
      setGoals({
        targets: {
          coldEmails: 20,
          followUps: 15,
          calls: 10,
          newContacts: 10,
          responseRate: 30,
          streak: 20,
          totalScore: 500
        },
        progress: {
          coldEmails: 5,
          followUps: 3,
          calls: 2,
          newContacts: Math.min(totalContacts, 10),
          responseRate: 25,
          streak: 3,
          totalScore: Math.min(totalContacts * 10 + 15, 500)
        }
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
      
      setScore(scoreData);
      setStreak(streakData);
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
    setTargetCompany,
    clearNewAchievements,
    reload: loadGamificationData,
    
    // Constants
    ACTIVITY_POINTS,
    ACHIEVEMENTS
  };
};

export default useGamification;
