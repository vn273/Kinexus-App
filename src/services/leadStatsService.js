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
 */
export const LEAD_POINTS = {
  messagesSent: 5,      // Each reach out
  followUps: 3,         // Each follow up needed
  responses: 15,        // Each response received
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
    // Messages sent = leads where reachedOut is true
    messagesSent: leads.filter(lead => {
      if (period === 'today') {
        return lead.reachedOut && isToday(toDate(lead.dateReachedOut));
      } else if (period === 'month') {
        return lead.reachedOut && isThisMonth(toDate(lead.dateReachedOut));
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
        return lead.response && isToday(toDate(lead.responseDate));
      } else if (period === 'month') {
        return lead.response && isThisMonth(toDate(lead.responseDate));
      }
      return lead.response;
    }).length,

    // Calls = leads where callScheduled is true
    calls: leads.filter(lead => {
      if (period === 'today') {
        return lead.callScheduled && isToday(toDate(lead.callDate));
      } else if (period === 'month') {
        return lead.callScheduled && isThisMonth(toDate(lead.callDate));
      }
      return lead.callScheduled;
    }).length,

    leadsCount: leads.length
  };

  // Calculate total points
  stats.totalPoints = 
    (stats.messagesSent * LEAD_POINTS.messagesSent) +
    (stats.followUps * LEAD_POINTS.followUps) +
    (stats.responses * LEAD_POINTS.responses) +
    (stats.calls * LEAD_POINTS.calls);

  return stats;
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
