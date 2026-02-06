/**
 * Network Insights Service - Statistics and analytics calculations
 */

import { RELATIONSHIP_TYPES, SECTORS, getRelationshipTypeLabel, getSectorLabel, formatValueToLabel } from '../constants/categories';
import { daysSinceContact } from '../utils/dateHelpers';

/**
 * Get basic network statistics
 */
export const getNetworkStats = (contacts) => {
  const totalContacts = contacts.length;
  
  // Calculate new contacts this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = contacts.filter(c => {
    const createdAt = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt);
    return createdAt >= startOfMonth;
  }).length;
  
  // Calculate percentage change
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const contactsAtEndOfLastMonth = contacts.filter(c => {
    const createdAt = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt);
    return createdAt <= endOfPreviousMonth;
  }).length;
  
  const percentChange = contactsAtEndOfLastMonth > 0 
    ? ((newThisMonth / contactsAtEndOfLastMonth) * 100).toFixed(1)
    : newThisMonth > 0 ? 100 : 0;
  
  return {
    totalContacts,
    newThisMonth,
    percentChange: `${percentChange >= 0 ? '+' : ''}${percentChange}%`
  };
};

/**
 * Get relationship type breakdown
 * @param {Array} contacts - Array of contacts
 * @param {Array} customTypes - Custom relationship types from settings (optional)
 */
export const getRelationshipBreakdown = (contacts, customTypes = []) => {
  const counts = {};
  
  contacts.forEach(contact => {
    // Handle both array and single value format
    const types = contact.relationshipTypes?.length > 0 
      ? contact.relationshipTypes 
      : (contact.relationshipType ? [contact.relationshipType] : ['unassigned']);
    
    types.forEach(type => {
      counts[type] = (counts[type] || 0) + 1;
    });
  });
  
  // Convert to array and sort by count
  const breakdown = Object.entries(counts)
    .map(([type, count]) => ({
      type,
      label: type === 'unassigned' ? 'Unassigned' : getRelationshipTypeLabel(type, customTypes),
      count,
      percentage: ((count / contacts.length) * 100).toFixed(0)
    }))
    .sort((a, b) => b.count - a.count);
  
  return breakdown;
};

/**
 * Get sector breakdown with finance sub-categories
 * @param {Array} contacts - Array of contacts
 * @param {Array} customSectors - Custom sectors from settings (optional)
 */
export const getSectorBreakdown = (contacts, customSectors = []) => {
  const counts = {};
  const financeSubcounts = {};
  
  contacts.forEach(contact => {
    const sector = contact.sector || 'unassigned';
    counts[sector] = (counts[sector] || 0) + 1;
    
    // Track finance sub-categories
    if (sector.startsWith('finance-')) {
      financeSubcounts[sector] = (financeSubcounts[sector] || 0) + 1;
    }
  });
  
  // Calculate total finance contacts
  const financeTotal = Object.values(financeSubcounts).reduce((sum, c) => sum + c, 0);
  
  // Group non-finance sectors
  const breakdown = Object.entries(counts)
    .filter(([sector]) => !sector.startsWith('finance-'))
    .map(([sector, count]) => ({
      sector,
      label: sector === 'unassigned' ? 'Unassigned' : getSectorLabel(sector, customSectors),
      count,
      percentage: ((count / contacts.length) * 100).toFixed(0),
      subCategories: null
    }));
  
  // Add finance as a grouped category
  if (financeTotal > 0) {
    const financeSubCategories = Object.entries(financeSubcounts)
      .map(([sector, count]) => ({
        sector,
        label: getSectorLabel(sector, customSectors).replace('Finance - ', ''),
        count
      }))
      .sort((a, b) => b.count - a.count);
    
    breakdown.unshift({
      sector: 'finance',
      label: 'Finance',
      count: financeTotal,
      percentage: ((financeTotal / contacts.length) * 100).toFixed(0),
      subCategories: financeSubCategories
    });
  }
  
  // Sort by count (but keep finance first if it exists)
  return breakdown.sort((a, b) => {
    if (a.sector === 'finance') return -1;
    if (b.sector === 'finance') return 1;
    return b.count - a.count;
  });
};

/**
 * Get interaction statistics
 */
export const getInteractionStats = (contacts) => {
  // Calculate average days since last contact
  const contactsWithDates = contacts.filter(c => c.lastContactDate);
  const totalDays = contactsWithDates.reduce((sum, c) => {
    const days = daysSinceContact(c.lastContactDate);
    return sum + (days || 0);
  }, 0);
  
  const avgDaysSinceContact = contactsWithDates.length > 0 
    ? Math.round(totalDays / contactsWithDates.length)
    : null;
  
  const avgMonths = avgDaysSinceContact !== null 
    ? (avgDaysSinceContact / 30).toFixed(1)
    : null;
  
  // Find contacts needing attention (overdue based on their regularity)
  // Exclude contacts marked as "alwaysGreen" (friends/family who stay green regardless)
  const needsAttention = contacts.filter(c => {
    // Skip contacts marked as always green - they never need attention
    if (c.alwaysGreen) return false;
    
    const days = daysSinceContact(c.lastContactDate);
    if (days === null) return true; // Never contacted
    
    const regularityDays = {
      '3-years': 1095,
      '1-year': 365,
      '6-months': 180,
      '3-months': 90,
      '1-month': 30,
      '2-weeks': 14,
      '1-week': 7,
      '3-days': 3,
      '1-day': 1
    };
    
    const threshold = regularityDays[c.contactRegularity] || 180;
    return days > threshold;
  }).length;
  
  // Find most active relationships (based on closeness and recent contact)
  const activeRelationships = contacts
    .filter(c => c.lastContactDate && c.relationshipCloseness)
    .sort((a, b) => {
      // Score based on closeness and recency
      const aScore = (a.relationshipCloseness || 5) - (daysSinceContact(a.lastContactDate) / 30);
      const bScore = (b.relationshipCloseness || 5) - (daysSinceContact(b.lastContactDate) / 30);
      return bScore - aScore;
    })
    .slice(0, 5);
  
  return {
    avgTimeSinceContact: avgMonths ? `${avgMonths} months` : 'N/A',
    avgDaysSinceContact,
    contactsNeedingAttention: needsAttention,
    mostActiveRelationships: activeRelationships,
    totalWithLastContact: contactsWithDates.length,
    totalNeverContacted: contacts.length - contactsWithDates.length
  };
};

/**
 * Get top companies in network
 */
export const getTopCompanies = (contacts, limit = 5) => {
  const counts = {};
  
  contacts.forEach(contact => {
    if (contact.company) {
      counts[contact.company] = (counts[contact.company] || 0) + 1;
    }
  });
  
  return Object.entries(counts)
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Get top locations in network
 */
export const getTopLocations = (contacts, limit = 5) => {
  const counts = {};
  
  contacts.forEach(contact => {
    if (contact.location) {
      counts[contact.location] = (counts[contact.location] || 0) + 1;
    }
  });
  
  return Object.entries(counts)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Get strategic value distribution
 */
export const getStrategicValueDistribution = (contacts) => {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  contacts.forEach(contact => {
    const value = contact.strategicValue || 3;
    distribution[value] = (distribution[value] || 0) + 1;
  });
  
  return Object.entries(distribution)
    .map(([value, count]) => ({
      value: parseInt(value),
      count,
      percentage: ((count / contacts.length) * 100).toFixed(0)
    }));
};

/**
 * Get relationship closeness distribution
 */
export const getClosenessDistribution = (contacts) => {
  const distribution = {};
  for (let i = 1; i <= 10; i++) {
    distribution[i] = 0;
  }
  
  contacts.forEach(contact => {
    const closeness = contact.relationshipCloseness || 5;
    distribution[closeness] = (distribution[closeness] || 0) + 1;
  });
  
  return Object.entries(distribution)
    .map(([closeness, count]) => ({
      closeness: parseInt(closeness),
      count,
      percentage: ((count / contacts.length) * 100).toFixed(0)
    }));
};

/**
 * Get comprehensive network insights
 * @param {Array} contacts - Array of contacts
 * @param {Object} customSettings - Custom types from settings (optional)
 * @param {Array} customSettings.relationshipTypes - Custom relationship types
 * @param {Array} customSettings.sectors - Custom sectors
 */
export const getNetworkInsights = (contacts, customSettings = {}) => {
  const { relationshipTypes = [], sectors = [] } = customSettings;
  return {
    stats: getNetworkStats(contacts),
    relationshipBreakdown: getRelationshipBreakdown(contacts, relationshipTypes),
    sectorBreakdown: getSectorBreakdown(contacts, sectors),
    interactionStats: getInteractionStats(contacts),
    topCompanies: getTopCompanies(contacts),
    topLocations: getTopLocations(contacts),
    strategicValueDistribution: getStrategicValueDistribution(contacts),
    closenessDistribution: getClosenessDistribution(contacts)
  };
};
