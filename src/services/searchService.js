import { RELATIONSHIP_TYPES, SECTORS, getRelationshipTypeLabel as getCategoryRelationshipLabel, getSectorLabel as getCategorySectorLabel } from '../constants/categories';

/**
 * Search contacts across multiple fields
 * @param {Array} contacts - Array of contact objects
 * @param {string} query - Search query string
 * @param {Object} filters - Filter options
 * @returns {Array} Filtered contacts
 */
export const searchContacts = (contacts, query, filters = {}) => {
  const {
    relationshipTypes = [], // Array of selected relationship type values (OR logic)
    sector = null,          // Single sector value (AND logic)
    company = null,         // Single company value (AND logic)
    location = null,        // Single location value (AND logic)
    customRelationshipTypes = [], // Custom relationship types from settings
    customSectors = [],     // Custom sectors from settings
  } = filters;

  // Local helpers that use custom types
  const getSectorLabelWithCustom = (value) => getCategorySectorLabel(value, customSectors);
  const getRelationshipLabelWithCustom = (value) => getCategoryRelationshipLabel(value, customRelationshipTypes);

  return contacts.filter(contact => {
    // Apply search query filter
    if (query && query.trim()) {
      const tokens = query.toLowerCase().trim().split(/\s+/);
      const matchesQuery = tokens.every(token => {
        return (
          contact.firstName?.toLowerCase().includes(token) ||
          contact.lastName?.toLowerCase().includes(token) ||
          `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(token) ||
          contact.jobTitle?.toLowerCase().includes(token) ||
          contact.role?.toLowerCase().includes(token) || // Legacy field
          contact.company?.toLowerCase().includes(token) ||
          contact.sector?.toLowerCase().includes(token) ||
          getSectorLabelWithCustom(contact.sector)?.toLowerCase().includes(token) ||
          contact.relationshipType?.toLowerCase().includes(token) ||
          getRelationshipLabelWithCustom(contact.relationshipType)?.toLowerCase().includes(token) ||
          contact.location?.toLowerCase().includes(token) ||
          contact.email?.toLowerCase().includes(token) ||
          contact.notes?.toLowerCase().includes(token) ||
          contact.tags?.some(tag => tag.toLowerCase().includes(token))
        );
      });
      if (!matchesQuery) return false;
    }

    // Apply relationship type filter (OR logic - match ANY selected type)
    if (relationshipTypes.length > 0) {
      // Handle both old single value and new array format
      const contactTypes = contact.relationshipTypes || 
        (contact.relationshipType ? [contact.relationshipType] : []);
      const hasMatchingType = relationshipTypes.some(t => contactTypes.includes(t));
      if (!hasMatchingType) {
        return false;
      }
    }

    // Apply sector filter (AND logic)
    if (sector) {
      // Handle "all finance" filter
      if (sector === 'finance-all') {
        if (!contact.sector?.startsWith('finance-')) {
          return false;
        }
      } else if (contact.sector !== sector) {
        return false;
      }
    }

    // Apply company filter (AND logic)
    if (company && contact.company !== company) {
      return false;
    }

    // Apply location filter (AND logic)
    if (location && contact.location !== location) {
      return false;
    }

    return true;
  });
};

/**
 * Get unique values from contacts for filter dropdowns
 */
export const getUniqueCompanies = (contacts) => {
  const companies = contacts
    .map(c => c.company)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();
  return companies;
};

export const getUniqueLocations = (contacts) => {
  const locations = contacts
    .map(c => c.location)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();
  return locations;
};

export const getUniqueTags = (contacts) => {
  const tags = contacts
    .flatMap(c => c.tags || [])
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();
  return tags;
};

/**
 * Get relationship type counts for sidebar
 */
export const getRelationshipTypeCounts = (contacts) => {
  const counts = {};
  RELATIONSHIP_TYPES.forEach(type => {
    // Handle both array and single value format
    counts[type.value] = contacts.filter(c => {
      const types = c.relationshipTypes || (c.relationshipType ? [c.relationshipType] : []);
      return types.includes(type.value);
    }).length;
  });
  // Count contacts without any relationship type
  counts['unassigned'] = contacts.filter(c => {
    const types = c.relationshipTypes || (c.relationshipType ? [c.relationshipType] : []);
    return types.length === 0;
  }).length;
  return counts;
};

/**
 * Get sector counts
 */
export const getSectorCounts = (contacts) => {
  const counts = {};
  SECTORS.forEach(sector => {
    counts[sector.value] = contacts.filter(c => c.sector === sector.value).length;
  });
  counts['unassigned'] = contacts.filter(c => !c.sector).length;
  return counts;
};

/**
 * Autocomplete suggestions for company names
 */
export const getCompanySuggestions = (contacts, query) => {
  if (!query || query.length < 2) return [];
  
  const companies = getUniqueCompanies(contacts);
  return companies
    .filter(company => company.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);
};

/**
 * Autocomplete suggestions for job titles
 */
export const getJobTitleSuggestions = (contacts, query) => {
  if (!query || query.length < 2) return [];
  
  const titles = contacts
    .map(c => c.jobTitle || c.role)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
  
  return titles
    .filter(title => title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);
};
