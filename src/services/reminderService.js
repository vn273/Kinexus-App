/**
 * Reminder Service - Follow-up reminder calculations and management
 */

// Reminder interval options
export const REMINDER_INTERVALS = [
  { value: '1_day', label: '1 day', days: 1 },
  { value: '3_days', label: '3 days', days: 3 },
  { value: '1_week', label: '1 week', days: 7 },
  { value: '2_weeks', label: '2 weeks', days: 14 },
  { value: '1_month', label: '1 month', days: 30 },
  { value: '3_months', label: '3 months', days: 90 },
  { value: '6_months', label: '6 months', days: 180 },
  { value: '1_year', label: '1 year', days: 365 },
  { value: 'never', label: 'Never', days: null }
];

// Default intervals
export const DEFAULT_CRM_INTERVAL = '6_months';
export const DEFAULT_NETWORKING_INTERVAL = '1_week';

/**
 * Get days for a given interval
 */
export const getIntervalDays = (interval) => {
  const option = REMINDER_INTERVALS.find(i => i.value === interval);
  return option?.days || null;
};

/**
 * Get label for a given interval
 */
export const getIntervalLabel = (interval) => {
  const option = REMINDER_INTERVALS.find(i => i.value === interval);
  return option?.label || interval;
};

/**
 * Calculate next reminder date based on last interaction and interval
 */
export const calculateNextReminder = (lastInteractionDate, interval) => {
  if (!lastInteractionDate || interval === 'never') {
    return null;
  }
  
  const days = getIntervalDays(interval);
  if (!days) return null;
  
  const lastDate = lastInteractionDate instanceof Date 
    ? lastInteractionDate 
    : new Date(lastInteractionDate);
  
  if (isNaN(lastDate.getTime())) return null;
  
  return new Date(lastDate.getTime() + days * 24 * 60 * 60 * 1000);
};

/**
 * Calculate days until reminder
 */
export const getDaysUntilReminder = (nextReminderDate) => {
  if (!nextReminderDate) return null;
  
  const reminderDate = nextReminderDate instanceof Date 
    ? nextReminderDate 
    : new Date(nextReminderDate);
  
  if (isNaN(reminderDate.getTime())) return null;
  
  const now = new Date();
  const diffTime = reminderDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get reminder status
 */
export const getReminderStatus = (nextReminderDate) => {
  const daysUntil = getDaysUntilReminder(nextReminderDate);
  
  if (daysUntil === null) return 'none';
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= 7) return 'due_soon';
  return 'upcoming';
};

/**
 * Get overdue reminders from contacts (excludes ignored reminders)
 */
export const getOverdueReminders = (contacts, excludeIgnored = true) => {
  const now = new Date();
  
  return contacts
    .filter(c => {
      if (!c.reminderEnabled && c.reminderEnabled !== undefined) return false;
      if (excludeIgnored && c.reminderIgnored) return false;
      
      const nextReminder = c.nextReminderDate 
        ? (c.nextReminderDate instanceof Date ? c.nextReminderDate : new Date(c.nextReminderDate))
        : calculateNextReminder(c.lastContactDate, c.reminderInterval || DEFAULT_CRM_INTERVAL);
      
      return nextReminder && nextReminder < now;
    })
    .map(c => ({
      ...c,
      nextReminderDate: c.nextReminderDate || calculateNextReminder(c.lastContactDate, c.reminderInterval || DEFAULT_CRM_INTERVAL),
      daysOverdue: Math.abs(getDaysUntilReminder(c.nextReminderDate || calculateNextReminder(c.lastContactDate, c.reminderInterval || DEFAULT_CRM_INTERVAL)))
    }))
    .sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));
};

/**
 * Get reminders due this week (excludes ignored reminders)
 */
export const getDueSoonReminders = (contacts, excludeIgnored = true) => {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return contacts
    .filter(c => {
      if (!c.reminderEnabled && c.reminderEnabled !== undefined) return false;
      if (excludeIgnored && c.reminderIgnored) return false;
      
      const nextReminder = c.nextReminderDate 
        ? (c.nextReminderDate instanceof Date ? c.nextReminderDate : new Date(c.nextReminderDate))
        : calculateNextReminder(c.lastContactDate, c.reminderInterval || DEFAULT_CRM_INTERVAL);
      
      return nextReminder && nextReminder >= now && nextReminder <= oneWeekFromNow;
    })
    .map(c => ({
      ...c,
      nextReminderDate: c.nextReminderDate || calculateNextReminder(c.lastContactDate, c.reminderInterval || DEFAULT_CRM_INTERVAL),
      daysUntil: getDaysUntilReminder(c.nextReminderDate || calculateNextReminder(c.lastContactDate, c.reminderInterval || DEFAULT_CRM_INTERVAL))
    }))
    .sort((a, b) => (a.daysUntil || 0) - (b.daysUntil || 0));
};

/**
 * Get all upcoming reminders (next 30 days) - excludes ignored reminders
 */
export const getUpcomingReminders = (contacts, excludeIgnored = true) => {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  return contacts
    .filter(c => {
      if (!c.reminderEnabled && c.reminderEnabled !== undefined) return false;
      if (excludeIgnored && c.reminderIgnored) return false;
      
      const nextReminder = c.nextReminderDate 
        ? (c.nextReminderDate instanceof Date ? c.nextReminderDate : new Date(c.nextReminderDate))
        : calculateNextReminder(c.lastContactDate, c.reminderInterval || DEFAULT_CRM_INTERVAL);
      
      return nextReminder && nextReminder >= now && nextReminder <= thirtyDaysFromNow;
    })
    .map(c => ({
      ...c,
      nextReminderDate: c.nextReminderDate || calculateNextReminder(c.lastContactDate, c.reminderInterval || DEFAULT_CRM_INTERVAL),
      daysUntil: getDaysUntilReminder(c.nextReminderDate || calculateNextReminder(c.lastContactDate, c.reminderInterval || DEFAULT_CRM_INTERVAL))
    }))
    .sort((a, b) => (a.daysUntil || 0) - (b.daysUntil || 0));
};

/**
 * Snooze reminder by adding days to current date
 */
export const snoozeReminder = (daysToSnooze) => {
  const now = new Date();
  return new Date(now.getTime() + daysToSnooze * 24 * 60 * 60 * 1000);
};

/**
 * Format reminder date for display
 */
export const formatReminderDate = (date) => {
  if (!date) return 'Not set';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';
  
  const now = new Date();
  const daysUntil = getDaysUntilReminder(d);
  
  if (daysUntil === null) return 'Not set';
  if (daysUntil < 0) return `${Math.abs(daysUntil)} days overdue`;
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  if (daysUntil <= 7) return `In ${daysUntil} days`;
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Get time since last contact in human-readable format
 */
export const getTimeSinceContact = (lastContactDate) => {
  if (!lastContactDate) return 'Never contacted';
  
  const d = lastContactDate instanceof Date ? lastContactDate : new Date(lastContactDate);
  if (isNaN(d.getTime())) return 'Unknown';
  
  const now = new Date();
  const diffTime = now.getTime() - d.getTime();
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

/**
 * Categorize reminders for dashboard widget
 */
export const categorizeReminders = (contacts) => {
  const overdue = getOverdueReminders(contacts);
  const dueSoon = getDueSoonReminders(contacts);
  const upcoming = getUpcomingReminders(contacts).filter(
    c => !dueSoon.some(ds => ds.id === c.id)
  );
  
  return {
    overdue,
    dueSoon,
    upcoming,
    totalCount: overdue.length + dueSoon.length
  };
};
