/**
 * Gemini AI Service - Smart search and recommendations
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { trackAIUsage, canMakeAIRequest } from './usageTrackingService';

// Initialize Gemini
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash-lite"; // Fastest model, optimized for free tier
let genAI = null;
let model = null;

/**
 * Initialize Gemini AI
 */
export const initializeGemini = () => {
  if (!API_KEY) {
    console.warn('Gemini API key not configured. AI features will be disabled.');
    return false;
  }
  
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
    console.log(`Gemini initialized with model: ${MODEL_NAME}`);
    return true;
  } catch (error) {
    console.error('Failed to initialize Gemini:', error);
    return false;
  }
};

/**
 * Ensure model is initialized before making a request
 */
const ensureModel = () => {
  if (!model && API_KEY) {
    console.log('Re-initializing Gemini model...');
    initializeGemini();
  }
  return model;
};

/**
 * Check if Gemini is available
 */
export const isGeminiAvailable = () => {
  return !!API_KEY && !!ensureModel();
};

/**
 * Prepare contact data for AI (token-efficient format)
 */
const prepareContactData = (contacts) => {
  return contacts.map(c => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    company: c.company || 'Unknown',
    title: c.jobTitle || c.role || 'Unknown',
    sector: c.sector || 'Unknown',
    location: c.location || 'Unknown',
    relationshipType: Array.isArray(c.relationshipTypes) 
      ? c.relationshipTypes.join(', ') 
      : (c.relationshipType || 'Unknown'),
    closeness: c.relationshipCloseness || 5,
    strategicValue: c.strategicValue || 3,
    lastContact: c.lastContactDate ? 
      `${Math.floor((Date.now() - new Date(c.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))} days ago` : 
      'Never',
    tags: c.tags?.join(', ') || ''
  }));
};

/**
 * Get AI-powered contact recommendations
 */
export const getContactRecommendations = async (query, contacts, userId = null) => {
  if (!isGeminiAvailable()) {
    throw new Error('Gemini AI is not configured. Please add your API key.');
  }
  
  // Check usage limits
  if (userId && !canMakeAIRequest(userId)) {
    throw new Error('Daily AI usage limit reached. Please try again tomorrow.');
  }
  
  const contactData = prepareContactData(contacts);
  
  const prompt = `
You are a career networking assistant analyzing the user's professional network.

User query: "${query}"

User's network (${contacts.length} contacts):
${JSON.stringify(contactData, null, 2)}

Task: Recommend the top 5-8 contacts this person should reach out to based on their query.

Consider:
1. Relevance: Does the contact work in the relevant industry/role/location?
2. Relationship strength: Closer relationships (higher closeness score 1-10) = easier to reach out
3. Strategic value: Higher strategic value (1-5) contacts can provide more help
4. Recency: Contacts they haven't talked to in 6+ months may need relationship maintenance first
5. Introduction paths: Contacts who can introduce them to others

Format your response as a JSON array:
[
  {
    "contactId": "id",
    "name": "Full Name",
    "company": "Company",
    "title": "Title",
    "reason": "Brief explanation of why this contact is relevant",
    "action": "Specific advice on how to reach out",
    "priority": "high|medium|low"
  }
]

Return ONLY the JSON array, no additional text.
`;

  try {
    const currentModel = ensureModel();
    if (!currentModel) {
      throw new Error('Gemini model not available');
    }
    
    const result = await currentModel.generateContent(prompt);
    const responseText = result.response.text();
    
    // Track usage
    if (userId) {
      const inputTokens = prompt.length / 4; // Rough estimate
      const outputTokens = responseText.length / 4;
      trackAIUsage(userId, inputTokens, outputTokens);
    }
    
    // Parse JSON response
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = responseText;
      if (responseText.includes('```json')) {
        jsonStr = responseText.split('```json')[1].split('```')[0].trim();
      } else if (responseText.includes('```')) {
        jsonStr = responseText.split('```')[1].split('```')[0].trim();
      }
      
      const recommendations = JSON.parse(jsonStr);
      return {
        success: true,
        recommendations,
        rawResponse: responseText
      };
    } catch (parseError) {
      // Return raw response if JSON parsing fails
      return {
        success: true,
        recommendations: null,
        rawResponse: responseText
      };
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Handle rate limit errors specifically
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('AI rate limit reached. Please wait a minute and try again, or use keyword search.');
    }
    
    // Handle model not found errors
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      throw new Error('AI model unavailable. Please try again later.');
    }
    
    throw new Error(`AI request failed: ${error.message}`);
  }
};

/**
 * Get AI analysis of network gaps
 */
export const analyzeNetworkGaps = async (contacts, careerGoal, userId = null) => {
  if (!isGeminiAvailable()) {
    throw new Error('Gemini AI is not configured.');
  }
  
  if (userId && !canMakeAIRequest(userId)) {
    throw new Error('Daily AI usage limit reached.');
  }
  
  const contactData = prepareContactData(contacts);
  
  // Summarize network for efficiency
  const sectorCounts = {};
  const companyCounts = {};
  contacts.forEach(c => {
    if (c.sector) sectorCounts[c.sector] = (sectorCounts[c.sector] || 0) + 1;
    if (c.company) companyCounts[c.company] = (companyCounts[c.company] || 0) + 1;
  });
  
  const prompt = `
Analyze this professional network for gaps and opportunities.

Career Goal: ${careerGoal}

Network Summary:
- Total contacts: ${contacts.length}
- Sectors: ${JSON.stringify(sectorCounts)}
- Top Companies: ${JSON.stringify(Object.entries(companyCounts).sort((a,b) => b[1]-a[1]).slice(0, 10))}

Full Network:
${JSON.stringify(contactData.slice(0, 50), null, 2)} ${contacts.length > 50 ? `... and ${contacts.length - 50} more` : ''}

Analyze:
1. What sectors/industries are underrepresented given the career goal?
2. What types of contacts (seniority, function) are missing?
3. Which companies would be valuable to have connections at?
4. What networking actions would strengthen this network?

Format as JSON:
{
  "gaps": ["gap1", "gap2", ...],
  "missingRoles": ["role1", "role2", ...],
  "targetCompanies": ["company1", "company2", ...],
  "recommendations": ["action1", "action2", ...]
}

Return ONLY JSON.
`;

  try {
    const currentModel = ensureModel();
    if (!currentModel) {
      throw new Error('Gemini model not available');
    }
    
    const result = await currentModel.generateContent(prompt);
    const responseText = result.response.text();
    
    if (userId) {
      trackAIUsage(userId, prompt.length / 4, responseText.length / 4);
    }
    
    let jsonStr = responseText;
    if (responseText.includes('```json')) {
      jsonStr = responseText.split('```json')[1].split('```')[0].trim();
    } else if (responseText.includes('```')) {
      jsonStr = responseText.split('```')[1].split('```')[0].trim();
    }
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Network analysis error:', error);
    throw error;
  }
};

/**
 * Get AI-suggested outreach message
 */
export const generateOutreachMessage = async (contact, context, userId = null) => {
  if (!isGeminiAvailable()) {
    throw new Error('Gemini AI is not configured.');
  }
  
  if (userId && !canMakeAIRequest(userId)) {
    throw new Error('Daily AI usage limit reached.');
  }
  
  const prompt = `
Generate a professional networking outreach message.

Contact:
- Name: ${contact.firstName} ${contact.lastName}
- Title: ${contact.jobTitle || contact.role || 'Unknown'}
- Company: ${contact.company || 'Unknown'}
- Relationship: ${Array.isArray(contact.relationshipTypes) ? contact.relationshipTypes.join(', ') : (contact.relationshipType || 'Professional')}
- Last contact: ${contact.lastContactDate ? new Date(contact.lastContactDate).toLocaleDateString() : 'Never'}

Context/Purpose: ${context}

Write a brief, warm, professional message (2-3 sentences for LinkedIn, 3-4 for email).
Be genuine, reference the relationship naturally, and make a clear but soft ask.

Return JSON:
{
  "linkedin": "short message for LinkedIn",
  "email": {
    "subject": "email subject",
    "body": "email body"
  }
}

Return ONLY JSON.
`;

  try {
    const currentModel = ensureModel();
    if (!currentModel) {
      throw new Error('Gemini model not available');
    }
    
    const result = await currentModel.generateContent(prompt);
    const responseText = result.response.text();
    
    if (userId) {
      trackAIUsage(userId, prompt.length / 4, responseText.length / 4);
    }
    
    let jsonStr = responseText;
    if (responseText.includes('```json')) {
      jsonStr = responseText.split('```json')[1].split('```')[0].trim();
    } else if (responseText.includes('```')) {
      jsonStr = responseText.split('```')[1].split('```')[0].trim();
    }
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Message generation error:', error);
    throw error;
  }
};

/**
 * Prepare lead data for AI (token-efficient format)
 */
const prepareLeadData = (leads) => {
  return leads.map(l => ({
    id: l.id,
    name: `${l.firstName} ${l.lastName}`,
    firm: l.firm || 'Unknown',
    title: l.title || 'Unknown',
    location: l.location || 'Unknown',
    status: l.status || 'Unknown',
    commonalities: l.commonalities || '',
    notes: l.notes || '',
    reachedOut: l.reachedOut ? 'Yes' : 'No',
    lastContact: l.dateContacted ? 
      `${Math.floor((Date.now() - new Date(l.dateContacted).getTime()) / (1000 * 60 * 60 * 24))} days ago` : 
      'Never'
  }));
};

/**
 * Get AI-powered networking lead recommendations
 */
export const getLeadRecommendations = async (query, leads, userId = null) => {
  if (!isGeminiAvailable()) {
    throw new Error('Gemini AI is not configured. Please add your API key.');
  }
  
  if (userId && !canMakeAIRequest(userId)) {
    throw new Error('Daily AI usage limit reached. Please try again tomorrow.');
  }
  
  const leadData = prepareLeadData(leads);
  
  const prompt = `
You are a career networking assistant helping someone manage their networking leads.

User query: "${query}"

Networking leads (${leads.length} leads):
${JSON.stringify(leadData, null, 2)}

Task: Recommend which networking leads to prioritize based on their query.

Consider:
1. Status: "Follow-up Needed" and "Pending Response" leads need attention
2. Relevance: Does the lead work at a relevant company/role?
3. Commonalities: Shared background makes outreach easier
4. Recency: How recently were they contacted?
5. Conversion potential: Which leads are most likely to help their career goals?

Format your response as a JSON array:
[
  {
    "leadId": "id",
    "name": "Full Name",
    "firm": "Company/Firm",
    "title": "Title",
    "reason": "Brief explanation of why to prioritize this lead",
    "action": "Specific next step to take",
    "priority": "high|medium|low"
  }
]

Return ONLY the JSON array, no additional text.
`;

  try {
    const currentModel = ensureModel();
    if (!currentModel) {
      throw new Error('Gemini model not available');
    }
    
    const result = await currentModel.generateContent(prompt);
    const responseText = result.response.text();
    
    if (userId) {
      const inputTokens = prompt.length / 4;
      const outputTokens = responseText.length / 4;
      trackAIUsage(userId, inputTokens, outputTokens);
    }
    
    try {
      let jsonStr = responseText;
      if (responseText.includes('```json')) {
        jsonStr = responseText.split('```json')[1].split('```')[0].trim();
      } else if (responseText.includes('```')) {
        jsonStr = responseText.split('```')[1].split('```')[0].trim();
      }
      
      const recommendations = JSON.parse(jsonStr);
      return {
        success: true,
        recommendations,
        rawResponse: responseText
      };
    } catch (parseError) {
      return {
        success: true,
        recommendations: null,
        rawResponse: responseText
      };
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('AI rate limit reached. Please wait a minute and try again.');
    }
    
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      throw new Error('AI model unavailable. Please try again later.');
    }
    
    throw new Error(`AI request failed: ${error.message}`);
  }
};

// Initialize on module load
initializeGemini();
