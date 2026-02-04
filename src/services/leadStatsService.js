/**
 * Lead Statistics Service
 * Backend service to calculate totals from leads for different time periods
 */

// Helper to safely convert date values - FIXED for timezone issues
const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string') {
    // If it's a date-only string (YYYY-MM-DD), parse as local time not UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }
    // For ISO strings with time (e.g., "2026-02-02T00:00:00.000Z"), extract date part
    // and parse as local time to avoid timezone shift issues
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    return new Date(value);
  }
  if (typeof value === 'number') return new Date(value);
  return null;
};

// Helper to check if a date is today
const isToday = (dateValue) => {
  if (!dateValue) return false;
  const date = toDate(dateValue);
  if (!date) return false;
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

// Helper to check if a date is in the future (after today)
const isFutureDate = (dateValue) => {
  if (!dateValue) return false;
  const date = toDate(dateValue);
  if (!date || isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate > today;
};

// Helper to check if a lead was created today (check createdAt field)
const isLeadCreatedToday = (lead) => {
  if (!lead.createdAt) return false;
  return isToday(lead.createdAt);
};

// Helper to check if a lead was created this month
const isLeadCreatedThisMonth = (lead) => {
  if (!lead.createdAt) return false;
  return isThisMonth(lead.createdAt);
};

// Helper to check if a date is in the current month
const isThisMonth = (dateValue) => {
  if (!dateValue) return false;
  const date = toDate(dateValue);
  if (!date) return false;
  const now = new Date();
  return date.getMonth() === now.getMonth() &&
         date.getFullYear() === now.getFullYear();
};

/**
 * Point values for each activity type
 * Total Score = (reachedOut × 5) + (responses × 5) + (calls × 20) + (followUps × 3)
 */
export const LEAD_POINTS = {
  messagesSent: 5,      // Each reach out
  responses: 5,         // Each response received
  calls: 20,            // Each call scheduled
  followUps: 3,         // Each follow-up recorded
};

/**
 * Calculate lead statistics for a given time period
 * @param {Array} leads - Array of lead objects
 * @param {string} period - 'today', 'month', or 'all'
 * @returns {Object} Statistics object
 */
export const calculateLeadStats = (leads, period = 'all') => {
  if (!leads || leads.length === 0) {
    return {
      messagesSent: 0,
      followUps: 0,
      responses: 0,
      calls: 0,
      totalPoints: 0,
      leadsCount: 0
    };
  }

  // Calculate statistics based on lead data
  const stats = {
    // New leads created in the period
    leadsCreated: leads.filter(lead => {
      if (period === 'today') {
        return isLeadCreatedToday(lead);
      } else if (period === 'month') {
        return isLeadCreatedThisMonth(lead);
      }
      return true;
    }).length,

    // Messages sent = leads where reachedOut is true AND (dateReachedOut matches period OR lead created in period)
    messagesSent: leads.filter(lead => {
      if (!lead.reachedOut) return false;
      if (period === 'today') {
        const reachedOutDate = toDate(lead.dateReachedOut);
        // Count if dateReachedOut is today OR lead was created today (and has reachedOut)
        return (reachedOutDate && isToday(reachedOutDate)) || isLeadCreatedToday(lead);
      } else if (period === 'month') {
        const reachedOutDate = toDate(lead.dateReachedOut);
        return (reachedOutDate && isThisMonth(reachedOutDate)) || isLeadCreatedThisMonth(lead);
      }
      return true; // all time
    }).length,

    // Follow ups = leads with followUpCount field (will add this)
    followUps: leads.reduce((total, lead) => {
      const followUpCount = lead.followUpCount || 0;
      if (period === 'today') {
        // Only count follow-ups recorded today (based on followUpDates array)
        const followUpDates = lead.followUpDates || [];
        return total + followUpDates.filter(fu => {
          // Handle { date, notes } object or just date value
          const fuDate = fu && typeof fu === 'object' && fu.date ? fu.date : fu;
          const parsed = toDate(fuDate);
          return parsed && isToday(parsed);
        }).length;
      } else if (period === 'month') {
        const followUpDates = lead.followUpDates || [];
        return total + followUpDates.filter(fu => {
          // Handle { date, notes } object or just date value
          const fuDate = fu && typeof fu === 'object' && fu.date ? fu.date : fu;
          const parsed = toDate(fuDate);
          return parsed && isThisMonth(parsed);
        }).length;
      }
      return total + followUpCount;
    }, 0),

    // Responses = leads where response is true AND (responseDate matches period OR lead created in period)
    responses: leads.filter(lead => {
      if (!lead.response) return false;
      if (period === 'today') {
        const respDate = toDate(lead.responseDate);
        // Count if responseDate is today OR lead was created today (and has response)
        return (respDate && isToday(respDate)) || isLeadCreatedToday(lead);
      } else if (period === 'month') {
        const respDate = toDate(lead.responseDate);
        return (respDate && isThisMonth(respDate)) || isLeadCreatedThisMonth(lead);
      }
      return true; // all time
    }).length,

    // Calls = leads where callScheduled is true AND callDate matches period
    calls: leads.filter(lead => {
      if (!lead.callScheduled) return false;
      if (period === 'today') {
        const callDt = toDate(lead.callDate);
        return callDt && isToday(callDt);
      } else if (period === 'month') {
        const callDt = toDate(lead.callDate);
        return callDt && isThisMonth(callDt);
      }
      return true; // all time
    }).length,

    leadsCount: leads.length
  };

  // Calculate total points (simple summation: messages + responses + calls + followUps)
  stats.totalPoints = 
    (stats.messagesSent * LEAD_POINTS.messagesSent) +
    (stats.responses * LEAD_POINTS.responses) +
    (stats.calls * LEAD_POINTS.calls) +
    (stats.followUps * LEAD_POINTS.followUps);

  return stats;
};

/**
 * Get today's activity score date key (for high score tracking)
 */
export const getTodayKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

/**
 * Get date key for a specific date
 */
export const getDateKey = (date) => {
  const d = toDate(date) || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Store activity score for a specific day in the 7-day rolling history
 */
export const storeActivityScoreForDay = (userId, dateKey, score) => {
  const storageKey = `activityHistory_${userId}`;
  const history = JSON.parse(localStorage.getItem(storageKey) || '{}');
  
  // Store the score for this day
  history[dateKey] = score;
  
  // Keep only last 7 days
  const sortedKeys = Object.keys(history).sort().reverse();
  const trimmedHistory = {};
  sortedKeys.slice(0, 7).forEach(key => {
    trimmedHistory[key] = history[key];
  });
  
  localStorage.setItem(storageKey, JSON.stringify(trimmedHistory));
  return trimmedHistory;
};

/**
 * Get the 7-day activity history
 */
export const getActivityHistory7Days = (userId) => {
  const storageKey = `activityHistory_${userId}`;
  return JSON.parse(localStorage.getItem(storageKey) || '{}');
};

/**
 * Calculate high score from the 7-day rolling history
 */
export const getHighScoreFrom7DayHistory = (userId) => {
  const history = getActivityHistory7Days(userId);
  const scores = Object.values(history);
  if (scores.length === 0) return 0;
  return Math.max(...scores);
};

/**
 * Update high score if any day in the 7-day history exceeds it
 * Also recalculates high score from current history (handles deletions)
 */
export const updateHighScoreFromHistory = (userId, currentHighScore) => {
  const historyMax = getHighScoreFrom7DayHistory(userId);
  // Always use the max from history - this handles deletions properly
  const newHighScore = historyMax;
  
  localStorage.setItem(`activityHighScore_${userId}`, String(newHighScore));
  
  return newHighScore;
};

/**
 * Recalculate and store today's score in history, then get new high score
 * Call this after any lead changes (add, edit, delete)
 */
export const recalculateTodaysScore = (userId, todayScore) => {
  const todayKey = getTodayKey();
  storeActivityScoreForDay(userId, todayKey, todayScore);
  
  // Recalculate high score from updated history
  const newHighScore = getHighScoreFrom7DayHistory(userId);
  localStorage.setItem(`activityHighScore_${userId}`, String(newHighScore));
  
  return newHighScore;
};

/**
 * Calculate lead status (used if not already set)
 * 
 * Status logic:
 * - Converted to Contact: has linkedContactId
 * - Call Scheduled: callScheduled is true
 * - Pending Response: 
 *     - reached out less than a week ago, OR
 *     - has a follow-up recorded less than a week ago, OR
 *     - has a response marked but no call scheduled yet
 * - Follow-up Needed: reached out over a week ago with no response AND no recent follow-up
 * - Not Contacted: hasn't been reached out to yet
 */
const calculateLeadStatus = (lead) => {
  if (lead.linkedContactId) return 'Converted to Contact';
  if (lead.callScheduled) return 'Call Scheduled';
  
  // If they have a response but no call scheduled, they're pending (waiting for call)
  if (lead.response) return 'Pending Response';
  
  if (lead.reachedOut) {
    const now = new Date();
    
    // Check if there's a recent follow-up (within last 7 days)
    let hasRecentFollowUp = false;
    if (lead.followUpDates && Array.isArray(lead.followUpDates) && lead.followUpDates.length > 0) {
      // Get the most recent follow-up date
      const mostRecentFollowUp = lead.followUpDates
        .map(fu => {
          if (!fu) return null;
          const fuDate = fu && typeof fu === 'object' && fu.date ? fu.date : fu;
          return toDate(fuDate);
        })
        .filter(d => d && !isNaN(d.getTime()))
        .sort((a, b) => b - a)[0]; // Sort descending, get most recent
      
      if (mostRecentFollowUp) {
        const daysSinceFollowUp = Math.floor((now - mostRecentFollowUp) / (1000 * 60 * 60 * 24));
        if (daysSinceFollowUp <= 7) {
          hasRecentFollowUp = true;
        }
      }
    }
    
    // Also check lastFollowUpDate field
    if (!hasRecentFollowUp && lead.lastFollowUpDate) {
      const lastFollowUp = toDate(lead.lastFollowUpDate);
      if (lastFollowUp && !isNaN(lastFollowUp.getTime())) {
        const daysSinceFollowUp = Math.floor((now - lastFollowUp) / (1000 * 60 * 60 * 24));
        if (daysSinceFollowUp <= 7) {
          hasRecentFollowUp = true;
        }
      }
    }
    
    // If there's a recent follow-up, they're pending response
    if (hasRecentFollowUp) {
      return 'Pending Response';
    }
    
    // Check how long since initial reach out
    const contactDate = toDate(lead.dateReachedOut);
    if (contactDate) {
      const daysSinceContact = Math.floor((now - contactDate) / (1000 * 60 * 60 * 24));
      // If reached out over a week ago with no response and no recent follow-up
      if (daysSinceContact > 7) return 'Follow-up Needed';
    }
    
    // Reached out within the last week
    return 'Pending Response';
  }
  
  return 'Not Contacted';
};

/**
 * Calculate total score from lead stats
 */
export const calculateTotalScoreFromStats = (stats) => {
  return stats.totalPoints;
};

/**
 * Calculate activity score (based on today's activity only)
 */
export const calculateActivityScoreFromLeads = (leads) => {
  const todayStats = calculateLeadStats(leads, 'today');
  return todayStats.totalPoints;
};

/**
 * Get comprehensive stats for all periods
 */
export const getAllLeadStats = (leads) => {
  try {
    const safeLeads = Array.isArray(leads) ? leads : [];
    return {
      today: calculateLeadStats(safeLeads, 'today'),
      month: calculateLeadStats(safeLeads, 'month'),
      allTime: calculateLeadStats(safeLeads, 'all')
    };
  } catch (err) {
    console.error('Error in getAllLeadStats:', err);
    return {
      today: { messagesSent: 0, followUps: 0, responses: 0, calls: 0, totalPoints: 0, leadsCount: 0 },
      month: { messagesSent: 0, followUps: 0, responses: 0, calls: 0, totalPoints: 0, leadsCount: 0 },
      allTime: { messagesSent: 0, followUps: 0, responses: 0, calls: 0, totalPoints: 0, leadsCount: 0 }
    };
  }
};

/**
 * Calculate response rate
 */
export const calculateResponseRate = (leads) => {
  const reachedOut = leads.filter(l => l.reachedOut).length;
  const responses = leads.filter(l => l.response).length;
  
  if (reachedOut === 0) return 0;
  return Math.round((responses / reachedOut) * 100);
};

/**
 * Check if a date is a weekend (Saturday = 6, Sunday = 0)
 */
export const isWeekend = (date) => {
  const d = toDate(date);
  if (!d) return false;
  const day = d.getDay();
  return day === 0 || day === 6;
};

/**
 * Get all activity dates from leads (dateReachedOut, dateContacted, responseDate, callDate, followUpDates)
 * This collects all dates where any activity happened on a lead
 * IMPORTANT: Only count dates where the activity actually occurred (check boolean flags)
 */
export const getActivityDatesFromLeads = (leads) => {
  try {
    if (!Array.isArray(leads)) return [];
    
    const dates = new Set();
    
    leads.forEach(lead => {
      if (!lead) return;
      
      // Only count dateReachedOut/dateContacted if reachedOut is true
      if (lead.reachedOut) {
        const reachOutDate = lead.dateReachedOut || lead.dateContacted;
        if (reachOutDate) {
          const d = toDate(reachOutDate);
          if (d && !isNaN(d.getTime())) dates.add(getDateKey(d));
        }
      }
      
      // Only count responseDate if response is true
      if (lead.response && lead.responseDate) {
        const d = toDate(lead.responseDate);
        if (d && !isNaN(d.getTime())) dates.add(getDateKey(d));
      }
      
      // Only count callDate if callScheduled is true
      if (lead.callScheduled && lead.callDate) {
        const d = toDate(lead.callDate);
        if (d && !isNaN(d.getTime())) dates.add(getDateKey(d));
      }
      
      // Check follow-up dates array (completed follow-ups) - these are always valid activities
      if (lead.followUpDates && Array.isArray(lead.followUpDates)) {
        lead.followUpDates.forEach(fu => {
          // Follow-up can be an object { date, notes } or just a date string - add null check
          if (!fu) return;
          const fuDate = fu && typeof fu === 'object' && fu.date ? fu.date : fu;
          const d = toDate(fuDate);
          if (d && !isNaN(d.getTime())) dates.add(getDateKey(d));
        });
      }
      // Note: We intentionally do NOT include createdAt as an activity date
      // Note: We do NOT include followUpDate (scheduled) or lastFollowUpDate (redundant with followUpDates array)
    });
    
    // Filter out future dates - only return dates up to and including today
    const todayKey = getDateKey(new Date());
    const filteredDates = Array.from(dates).filter(dateKey => dateKey <= todayKey);
    
    return filteredDates.sort();
  } catch (err) {
    console.error('Error in getActivityDatesFromLeads:', err);
    return [];
  }
};

/**
 * Calculate streak from activity dates
 * ONLY WEEKDAYS COUNT toward the streak.
 * Weekends are completely skipped - they don't break the streak and don't add to it.
 * 
 * Logic:
 * - Start checking from yesterday, go backwards through WEEKDAYS ONLY
 * - Skip all weekend days entirely
 * - If a weekday has activity (marked orange), add +1 to streak
 * - If a weekday has NO activity, streak breaks
 * - AFTER calculating past streak, check if TODAY should be added:
 *   - Today is ONLY added if today is a weekday AND today has activity logged (marked orange)
 *   - If today has no activity, today is NOT counted
 */
export const calculateWeekdayStreak = (leads) => {
  try {
    const activityDates = new Set(getActivityDatesFromLeads(leads));
    
    // First: Calculate streak from PAST days (yesterday and before)
    let streak = 0;
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 1); // Start from yesterday
    let checkedDays = 0;
    const maxDaysToCheck = 365; // Safety limit
    
    while (checkedDays < maxDaysToCheck) {
      const dateKey = getDateKey(currentDate);
      const dayOfWeek = currentDate.getDay();
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
      
      if (isWeekendDay) {
        // Skip weekends entirely - they don't affect streak
        currentDate.setDate(currentDate.getDate() - 1);
        checkedDays++;
        continue;
      }
      
      // It's a weekday - check for activity
      const hasActivity = activityDates.has(dateKey);
      
      if (hasActivity) {
        streak++;
      } else {
        // No activity on weekday - streak breaks
        break;
      }
      
      // Move to previous day
      currentDate.setDate(currentDate.getDate() - 1);
      checkedDays++;
    }
    
    // Second: Check if TODAY should be added to streak
    // Today is ONLY added if:
    // 1. Today is a weekday (not Saturday/Sunday)
    // 2. Today has activity logged (is marked orange on calendar)
    const today = new Date();
    const todayKey = getDateKey(today);
    const todayDayOfWeek = today.getDay();
    const todayIsWeekday = todayDayOfWeek !== 0 && todayDayOfWeek !== 6;
    const todayHasActivityLogged = activityDates.has(todayKey);
    
    if (todayIsWeekday && todayHasActivityLogged) {
      streak++;
    }
    
    return streak;
  } catch (err) {
    console.error('Error in calculateWeekdayStreak:', err);
    return 0;
  }
};

/**
 * Get longest streak ever achieved
 * Weekdays require activity; weekends are free passes but count if they have activity
 */
export const calculateLongestStreak = (leads) => {
  try {
    const activityDates = new Set(getActivityDatesFromLeads(leads));
    if (activityDates.size === 0) return 0;
    
    const sortedDates = Array.from(activityDates).sort();
    if (sortedDates.length === 0) return 0;
    
    // Parse dates safely - use our toDate helper to handle YYYY-MM-DD correctly
    const firstDateStr = sortedDates[0];
    const lastDateStr = sortedDates[sortedDates.length - 1];
    
    // Parse as local dates (YYYY-MM-DD format)
    const [fy, fm, fd] = firstDateStr.split('-').map(Number);
    const [ly, lm, ld] = lastDateStr.split('-').map(Number);
    
    const firstDate = new Date(fy, fm - 1, fd);
    const lastDate = new Date(ly, lm - 1, ld);
    
    // Validate dates
    if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) {
      console.warn('Invalid dates in calculateLongestStreak:', firstDateStr, lastDateStr);
      return 0;
    }
    
    let longestStreak = 0;
    let currentStreak = 0;
    let currentDate = new Date(firstDate);
    let iterations = 0;
    const maxIterations = 3650; // ~10 years safety limit
    
    while (currentDate <= lastDate && iterations < maxIterations) {
      const dateKey = getDateKey(currentDate);
      const isWeekendDay = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      
      if (isWeekendDay) {
        // Skip weekends entirely - they don't affect streak
        currentDate.setDate(currentDate.getDate() + 1);
        iterations++;
        continue;
      }
      
      // It's a weekday - check for activity
      const hasActivity = activityDates.has(dateKey);
      
      if (hasActivity) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        // Weekday without activity breaks streak
        currentStreak = 0;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
      iterations++;
    }
    
    return longestStreak;
  } catch (err) {
    console.error('Error in calculateLongestStreak:', err);
    return 0;
  }
};
/**
 * Get activity breakdown by date from leads
 * Returns an object with date keys and activity details for each date
 * This is used for calendar tooltips and calculating max daily points
 */
export const getActivityBreakdownByDate = (leads) => {
  try {
    if (!Array.isArray(leads)) return {};
    
    const breakdown = {};
    
    const addActivity = (dateKey, type) => {
      if (!dateKey) return;
      if (!breakdown[dateKey]) {
        breakdown[dateKey] = { 
          reachOuts: 0, 
          followUps: 0, 
          responses: 0, 
          calls: 0, 
          points: 0 
        };
      }
      breakdown[dateKey][type]++;
      
      // Calculate points based on type
      switch (type) {
        case 'reachOuts':
          breakdown[dateKey].points += LEAD_POINTS.messagesSent;
          break;
        case 'responses':
          breakdown[dateKey].points += LEAD_POINTS.responses;
          break;
        case 'calls':
          breakdown[dateKey].points += LEAD_POINTS.calls;
          break;
        case 'followUps':
          breakdown[dateKey].points += LEAD_POINTS.followUps;
          break;
      }
    };
    
    leads.forEach(lead => {
      if (!lead) return;
      
      // Check dateReachedOut/dateContacted for reach outs
      if (lead.reachedOut) {
        const reachOutDate = lead.dateReachedOut || lead.dateContacted;
        if (reachOutDate) {
          const d = toDate(reachOutDate);
          if (d && !isNaN(d.getTime())) addActivity(getDateKey(d), 'reachOuts');
        }
      }
      
      // Check responseDate
      if (lead.response && lead.responseDate) {
        const d = toDate(lead.responseDate);
        if (d && !isNaN(d.getTime())) addActivity(getDateKey(d), 'responses');
      }
      
      // Check callDate
      if (lead.callScheduled && lead.callDate) {
        const d = toDate(lead.callDate);
        if (d && !isNaN(d.getTime())) addActivity(getDateKey(d), 'calls');
      }
      
      // Check follow-up dates array (new feature)
      if (lead.followUpDates && Array.isArray(lead.followUpDates)) {
        lead.followUpDates.forEach(fu => {
          // Follow-up can be an object { date, notes } or just a date string - add null check
          if (!fu) return;
          const fuDate = fu && typeof fu === 'object' && fu.date ? fu.date : fu;
          const d = toDate(fuDate);
          if (d && !isNaN(d.getTime())) addActivity(getDateKey(d), 'followUps');
        });
      }
    });
    
    // Note: We intentionally keep future dates in breakdown for calendar display
    // Streak calculations filter dates separately
    return breakdown;
  } catch (err) {
    console.error('Error in getActivityBreakdownByDate:', err);
    return {};
  }
};

/**
 * Get max daily activity points from all activity dates (excluding future dates)
 * This is used for high score display
 */
export const getMaxDailyPoints = (leads) => {
  try {
    const breakdown = getActivityBreakdownByDate(leads);
    if (!breakdown || typeof breakdown !== 'object') return 0;
    
    // Only consider dates up to and including today for high score
    const todayKey = getDateKey(new Date());
    const pastDatePoints = Object.entries(breakdown)
      .filter(([dateKey]) => dateKey <= todayKey)
      .map(([, day]) => day?.points || 0);
    
    if (pastDatePoints.length === 0) return 0;
    return Math.max(...pastDatePoints);
  } catch (err) {
    console.error('Error in getMaxDailyPoints:', err);
    return 0;
  }
};