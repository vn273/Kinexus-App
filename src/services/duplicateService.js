/**
 * Duplicate Detection Service
 * Handles detection of potential duplicates for contacts and networking leads
 */

// Normalize string for comparison
const normalizeString = (str) => {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
};

// Calculate name similarity using Levenshtein distance
const levenshteinDistance = (str1, str2) => {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
};

// Calculate name similarity percentage
const nameSimilarity = (name1, name2) => {
  const n1 = normalizeString(name1);
  const n2 = normalizeString(name2);
  
  if (n1 === n2) return 100;
  if (!n1 || !n2) return 0;
  
  const maxLen = Math.max(n1.length, n2.length);
  const distance = levenshteinDistance(n1, n2);
  return Math.round(((maxLen - distance) / maxLen) * 100);
};

// Extract domain from email
const getEmailDomain = (email) => {
  if (!email) return '';
  const parts = email.split('@');
  return parts.length > 1 ? parts[1].toLowerCase() : '';
};

// Normalize LinkedIn URL for comparison
const normalizeLinkedInUrl = (url) => {
  if (!url) return '';
  // Extract the profile identifier from various LinkedIn URL formats
  const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
  return match ? match[1].toLowerCase() : normalizeString(url);
};

/**
 * Match types and their severity
 */
export const MATCH_TYPES = {
  EXACT_EMAIL: { type: 'exact_email', severity: 'block', label: 'Exact email match' },
  EXACT_LINKEDIN: { type: 'exact_linkedin', severity: 'block', label: 'Exact LinkedIn URL match' },
  EXACT_NAME: { type: 'exact_name', severity: 'warn', label: 'Exact name match' },
  SIMILAR_NAME: { type: 'similar_name', severity: 'warn', label: 'Similar name' },
  SAME_COMPANY_TITLE: { type: 'same_company_title', severity: 'warn', label: 'Same company and title' },
  SAME_PHONE: { type: 'same_phone', severity: 'warn', label: 'Same phone number' },
};

/**
 * Find duplicates for a new entry against existing entries
 * @param {Object} newEntry - The new contact or lead to check
 * @param {Array} existingEntries - Array of existing contacts or leads
 * @param {Object} options - Options for duplicate checking
 * @returns {Object} { hasDuplicates, hasBlockingDuplicates, duplicates: [...] }
 */
export const findDuplicates = (newEntry, existingEntries, options = {}) => {
  const {
    nameThreshold = 85, // Similarity percentage to consider a match
    checkEmail = true,
    checkLinkedIn = true,
    checkName = true,
    checkCompanyTitle = true,
    checkPhone = true,
  } = options;

  const duplicates = [];
  
  // Get the full name of the new entry
  const newFullName = `${newEntry.firstName || ''} ${newEntry.lastName || ''}`.trim();
  const newEmail = normalizeString(newEntry.email);
  const newLinkedIn = normalizeLinkedInUrl(newEntry.linkedInUrl);
  const newCompany = normalizeString(newEntry.company || newEntry.firm);
  const newTitle = normalizeString(newEntry.jobTitle || newEntry.role || newEntry.title);
  const newPhone = normalizeString(newEntry.phone)?.replace(/\D/g, ''); // Remove non-digits

  for (const existing of existingEntries) {
    const matchReasons = [];
    let highestSeverity = 'warn';

    const existingFullName = `${existing.firstName || ''} ${existing.lastName || ''}`.trim();
    const existingEmail = normalizeString(existing.email);
    const existingLinkedIn = normalizeLinkedInUrl(existing.linkedInUrl);
    const existingCompany = normalizeString(existing.company || existing.firm);
    const existingTitle = normalizeString(existing.jobTitle || existing.role || existing.title);
    const existingPhone = normalizeString(existing.phone)?.replace(/\D/g, '');

    // Check exact email match (BLOCKING)
    if (checkEmail && newEmail && existingEmail && newEmail === existingEmail) {
      matchReasons.push(MATCH_TYPES.EXACT_EMAIL);
      highestSeverity = 'block';
    }

    // Check exact LinkedIn match (BLOCKING)
    if (checkLinkedIn && newLinkedIn && existingLinkedIn && newLinkedIn === existingLinkedIn) {
      matchReasons.push(MATCH_TYPES.EXACT_LINKEDIN);
      highestSeverity = 'block';
    }

    // Check name similarity (WARNING)
    if (checkName && newFullName && existingFullName) {
      const similarity = nameSimilarity(newFullName, existingFullName);
      
      if (similarity === 100) {
        matchReasons.push(MATCH_TYPES.EXACT_NAME);
      } else if (similarity >= nameThreshold) {
        matchReasons.push({
          ...MATCH_TYPES.SIMILAR_NAME,
          label: `Similar name (${similarity}% match)`
        });
      }
    }

    // Check same company AND title (WARNING)
    if (checkCompanyTitle && newCompany && existingCompany && newTitle && existingTitle) {
      if (newCompany === existingCompany && newTitle === existingTitle) {
        matchReasons.push(MATCH_TYPES.SAME_COMPANY_TITLE);
      }
    }

    // Check phone number (WARNING)
    if (checkPhone && newPhone && existingPhone && newPhone.length >= 7) {
      // Match if last 10 digits are the same
      const newPhoneLast10 = newPhone.slice(-10);
      const existingPhoneLast10 = existingPhone.slice(-10);
      if (newPhoneLast10 === existingPhoneLast10) {
        matchReasons.push(MATCH_TYPES.SAME_PHONE);
      }
    }

    // If we found any matches, add to duplicates
    if (matchReasons.length > 0) {
      duplicates.push({
        existing,
        matchReasons,
        severity: highestSeverity,
        isBlocking: highestSeverity === 'block'
      });
    }
  }

  // Sort duplicates: blocking first, then by number of match reasons
  duplicates.sort((a, b) => {
    if (a.isBlocking !== b.isBlocking) {
      return a.isBlocking ? -1 : 1;
    }
    return b.matchReasons.length - a.matchReasons.length;
  });

  return {
    hasDuplicates: duplicates.length > 0,
    hasBlockingDuplicates: duplicates.some(d => d.isBlocking),
    duplicates
  };
};

/**
 * Check for duplicates in a batch of entries (for CSV import)
 * @param {Array} newEntries - Array of new entries to check
 * @param {Array} existingEntries - Array of existing entries
 * @returns {Object} { clean: [...], duplicates: [...], blocked: [...] }
 */
export const findBatchDuplicates = (newEntries, existingEntries, options = {}) => {
  const results = {
    clean: [],      // Entries with no duplicates
    warnings: [],   // Entries with non-blocking duplicates (name similarity)
    blocked: []     // Entries with blocking duplicates (email/LinkedIn)
  };

  // Also check within the new entries themselves
  const processedNewEntries = [];

  for (const entry of newEntries) {
    // Check against existing entries
    const existingResult = findDuplicates(entry, existingEntries, options);
    
    // Check against already processed new entries
    const newResult = findDuplicates(entry, processedNewEntries, options);
    
    // Combine results
    const allDuplicates = [...existingResult.duplicates, ...newResult.duplicates];
    const hasBlockingDuplicates = existingResult.hasBlockingDuplicates || newResult.hasBlockingDuplicates;

    if (hasBlockingDuplicates) {
      results.blocked.push({
        entry,
        duplicates: allDuplicates.filter(d => d.isBlocking),
        reason: allDuplicates.find(d => d.isBlocking)?.matchReasons[0]?.label || 'Exact match found'
      });
    } else if (allDuplicates.length > 0) {
      results.warnings.push({
        entry,
        duplicates: allDuplicates
      });
    } else {
      results.clean.push(entry);
    }

    processedNewEntries.push(entry);
  }

  return results;
};

/**
 * Format duplicate info for display
 */
export const formatDuplicateInfo = (duplicate) => {
  const { existing, matchReasons } = duplicate;
  const name = `${existing.firstName || ''} ${existing.lastName || ''}`.trim();
  const company = existing.company || existing.firm || '';
  const title = existing.jobTitle || existing.role || existing.title || '';
  
  return {
    name,
    subtitle: title && company ? `${title} @ ${company}` : (company || title || ''),
    reasons: matchReasons.map(r => r.label),
    isBlocking: duplicate.isBlocking
  };
};
