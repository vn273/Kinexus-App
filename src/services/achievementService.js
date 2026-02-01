/**
 * Achievement Service
 * Achievement definitions, unlock logic, and progress tracking
 */

// Achievement definitions
export const ACHIEVEMENTS = {
  // OUTREACH ACHIEVEMENTS
  first_contact: {
    id: 'first_contact',
    name: 'First Contact',
    description: 'Add your first contact',
    icon: '🎯',
    category: 'outreach',
    requirement: { type: 'contacts_added', count: 1 },
    points: 50
  },
  cold_email_warrior: {
    id: 'cold_email_warrior',
    name: 'Cold Email Warrior',
    description: 'Send 10 cold emails',
    icon: '📧',
    category: 'outreach',
    requirement: { type: 'cold_outreach', count: 10 },
    points: 100
  },
  outreach_machine: {
    id: 'outreach_machine',
    name: 'Outreach Machine',
    description: 'Send 50 cold emails',
    icon: '🚀',
    category: 'outreach',
    requirement: { type: 'cold_outreach', count: 50 },
    points: 250
  },
  century_club: {
    id: 'century_club',
    name: 'Century Club',
    description: 'Send 100 cold emails',
    icon: '💯',
    category: 'outreach',
    requirement: { type: 'cold_outreach', count: 100 },
    points: 500
  },
  on_fire: {
    id: 'on_fire',
    name: 'On Fire',
    description: '7-day networking streak',
    icon: '🔥',
    category: 'outreach',
    requirement: { type: 'streak_days', count: 7 },
    points: 150
  },
  unstoppable: {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: '30-day networking streak',
    icon: '⚡',
    category: 'outreach',
    requirement: { type: 'streak_days', count: 30 },
    points: 400
  },
  marathon_runner: {
    id: 'marathon_runner',
    name: 'Marathon Runner',
    description: '100-day networking streak',
    icon: '🏆',
    category: 'outreach',
    requirement: { type: 'streak_days', count: 100 },
    points: 1000
  },

  // QUALITY ACHIEVEMENTS
  first_response: {
    id: 'first_response',
    name: 'First Response',
    description: 'Get your first response to cold outreach',
    icon: '⭐',
    category: 'quality',
    requirement: { type: 'responses_received', count: 1 },
    points: 50
  },
  conversationalist: {
    id: 'conversationalist',
    name: 'Conversationalist',
    description: '50% response rate on 20+ messages',
    icon: '💬',
    category: 'quality',
    requirement: { type: 'response_rate', rate: 50, minMessages: 20 },
    points: 300
  },
  master_communicator: {
    id: 'master_communicator',
    name: 'Master Communicator',
    description: '70% response rate on 50+ messages',
    icon: '🎤',
    category: 'quality',
    requirement: { type: 'response_rate', rate: 70, minMessages: 50 },
    points: 500
  },
  call_closer: {
    id: 'call_closer',
    name: 'Call Closer',
    description: 'Schedule 10 calls',
    icon: '📞',
    category: 'quality',
    requirement: { type: 'calls_scheduled', count: 10 },
    points: 200
  },
  deal_maker: {
    id: 'deal_maker',
    name: 'Deal Maker',
    description: 'Schedule 25 calls',
    icon: '🤝',
    category: 'quality',
    requirement: { type: 'calls_scheduled', count: 25 },
    points: 400
  },
  executive_access: {
    id: 'executive_access',
    name: 'Executive Access',
    description: 'Connect with 5 Director+ level contacts',
    icon: '💼',
    category: 'quality',
    requirement: { type: 'senior_contacts', count: 5 },
    points: 350
  },

  // RELATIONSHIP ACHIEVEMENTS
  growing_network: {
    id: 'growing_network',
    name: 'Growing Network',
    description: 'Reach 25 contacts',
    icon: '🌱',
    category: 'relationship',
    requirement: { type: 'total_contacts', count: 25 },
    points: 100
  },
  established_network: {
    id: 'established_network',
    name: 'Established Network',
    description: 'Reach 50 contacts',
    icon: '🌳',
    category: 'relationship',
    requirement: { type: 'total_contacts', count: 50 },
    points: 200
  },
  vast_network: {
    id: 'vast_network',
    name: 'Vast Network',
    description: 'Reach 100 contacts',
    icon: '🌍',
    category: 'relationship',
    requirement: { type: 'total_contacts', count: 100 },
    points: 400
  },
  empire_builder: {
    id: 'empire_builder',
    name: 'Empire Builder',
    description: 'Reach 250 contacts',
    icon: '🏰',
    category: 'relationship',
    requirement: { type: 'total_contacts', count: 250 },
    points: 750
  },
  close_connections: {
    id: 'close_connections',
    name: 'Close Connections',
    description: 'Have 10 contacts with closeness 8+',
    icon: '❤️',
    category: 'relationship',
    requirement: { type: 'high_closeness_contacts', count: 10, minCloseness: 8 },
    points: 300
  },
  the_connector: {
    id: 'the_connector',
    name: 'The Connector',
    description: 'Introduce 5 pairs of contacts',
    icon: '👥',
    category: 'relationship',
    requirement: { type: 'introductions_made', count: 5 },
    points: 350
  },
  alumni_power: {
    id: 'alumni_power',
    name: 'Alumni Power',
    description: 'Connect with 20 college alumni',
    icon: '🎓',
    category: 'relationship',
    requirement: { type: 'alumni_contacts', count: 20 },
    points: 250
  },

  // COMPANY-SPECIFIC ACHIEVEMENTS
  company_insider: {
    id: 'company_insider',
    name: 'Company Insider',
    description: 'Score 75+ on any target company',
    icon: '🏢',
    category: 'company',
    requirement: { type: 'company_score', score: 75 },
    points: 400
  },
  bullseye: {
    id: 'bullseye',
    name: 'Bullseye',
    description: 'Score 90+ on a target company',
    icon: '🎯',
    category: 'company',
    requirement: { type: 'company_score', score: 90 },
    points: 600
  },
  multi_company_pro: {
    id: 'multi_company_pro',
    name: 'Multi-Company Pro',
    description: 'Score 60+ on 3 companies',
    icon: '🌟',
    category: 'company',
    requirement: { type: 'companies_at_score', count: 3, minScore: 60 },
    points: 500
  },
  elite_access: {
    id: 'elite_access',
    name: 'Elite Access',
    description: 'Have contacts at 10 different companies',
    icon: '💎',
    category: 'company',
    requirement: { type: 'unique_companies', count: 10 },
    points: 300
  },
  finance_network: {
    id: 'finance_network',
    name: 'Finance Network',
    description: '25 contacts in finance sector',
    icon: '🏦',
    category: 'company',
    requirement: { type: 'sector_contacts', sector: 'finance', count: 25 },
    points: 350
  },

  // CONSISTENCY ACHIEVEMENTS
  weekly_warrior: {
    id: 'weekly_warrior',
    name: 'Weekly Warrior',
    description: 'Network every week for a month',
    icon: '📅',
    category: 'consistency',
    requirement: { type: 'consecutive_weeks', count: 4 },
    points: 200
  },
  monthly_maestro: {
    id: 'monthly_maestro',
    name: 'Monthly Maestro',
    description: 'Network every month for 6 months',
    icon: '🗓️',
    category: 'consistency',
    requirement: { type: 'consecutive_months', count: 6 },
    points: 500
  },
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Log 10 morning networking sessions (before 10am)',
    icon: '⏰',
    category: 'consistency',
    requirement: { type: 'morning_sessions', count: 10 },
    points: 150
  },
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Log 10 evening sessions (after 8pm)',
    icon: '🌙',
    category: 'consistency',
    requirement: { type: 'evening_sessions', count: 10 },
    points: 150
  },

  // SPECIAL ACHIEVEMENTS
  global_citizen: {
    id: 'global_citizen',
    name: 'Global Citizen',
    description: 'Contacts in 5+ cities',
    icon: '🌎',
    category: 'special',
    requirement: { type: 'unique_cities', count: 5 },
    points: 250
  },
  value_creator: {
    id: 'value_creator',
    name: 'Value Creator',
    description: 'Average strategic value 7+ across network',
    icon: '📈',
    category: 'special',
    requirement: { type: 'avg_strategic_value', value: 7 },
    points: 400
  },
  follow_up_king: {
    id: 'follow_up_king',
    name: 'Follow-up King',
    description: '90% follow-up completion rate for 30 days',
    icon: '🔄',
    category: 'special',
    requirement: { type: 'follow_up_rate', rate: 90, days: 30 },
    points: 350
  },
  warm_intro_master: {
    id: 'warm_intro_master',
    name: 'Warm Intro Master',
    description: 'Get introduced to 10 contacts',
    icon: '💡',
    category: 'special',
    requirement: { type: 'intros_received', count: 10 },
    points: 300
  }
};

/**
 * Get all achievements
 */
export const getAllAchievements = () => {
  return Object.values(ACHIEVEMENTS);
};

/**
 * Get achievements by category
 */
export const getAchievementsByCategory = (category) => {
  return Object.values(ACHIEVEMENTS).filter(a => a.category === category);
};

/**
 * Get achievement categories
 */
export const ACHIEVEMENT_CATEGORIES = [
  { id: 'outreach', name: 'Outreach', icon: '📧' },
  { id: 'quality', name: 'Quality', icon: '⭐' },
  { id: 'relationship', name: 'Relationships', icon: '❤️' },
  { id: 'company', name: 'Companies', icon: '🏢' },
  { id: 'consistency', name: 'Consistency', icon: '📅' },
  { id: 'special', name: 'Special', icon: '🌟' }
];

/**
 * Check if achievement is unlocked based on stats
 */
export const checkAchievementUnlocked = (achievement, stats) => {
  const req = achievement.requirement;
  
  switch (req.type) {
    case 'contacts_added':
    case 'total_contacts':
      return (stats.totalContacts || 0) >= req.count;
      
    case 'cold_outreach':
      return (stats.coldOutreachSent || 0) >= req.count;
      
    case 'streak_days':
      return (stats.currentStreak || 0) >= req.count;
      
    case 'responses_received':
      return (stats.responsesReceived || 0) >= req.count;
      
    case 'response_rate':
      const messages = stats.coldOutreachSent || 0;
      const responses = stats.responsesReceived || 0;
      const rate = messages > 0 ? (responses / messages) * 100 : 0;
      return messages >= req.minMessages && rate >= req.rate;
      
    case 'calls_scheduled':
      return (stats.callsScheduled || 0) >= req.count;
      
    case 'senior_contacts':
      return (stats.seniorContacts || 0) >= req.count;
      
    case 'high_closeness_contacts':
      return (stats.highClosenessContacts || 0) >= req.count;
      
    case 'introductions_made':
      return (stats.introductionsMade || 0) >= req.count;
      
    case 'alumni_contacts':
      return (stats.alumniContacts || 0) >= req.count;
      
    case 'company_score':
      return (stats.maxCompanyScore || 0) >= req.score;
      
    case 'companies_at_score':
      return (stats.companiesAtScore?.[req.minScore] || 0) >= req.count;
      
    case 'unique_companies':
      return (stats.uniqueCompanies || 0) >= req.count;
      
    case 'sector_contacts':
      return (stats.sectorContacts?.[req.sector] || 0) >= req.count;
      
    case 'consecutive_weeks':
      return (stats.consecutiveWeeks || 0) >= req.count;
      
    case 'consecutive_months':
      return (stats.consecutiveMonths || 0) >= req.count;
      
    case 'morning_sessions':
      return (stats.morningSessions || 0) >= req.count;
      
    case 'evening_sessions':
      return (stats.eveningSessions || 0) >= req.count;
      
    case 'unique_cities':
      return (stats.uniqueCities || 0) >= req.count;
      
    case 'avg_strategic_value':
      return (stats.avgStrategicValue || 0) >= req.value;
      
    case 'follow_up_rate':
      return (stats.followUpRate || 0) >= req.rate && (stats.followUpDays || 0) >= req.days;
      
    case 'intros_received':
      return (stats.introsReceived || 0) >= req.count;
      
    default:
      return false;
  }
};

/**
 * Calculate progress towards achievement (0-100)
 */
export const getAchievementProgress = (achievement, stats) => {
  const req = achievement.requirement;
  let current = 0;
  let target = 1;
  
  switch (req.type) {
    case 'contacts_added':
    case 'total_contacts':
      current = stats.totalContacts || 0;
      target = req.count;
      break;
      
    case 'cold_outreach':
      current = stats.coldOutreachSent || 0;
      target = req.count;
      break;
      
    case 'streak_days':
      current = stats.currentStreak || 0;
      target = req.count;
      break;
      
    case 'responses_received':
      current = stats.responsesReceived || 0;
      target = req.count;
      break;
      
    case 'response_rate':
      const messages = stats.coldOutreachSent || 0;
      if (messages < req.minMessages) {
        current = messages;
        target = req.minMessages;
      } else {
        const rate = messages > 0 ? (stats.responsesReceived / messages) * 100 : 0;
        current = rate;
        target = req.rate;
      }
      break;
      
    case 'calls_scheduled':
      current = stats.callsScheduled || 0;
      target = req.count;
      break;
      
    case 'senior_contacts':
      current = stats.seniorContacts || 0;
      target = req.count;
      break;
      
    case 'high_closeness_contacts':
      current = stats.highClosenessContacts || 0;
      target = req.count;
      break;
      
    case 'company_score':
      current = stats.maxCompanyScore || 0;
      target = req.score;
      break;
      
    case 'unique_companies':
      current = stats.uniqueCompanies || 0;
      target = req.count;
      break;
      
    case 'unique_cities':
      current = stats.uniqueCities || 0;
      target = req.count;
      break;
      
    default:
      current = 0;
      target = 1;
  }
  
  return {
    current,
    target,
    percentage: Math.min(Math.round((current / target) * 100), 100)
  };
};

/**
 * Get recently unlocked achievements (for notifications)
 */
export const getNewlyUnlockedAchievements = (previousUnlocked, currentStats) => {
  const allAchievements = getAllAchievements();
  const newlyUnlocked = [];
  
  allAchievements.forEach(achievement => {
    if (!previousUnlocked.includes(achievement.id)) {
      if (checkAchievementUnlocked(achievement, currentStats)) {
        newlyUnlocked.push(achievement);
      }
    }
  });
  
  return newlyUnlocked;
};

/**
 * Get total achievement points earned
 */
export const getTotalAchievementPoints = (unlockedIds) => {
  return unlockedIds.reduce((total, id) => {
    const achievement = ACHIEVEMENTS[id];
    return total + (achievement?.points || 0);
  }, 0);
};
