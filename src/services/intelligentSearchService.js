/**
 * Intelligent Search Service - Hybrid AI + Algorithm search
 */

import { getContactRecommendations, getLeadRecommendations, isGeminiAvailable } from './geminiService';
import { searchContacts } from './searchService';

/**
 * Simple keywords that indicate algorithmic search is sufficient
 */
const SIMPLE_KEYWORDS = [
  // Company names (will match exactly)
  'at', 'from', 'works at',
  // Sectors
  'finance', 'technology', 'consulting', 'healthcare', 'real estate',
  'investment banking', 'private equity', 'venture capital', 'hedge fund',
  // Relationships
  'college', 'ucla', 'high school', 'professional', 'friend', 'family',
  // Simple filters
  'in', 'located in', 'based in'
];

/**
 * Complex query indicators that suggest AI is needed
 */
const COMPLEX_INDICATORS = [
  'who should', 'who can', 'who would', 'who might',
  'recommend', 'suggest', 'help me', 'introduce',
  'break into', 'transition', 'move into',
  'best', 'most likely', 'strongest',
  'preparing for', 'interviewing',
  'strategy', 'advice', 'approach'
];

/**
 * Detect if query is simple (can use algorithm) or complex (needs AI)
 */
export const isSimpleQuery = (query) => {
  const lowerQuery = query.toLowerCase();
  
  // Check for complex indicators - definitely use AI
  for (const indicator of COMPLEX_INDICATORS) {
    if (lowerQuery.includes(indicator)) {
      return false;
    }
  }
  
  // Very short queries (1-2 words) are typically simple name/company searches
  const words = lowerQuery.split(/\s+/);
  if (words.length <= 2) {
    return true;
  }
  
  // Check if query matches simple keyword patterns (exact sector/relationship searches)
  for (const keyword of SIMPLE_KEYWORDS) {
    if (lowerQuery === keyword || lowerQuery.startsWith(keyword + ' ')) {
      return true;
    }
  }
  
  // For longer queries (4+ words), use AI to understand intent
  if (words.length >= 4) {
    return false;
  }
  
  // 3-word queries - check if they look like questions or complex requests
  if (lowerQuery.includes('?') || 
      words[0] === 'find' || 
      words[0] === 'show' || 
      words[0] === 'get' ||
      words[0] === 'which') {
    return false;
  }
  
  return true; // Default to algorithm for simple 3-word searches like "John at Google"
};

/**
 * Extract search terms from query
 */
const extractSearchTerms = (query) => {
  // Remove common words
  const stopWords = ['who', 'what', 'where', 'when', 'the', 'a', 'an', 'is', 'are', 'at', 'in', 'for', 'to', 'of', 'my', 'i', 'me'];
  const words = query.toLowerCase().split(/\s+/);
  return words.filter(w => !stopWords.includes(w) && w.length > 1).join(' ');
};

/**
 * Perform keyword-based search
 */
export const keywordSearch = (query, contacts) => {
  const searchTerm = extractSearchTerms(query);
  return searchContacts(contacts, searchTerm, {});
};

/**
 * Intelligent search - uses algorithm for simple queries, AI for complex
 */
export const intelligentSearch = async (query, contacts, userId = null) => {
  const trimmedQuery = query.trim();
  
  if (!trimmedQuery) {
    return { source: 'algorithm', results: contacts, query: '' };
  }
  
  // First try simple keyword search
  const simpleResults = keywordSearch(trimmedQuery, contacts);
  
  const isSimple = isSimpleQuery(trimmedQuery);
  const aiAvailable = isGeminiAvailable();
  
  console.log(`[Search] Query: "${trimmedQuery}" | Simple: ${isSimple} | AI Available: ${aiAvailable}`);
  
  // For simple queries or if AI is not available, use algorithm
  if (isSimple || !aiAvailable) {
    console.log(`[Search] Using algorithm (simple=${isSimple}, aiAvailable=${aiAvailable})`);
    return {
      source: 'algorithm',
      results: simpleResults,
      query: trimmedQuery,
      message: simpleResults.length > 0 
        ? `Found ${simpleResults.length} matches`
        : 'No matches found. Try a different search term.'
    };
  }
  
  console.log(`[Search] Using AI for complex query`);
  
  // For complex queries, use AI
  try {
    const aiResponse = await getContactRecommendations(trimmedQuery, contacts, userId);
    
    // If AI returns recommendations, map them back to full contact objects
    if (aiResponse.success && aiResponse.recommendations) {
      const enrichedRecommendations = aiResponse.recommendations.map(rec => {
        const fullContact = contacts.find(c => 
          c.id === rec.contactId || 
          `${c.firstName} ${c.lastName}`.toLowerCase() === rec.name.toLowerCase()
        );
        return {
          ...rec,
          contact: fullContact || null
        };
      });
      
      return {
        source: 'ai',
        recommendations: enrichedRecommendations,
        rawResponse: aiResponse.rawResponse,
        query: trimmedQuery
      };
    }
    
    // Return raw AI response if structured parsing failed
    return {
      source: 'ai',
      rawResponse: aiResponse.rawResponse,
      query: trimmedQuery
    };
  } catch (error) {
    console.error('AI search failed, falling back to algorithm:', error);
    
    // Fall back to algorithm
    return {
      source: 'algorithm',
      results: simpleResults,
      query: trimmedQuery,
      error: error.message,
      message: `AI unavailable. Showing ${simpleResults.length} keyword matches.`
    };
  }
};

/**
 * Get search suggestions based on query
 */
export const getSearchSuggestions = (query, contacts) => {
  const suggestions = [];
  const lowerQuery = query.toLowerCase();
  
  // Suggest companies
  const companies = [...new Set(contacts.map(c => c.company).filter(Boolean))];
  companies.forEach(company => {
    if (company.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        type: 'company',
        text: company,
        query: `at ${company}`
      });
    }
  });
  
  // Suggest sectors
  const sectors = [...new Set(contacts.map(c => c.sector).filter(Boolean))];
  sectors.forEach(sector => {
    if (sector.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        type: 'sector',
        text: sector,
        query: `in ${sector}`
      });
    }
  });
  
  // Suggest locations
  const locations = [...new Set(contacts.map(c => c.location).filter(Boolean))];
  locations.forEach(location => {
    if (location.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        type: 'location',
        text: location,
        query: `located in ${location}`
      });
    }
  });
  
  // Suggest names
  contacts.forEach(contact => {
    const fullName = `${contact.firstName} ${contact.lastName}`;
    if (fullName.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        type: 'contact',
        text: fullName,
        query: fullName
      });
    }
  });
  
  return suggestions.slice(0, 8); // Limit suggestions
};

/**
 * Example AI queries for contacts
 */
export const EXAMPLE_AI_QUERIES = [
  "Who should I reach out to for investment banking roles?",
  "Which contacts can introduce me to venture capital firms?",
  "Find UCLA alumni working in tech",
  "Who haven't I talked to in 6+ months that I should reconnect with?",
  "I'm preparing for a McKinsey interview, who can help?",
  "Who in my network works at or knows someone at Goldman Sachs?",
  "Recommend contacts for breaking into private equity",
  "Which of my relationships are strongest in healthcare?"
];

/**
 * Example AI queries for networking leads
 */
export const EXAMPLE_LEAD_QUERIES = [
  "Which leads should I follow up with first?",
  "Who at Goldman Sachs should I prioritize?",
  "Find leads I haven't contacted in over a week",
  "Which leads have the best conversion potential?",
  "Recommend leads for investment banking recruiting",
  "Who should I reach out to for PE networking?",
  "Which pending leads need immediate attention?",
  "Find leads with similar backgrounds to mine"
];

/**
 * Perform keyword-based search on leads
 */
export const keywordLeadSearch = (query, leads) => {
  const lowerQuery = query.toLowerCase();
  return leads.filter(lead => {
    const searchableFields = [
      lead.firstName,
      lead.lastName,
      `${lead.firstName} ${lead.lastName}`,
      lead.firm,
      lead.location,
      lead.title,
      lead.commonalities,
      lead.notes
    ].filter(Boolean);
    
    return searchableFields.some(field => 
      field.toLowerCase().includes(lowerQuery)
    );
  });
};

/**
 * Intelligent lead search - uses algorithm for simple queries, AI for complex
 */
export const intelligentLeadSearch = async (query, leads, userId = null) => {
  const trimmedQuery = query.trim();
  
  if (!trimmedQuery) {
    return { source: 'algorithm', results: leads, query: '' };
  }
  
  // First try simple keyword search
  const simpleResults = keywordLeadSearch(trimmedQuery, leads);
  
  const isSimple = isSimpleQuery(trimmedQuery);
  const aiAvailable = isGeminiAvailable();
  
  console.log(`[Lead Search] Query: "${trimmedQuery}" | Simple: ${isSimple} | AI Available: ${aiAvailable}`);
  
  // For simple queries or if AI is not available, use algorithm
  if (isSimple || !aiAvailable) {
    console.log(`[Lead Search] Using algorithm`);
    return {
      source: 'algorithm',
      results: simpleResults,
      query: trimmedQuery,
      message: simpleResults.length > 0 
        ? `Found ${simpleResults.length} leads`
        : 'No leads found. Try a different search term.'
    };
  }
  
  console.log(`[Lead Search] Using AI for complex query`);
  
  // For complex queries, use AI
  try {
    const aiResponse = await getLeadRecommendations(trimmedQuery, leads, userId);
    
    // If AI returns recommendations, map them back to full lead objects
    if (aiResponse.success && aiResponse.recommendations) {
      const enrichedRecommendations = aiResponse.recommendations.map(rec => {
        const fullLead = leads.find(l => 
          l.id === rec.leadId || 
          `${l.firstName} ${l.lastName}`.toLowerCase() === rec.name.toLowerCase()
        );
        return {
          ...rec,
          lead: fullLead || null
        };
      });
      
      return {
        source: 'ai',
        recommendations: enrichedRecommendations,
        rawResponse: aiResponse.rawResponse,
        query: trimmedQuery
      };
    }
    
    return {
      source: 'ai',
      rawResponse: aiResponse.rawResponse,
      query: trimmedQuery
    };
  } catch (error) {
    console.error('AI lead search failed, falling back to algorithm:', error);
    
    return {
      source: 'algorithm',
      results: simpleResults,
      query: trimmedQuery,
      error: error.message,
      message: `AI unavailable. Showing ${simpleResults.length} keyword matches.`
    };
  }
};
