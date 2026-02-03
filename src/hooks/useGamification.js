/**
 * useGamification Hook
 * Wrapper hook that uses the shared GamificationContext
 * This ensures all components share the same gamification state
 */

import { useGamificationContext } from '../contexts/GamificationContext';
import { ACTIVITY_POINTS } from '../utils/scoreCalculations';
import { ACHIEVEMENTS } from '../services/achievementService';
import { LEAD_POINTS } from '../services/leadStatsService';

const useGamification = () => {
  const context = useGamificationContext();
  
  // Return context with additional constants for backwards compatibility
  return {
    ...context,
    ACTIVITY_POINTS,
    ACHIEVEMENTS,
    LEAD_POINTS
  };
};

export default useGamification;

