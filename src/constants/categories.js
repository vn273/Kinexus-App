// Relationship Types (Primary categorization - single select)
export const RELATIONSHIP_TYPES = [
  { value: 'high-school', label: 'High School' },
  { value: 'college-ucla', label: 'College (UCLA)' },
  { value: 'professional-worked', label: 'Professional - Worked Together' },
  { value: 'professional-networking', label: 'Professional - Networking' },
  { value: 'personal-friends', label: 'Personal Friends' },
  { value: 'family', label: 'Family' },
  { value: 'mentors-advisors', label: 'Mentors/Advisors' },
];

// Sectors/Industries (Secondary categorization - single select)
export const SECTORS = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance-ib', label: 'Finance - Investment Banking' },
  { value: 'finance-pe', label: 'Finance - Private Equity' },
  { value: 'finance-vc', label: 'Finance - Venture Capital' },
  { value: 'finance-hf', label: 'Finance - Hedge Funds' },
  { value: 'finance-am', label: 'Finance - Asset Management' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'energy', label: 'Energy' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'startups', label: 'Startups/Entrepreneurship' },
  { value: 'academia', label: 'Academia' },
  { value: 'government', label: 'Government/Policy' },
  { value: 'non-profit', label: 'Non-Profit' },
  { value: 'other', label: 'Other' },
];

// Helper to format a value string to proper label (e.g., 'personal-other' -> 'Personal Other')
export const formatValueToLabel = (value) => {
  if (!value) return 'Unknown';
  return value
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper functions
export const getRelationshipTypeLabel = (value, customTypes = []) => {
  // Check default types first
  const type = RELATIONSHIP_TYPES.find(t => t.value === value);
  if (type) return type.label;
  
  // Check custom types if provided
  if (customTypes.length > 0) {
    const customType = customTypes.find(t => t.value === value);
    if (customType) return customType.label;
  }
  
  // Format the value as a label (e.g., 'personal-other' -> 'Personal Other')
  return formatValueToLabel(value);
};

export const getSectorLabel = (value, customSectors = []) => {
  // Check default sectors first
  const sector = SECTORS.find(s => s.value === value);
  if (sector) return sector.label;
  
  // Check custom sectors if provided
  if (customSectors.length > 0) {
    const customSector = customSectors.find(s => s.value === value);
    if (customSector) return customSector.label;
  }
  
  // Format the value as a label
  return formatValueToLabel(value);
};

// Check if a sector is finance-related
export const isFinanceSector = (value) => {
  return value?.startsWith('finance-');
};

// Get all finance sectors
export const getFinanceSectors = () => {
  return SECTORS.filter(s => s.value.startsWith('finance-'));
};
