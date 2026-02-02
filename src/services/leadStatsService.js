/**
 * Lead Statistics Service
 * Backend service to calculate totals from leads for different time periods
 */

// Helper to check if a date is today
const isToday = (dateValue) => {
  if (!dateValue) return false;
  const date = dateValue?.toDate?.() || new Date(dateValue);
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
  const date = dateValue?.toDate?.() || new Date(dateValue);
  const now = new Date();
  return date.getMonth() === now.getMonth() &&
         date.getFullYear() === now.getFullYear();
};

// Helper to safely convert date values
const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return null;
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

    // Messages sent = leads where reachedOut is true
    messagesSent: leads.filter(lead => {
      if (period === 'today') {
        // Count if reached out today OR if the lead was created today with reachedOut
        return lead.reachedOut && (isToday(toDate(lead.dateReachedOut)) || (isLeadCreatedToday(lead) && lead.reachedOut));
      } else if (period === 'month') {
        return lead.reachedOut && (isThisMonth(toDate(lead.dateReachedOut)) || (isLeadCreatedThisMonth(lead) && lead.reachedOut));
      }
      return lead.reachedOut;
    }).length,

    // Follow ups = leads with status 'Follow-up Needed'
    followUps: leads.filter(lead => {
      const status = lead.status || calculateLeadStatus(lead);
      return status === 'Follow-up Needed';
    }).length,

    // Responses = leads where response is true
    responses: leads.filter(lead => {
      if (period === 'today') {
        return lead.response && (isToday(toDate(lead.responseDate)) || isLeadCreatedToday(lead));
      } else if (period === 'month') {
        return lead.response && (isThisMonth(toDate(lead.responseDate)) || isLeadCreatedThisMonth(lead));
      }
      return lead.response;
    }).length,

    // Calls = leads where callScheduled is true AND call date is today
    calls: leads.filter(lead => {
      if (period === 'today') {
        // Call scheduled for today
        return lead.callScheduled && isToday(toDate(lead.callDate));
      } else if (period === 'month') {
        return lead.callScheduled && isThisMonth(toDate(lead.callDate));
      }
      return lead.callScheduled;
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
 */
export const updateHighScoreFromHistory = (userId, currentHighScore) => {
  const historyMax = getHighScoreFrom7DayHistory(userId);
  const newHighScore = Math.max(currentHighScore, historyMax);
  
  if (newHighScore > currentHighScore) {
    localStorage.setItem(`activityHighScore_${userId}`, String(newHighScore));
  }
  
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
 * Get all activity dates from leads (dateReachedOut, responseDate, callDate)
 */
export const getActivityDatesFromLeads = (leads) => {
  const dates = new Set();
  
  leads.forEach(lead => {
    if (lead.dateReachedOut) {
      const d = toDate(lead.dateReachedOut);
      if (d) dates.add(getDateKey(d));
    }
    if (lead.responseDate) {
      const d = toDate(lead.responseDate);
      if (d) dates.add(getDateKey(d));
    }
    if (lead.callDate) {
      const d = toDate(lead.callDate);
      if (d) dates.add(getDateKey(d));
    }
  });
  
  return Array.from(dates).sort();
};

/**
 * Calculate weekday-only streak from activity dates
 * Goes back from today until the last weekday with no activity
 */
export const calculateWeekdayStreak = (leads) => {
  const activityDates = new Set(getActivityDatesFromLeads(leads));
  
  let streak = 0;
  let currentDate = new Date();
  let checkedDays = 0;
  const maxDaysToCheck = 365; // Safety limit
  
  while (checkedDays < maxDaysToCheck) {
    const dateKey = getDateKey(currentDate);
    const dayOfWeek = currentDate.getDay();
    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (!isWeekendDay) {
      // It's a weekday - check if there was activity
      if (activityDates.has(dateKey)) {
        streak++;
      } else {
        // No activity on this weekday - streak breaks here
        break;
      }
    }
    // Skip weekends silently (don't break streak, don't count)
    
    // Move to previous day
    currentDate.setDate(currentDate.getDate() - 1);
    checkedDays++;
  }
  
  return streak;
};

/**
 * Get longest streak ever achieved (weekday-only)
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
    
    if (!isWeekendDay) {
      if (activityDates.has(dateKey)) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return longestStreak;
};
