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
 * Total Score = (reachedOut × 5) + (responses × 5) + (calls × 20)
 */
export const LEAD_POINTS = {
  messagesSent: 5,      // Each reach out
  responses: 5,         // Each response received
  calls: 20,            // Each call scheduled
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
        return total + followUpDates.filter(d => isToday(toDate(d))).length;
      } else if (period === 'month') {
        const followUpDates = lead.followUpDates || [];
        return total + followUpDates.filter(d => isThisMonth(toDate(d))).length;
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

  // Calculate total points (simple summation: messages + responses + calls)
  stats.totalPoints = 
    (stats.messagesSent * LEAD_POINTS.messagesSent) +
    (stats.responses * LEAD_POINTS.responses) +
    (stats.calls * LEAD_POINTS.calls);

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
 */
const calculateLeadStatus = (lead) => {
  if (lead.linkedContactId) return 'Converted to Contact';
  if (lead.callScheduled) return 'Call Scheduled';
  if (lead.response) return 'Pending Response';
  
  if (lead.reachedOut) {
    const contactDate = toDate(lead.dateReachedOut);
    if (contactDate) {
      const daysSinceContact = Math.floor((new Date() - contactDate) / (1000 * 60 * 60 * 24));
      if (daysSinceContact > 7) return 'Follow-up Needed';
    }
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
  return {
    today: calculateLeadStats(leads, 'today'),
    month: calculateLeadStats(leads, 'month'),
    allTime: calculateLeadStats(leads, 'all')
  };
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
 */
export const getActivityDatesFromLeads = (leads) => {
  const dates = new Set();
  const debugInfo = []; // Temporary debug logging
  
  leads.forEach(lead => {
    const leadName = `${lead.firstName} ${lead.lastName}`;
    
    // Check dateReachedOut
    if (lead.dateReachedOut) {
      const d = toDate(lead.dateReachedOut);
      if (d) {
        const key = getDateKey(d);
        dates.add(key);
        debugInfo.push(`${leadName} - dateReachedOut: ${lead.dateReachedOut} -> ${d.toString()} -> ${key}`);
      }
    }
    // Also check dateContacted (some leads use this field)
    if (lead.dateContacted) {
      const d = toDate(lead.dateContacted);
      if (d) {
        const key = getDateKey(d);
        dates.add(key);
        debugInfo.push(`${leadName} - dateContacted: ${lead.dateContacted} -> ${d.toString()} -> ${key}`);
      }
    }
    // Check responseDate
    if (lead.responseDate) {
      const d = toDate(lead.responseDate);
      if (d) {
        const key = getDateKey(d);
        dates.add(key);
        debugInfo.push(`${leadName} - responseDate: ${lead.responseDate} -> ${d.toString()} -> ${key}`);
      }
    }
    // Check callDate and followUpDate (call dates are sometimes stored as followUpDate)
    if (lead.callDate) {
      const d = toDate(lead.callDate);
      if (d) {
        const key = getDateKey(d);
        dates.add(key);
        debugInfo.push(`${leadName} - callDate: ${lead.callDate} -> ${d.toString()} -> ${key}`);
      }
    }
    if (lead.followUpDate) {
      const d = toDate(lead.followUpDate);
      if (d) {
        const key = getDateKey(d);
        dates.add(key);
        debugInfo.push(`${leadName} - followUpDate: ${lead.followUpDate} -> ${d.toString()} -> ${key}`);
      }
    }
    // Check follow-up dates array
    if (lead.followUpDates && Array.isArray(lead.followUpDates)) {
      lead.followUpDates.forEach(fuDate => {
        const d = toDate(fuDate);
        if (d) {
          const key = getDateKey(d);
          dates.add(key);
          debugInfo.push(`${leadName} - followUpDates[]: ${fuDate} -> ${d.toString()} -> ${key}`);
        }
      });
    }
    // Note: We intentionally do NOT include createdAt as an activity date
    // Only actual networking activities count: reach out, response, call, follow-up
    // The lead creation date without activity doesn't count toward streak
  });
  
  // Log debug info to console
  console.log('=== Activity Dates Debug ===');
  console.log('Today:', getTodayKey());
  debugInfo.forEach(info => console.log(info));
  console.log('Final activity dates:', Array.from(dates).sort());
  console.log('=== End Debug ===');
  
  return Array.from(dates).sort();
};

/**
 * Calculate streak from activity dates
 * Weekdays require activity to continue streak; weekends are free passes that don't break it
 * but only count toward streak if they have activity
 * 
 * Logic:
 * - Start from today, go backwards
 * - If weekday: must have activity to continue, otherwise streak breaks
 * - If weekend: doesn't break streak; adds +1 if there's activity on that weekend day
 */
export const calculateWeekdayStreak = (leads) => {
  const activityDates = new Set(getActivityDatesFromLeads(leads));
  
  let streak = 0;
  let currentDate = new Date();
  let checkedDays = 0;
  const maxDaysToCheck = 365; // Safety limit
  const debugSteps = []; // Debug logging
  
  while (checkedDays < maxDaysToCheck) {
    const dateKey = getDateKey(currentDate);
    const dayOfWeek = currentDate.getDay();
    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
    const hasActivity = activityDates.has(dateKey);
    
    if (!isWeekendDay) {
      // Weekday - must have activity to continue streak
      if (hasActivity) {
        streak++;
        debugSteps.push(`${dateKey} (${dayName}): HAS ACTIVITY -> streak = ${streak}`);
      } else {
        // No activity on weekday - streak breaks
        debugSteps.push(`${dateKey} (${dayName}): NO ACTIVITY -> BREAK`);
        break;
      }
    } else {
      // Weekend - free pass (doesn't break streak)
      // Count toward streak only if there's activity
      if (hasActivity) {
        streak++;
        debugSteps.push(`${dateKey} (${dayName}): WEEKEND WITH ACTIVITY -> streak = ${streak}`);
      } else {
        debugSteps.push(`${dateKey} (${dayName}): WEEKEND (free pass, no activity)`);
      }
    }
    
    // Move to previous day
    currentDate.setDate(currentDate.getDate() - 1);
    checkedDays++;
  }
  
  console.log('=== Streak Calculation Debug ===');
  debugSteps.forEach(step => console.log(step));
  console.log(`Final streak: ${streak}`);
  console.log('=== End Streak Debug ===');
  
  return streak;
};

/**
 * Get longest streak ever achieved
 * Weekdays require activity; weekends are free passes but count if they have activity
 */
export const calculateLongestStreak = (leads) => {
  const activityDates = new Set(getActivityDatesFromLeads(leads));
  if (activityDates.size === 0) return 0;
  
  const sortedDates = Array.from(activityDates).sort();
  const firstDate = new Date(sortedDates[0]);
  const lastDate = new Date(sortedDates[sortedDates.length - 1]);
  
  let longestStreak = 0;
  let currentStreak = 0;
  let currentDate = new Date(firstDate);
  
  while (currentDate <= lastDate) {
    const dateKey = getDateKey(currentDate);
    const isWeekendDay = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    const hasActivity = activityDates.has(dateKey);
    
    if (!isWeekendDay) {
      // Weekday
      if (hasActivity) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        // Weekday without activity breaks streak
        currentStreak = 0;
      }
    } else {
      // Weekend - free pass (doesn't break streak)
      // Count if there's activity
      if (hasActivity) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      }
      // No activity on weekend = free pass, streak continues
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return longestStreak;
};
