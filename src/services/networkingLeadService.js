import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

const LEADS_COLLECTION = 'networkingLeads';

// Helper to safely convert Firestore Timestamp or Date to Date object
// Handles timezone issues by parsing date-only strings as local time
const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string') {
    // If it's a date-only string (YYYY-MM-DD), parse as local time not UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }
    // For ISO strings with time, extract date part and parse as local time
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    return new Date(value);
  }
  if (typeof value === 'number') return new Date(value);
  return null;
};

// Calculate status based on lead data
/**
 * Status logic:
 * - Dead Lead: manually marked, preserved as-is
 * - Converted to Contact: has linkedContactId
 * - Call Scheduled: callScheduled is true
 * - Pending Response: 
 *     - reached out less than a week ago, OR
 *     - has a follow-up recorded less than a week ago, OR
 *     - has a response marked but no call scheduled yet
 * - Follow-up Needed: reached out over a week ago with no response AND no recent follow-up
 * - Not Contacted: hasn't been reached out to yet
 */
export const calculateStatus = (lead) => {
  // Dead Lead is manually set - preserve it
  if (lead.status === 'Dead Lead') {
    return 'Dead Lead';
  }
  
  // Already converted
  if (lead.linkedContactId) {
    return 'Converted to Contact';
  }
  
  // Has a call scheduled - highest priority status
  if (lead.callScheduled) {
    return 'Call Scheduled';
  }
  
  // If they have responded but no call scheduled, stay as "Pending Response"
  if (lead.response) {
    return 'Pending Response';
  }
  
  // Check if reached out
  if (lead.reachedOut) {
    const now = new Date();
    
    // Check if there's a recent follow-up (within last 7 days)
    let hasRecentFollowUp = false;
    if (lead.followUpDates && Array.isArray(lead.followUpDates) && lead.followUpDates.length > 0) {
      // Get the most recent follow-up date
      const mostRecentFollowUp = lead.followUpDates
        .map(fu => {
          if (!fu) return null;
          const fuDate = fu && typeof fu === 'object' && fu.date ? fu.date : fu;
          return toDate(fuDate);
        })
        .filter(d => d && !isNaN(d.getTime()))
        .sort((a, b) => b - a)[0]; // Sort descending, get most recent
      
      if (mostRecentFollowUp) {
        const daysSinceFollowUp = Math.floor((now - mostRecentFollowUp) / (1000 * 60 * 60 * 24));
        if (daysSinceFollowUp <= 7) {
          hasRecentFollowUp = true;
        }
      }
    }
    
    // Also check lastFollowUpDate field
    if (!hasRecentFollowUp && lead.lastFollowUpDate) {
      const lastFollowUp = toDate(lead.lastFollowUpDate);
      if (lastFollowUp && !isNaN(lastFollowUp.getTime())) {
        const daysSinceFollowUp = Math.floor((now - lastFollowUp) / (1000 * 60 * 60 * 24));
        if (daysSinceFollowUp <= 7) {
          hasRecentFollowUp = true;
        }
      }
    }
    
    // If there's a recent follow-up, they're pending response
    if (hasRecentFollowUp) {
      return 'Pending Response';
    }
    
    // Check how long since initial reach out
    const contactDate = toDate(lead.dateReachedOut) || toDate(lead.dateContacted);
    if (contactDate) {
      const daysSinceContact = Math.floor((now - contactDate) / (1000 * 60 * 60 * 24));
      // If reached out over a week ago with no response and no recent follow-up
      if (daysSinceContact > 7) {
        return 'Follow-up Needed';
      }
    }
    
    // Reached out within the last week
    return 'Pending Response';
  }
  
  // Haven't reached out yet
  return 'Not Contacted';
};

// Calculate reminder date (7 days after first contact)
export const calculateReminderDate = (dateContacted) => {
  if (!dateContacted) return null;
  
  const date = toDate(dateContacted);
  const reminderDate = new Date(date);
  reminderDate.setDate(reminderDate.getDate() + 7);
  
  return Timestamp.fromDate(reminderDate);
};

// Get all networking leads for a user
export const getNetworkingLeads = async (userId) => {
  try {
    const q = query(
      collection(db, LEADS_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const leads = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const lead = {
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to Date objects using safe helper
        dateContacted: toDate(data.dateContacted),
        followUpDate: toDate(data.followUpDate),
        reminderDate: toDate(data.reminderDate),
        responseDate: toDate(data.responseDate),
        createdAt: toDate(data.createdAt)
      };
      
      // Always recalculate status dynamically based on current date and lead data
      // This ensures status reflects current state (e.g., recent follow-ups)
      lead.status = calculateStatus(lead);
      
      return lead;
    });
    
    // Sort by status priority and date
    return leads.sort((a, b) => {
      const statusOrder = {
        'Follow-up Needed': 0,
        'Pending Response': 1,
        'Call Scheduled': 2,
        'Converted to Contact': 3,
        'Dead Lead': 4
      };
      
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      
      // Within same status, sort by date (most recent first)
      const aDate = a.dateContacted || new Date(0);
      const bDate = b.dateContacted || new Date(0);
      return bDate - aDate;
    });
  } catch (error) {
    console.error('Error getting networking leads:', error);
    throw error;
  }
};

// Add a new networking lead
export const addNetworkingLead = async (userId, leadData) => {
  try {
    const dateContactedParsed = toDate(leadData.dateContacted);
    const dateContacted = dateContactedParsed 
      ? Timestamp.fromDate(dateContactedParsed)
      : null;
    
    const followUpDateParsed = toDate(leadData.followUpDate);
    const followUpDate = followUpDateParsed
      ? Timestamp.fromDate(followUpDateParsed)
      : null;
    
    const responseDateParsed = toDate(leadData.responseDate);
    const responseDate = responseDateParsed
      ? Timestamp.fromDate(responseDateParsed)
      : null;
    
    const callDateParsed = toDate(leadData.callDate);
    const callDate = callDateParsed
      ? Timestamp.fromDate(callDateParsed)
      : null;
    
    const reminderDate = dateContacted 
      ? calculateReminderDate(dateContacted)
      : null;
    
    const status = calculateStatus({
      ...leadData,
      dateContacted: dateContactedParsed ? { toDate: () => dateContactedParsed } : null
    });
    
    const docRef = await addDoc(collection(db, LEADS_COLLECTION), {
      ...leadData,
      userId,
      dateContacted,
      followUpDate,
      responseDate,
      callDate,
      reminderDate,
      status,
      createdAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding networking lead:', error);
    throw error;
  }
};

// Update a networking lead
export const updateNetworkingLead = async (leadId, leadData) => {
  try {
    const updateData = { ...leadData };
    
    // Convert dates to timestamps using timezone-safe parsing
    if (leadData.dateContacted) {
      const dateContactedParsed = toDate(leadData.dateContacted);
      updateData.dateContacted = Timestamp.fromDate(dateContactedParsed);
      updateData.reminderDate = calculateReminderDate(updateData.dateContacted);
    }
    
    if (leadData.followUpDate) {
      const followUpDateParsed = toDate(leadData.followUpDate);
      updateData.followUpDate = Timestamp.fromDate(followUpDateParsed);
    }
    
    if (leadData.responseDate) {
      const responseDateParsed = toDate(leadData.responseDate);
      updateData.responseDate = Timestamp.fromDate(responseDateParsed);
    }
    
    if (leadData.callDate) {
      const callDateParsed = toDate(leadData.callDate);
      updateData.callDate = Timestamp.fromDate(callDateParsed);
    }
    
    // Recalculate status
    const currentLead = { ...leadData };
    if (leadData.dateContacted) {
      const dateContactedParsed = toDate(leadData.dateContacted);
      currentLead.dateContacted = { toDate: () => dateContactedParsed };
    }
    updateData.status = calculateStatus(currentLead);
    
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, updateData);
  } catch (error) {
    console.error('Error updating networking lead:', error);
    throw error;
  }
};

// Delete a networking lead
export const deleteNetworkingLead = async (leadId) => {
  try {
    await deleteDoc(doc(db, LEADS_COLLECTION, leadId));
  } catch (error) {
    console.error('Error deleting networking lead:', error);
    throw error;
  }
};

// Mark lead as dead
export const markLeadAsDead = async (leadId) => {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, {
      status: 'Dead Lead'
    });
  } catch (error) {
    console.error('Error marking lead as dead:', error);
    throw error;
  }
};

// Revive a dead lead (undo mark as dead)
export const reviveLead = async (leadId, lead) => {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    // Clear the dead status - let calculateStatus determine the new status
    // We need to temporarily set a non-dead status so calculateStatus can work
    const tempLead = { ...lead, status: null };
    const newStatus = calculateStatus(tempLead);
    await updateDoc(leadRef, {
      status: newStatus
    });
    return newStatus;
  } catch (error) {
    console.error('Error reviving lead:', error);
    throw error;
  }
};

// Log response on lead
export const logResponse = async (leadId, notes = '') => {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, {
      response: true,
      responseDate: Timestamp.fromDate(new Date()),
      notes: notes,
      status: 'Pending Response'
    });
  } catch (error) {
    console.error('Error logging response:', error);
    throw error;
  }
};

// Schedule call
export const scheduleCall = async (leadId, callDate) => {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    const callDateParsed = toDate(callDate);
    await updateDoc(leadRef, {
      callScheduled: true,
      callDate: Timestamp.fromDate(callDateParsed),
      followUpDate: Timestamp.fromDate(callDateParsed),
      status: 'Call Scheduled'
    });
  } catch (error) {
    console.error('Error scheduling call:', error);
    throw error;
  }
};

// Record a follow-up on a lead
export const recordFollowUp = async (leadId, notes = '') => {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    
    // Get current lead data to append to followUpDates array
    const leadSnap = await getDoc(leadRef);
    const leadData = leadSnap.data();
    const currentFollowUps = leadData?.followUpDates || [];
    
    // Create follow-up entry as object with date and notes
    const followUpEntry = {
      date: Timestamp.fromDate(new Date()),
      notes: notes
    };
    
    await updateDoc(leadRef, {
      followUpDates: [...currentFollowUps, followUpEntry],
      followUpCount: (leadData?.followUpCount || 0) + 1,
      lastFollowUpDate: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    console.error('Error recording follow-up:', error);
    throw error;
  }
};

// Convert lead to contact
export const convertLeadToContact = async (leadId, contactId) => {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, {
      linkedContactId: contactId,
      status: 'Converted to Contact'
    });
  } catch (error) {
    console.error('Error converting lead:', error);
    throw error;
  }
};

// Get statistics
export const getLeadStatistics = (leads) => {
  const total = leads.length;
  const responded = leads.filter(l => l.response).length;
  const callsScheduled = leads.filter(l => l.callScheduled).length;
  const converted = leads.filter(l => l.linkedContactId).length;
  
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
  const callConversionRate = total > 0 ? Math.round((callsScheduled / total) * 100) : 0;
  
  // Calculate average response time - ONLY for leads with actual responseDate
  const leadsWithResponseDate = leads.filter(l => l.responseDate && l.dateContacted);
  let avgResponseTime = null; // null means no data
  
  if (leadsWithResponseDate.length > 0) {
    const totalDays = leadsWithResponseDate.reduce((sum, lead) => {
      const contacted = lead.dateContacted instanceof Date ? lead.dateContacted : new Date(lead.dateContacted);
      const responseDate = lead.responseDate instanceof Date ? lead.responseDate : new Date(lead.responseDate);
      const days = Math.floor((responseDate - contacted) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, days); // Ensure non-negative
    }, 0);
    avgResponseTime = (totalDays / leadsWithResponseDate.length).toFixed(1);
  }
  
  return {
    total,
    responded,
    callsScheduled,
    converted,
    responseRate,
    callConversionRate,
    avgResponseTime,
    active: total - converted - leads.filter(l => l.status === 'Dead Lead').length
  };
};

// Parse commonalities for category keywords
export const parseCategoriesFromCommonalities = (commonalities) => {
  if (!commonalities) return ['Networking'];
  
  const text = commonalities.toLowerCase();
  const categories = [];
  
  // Check for keyword matches
  if (text.includes('family')) categories.push('Family');
  if (text.includes('friend')) categories.push('Personal');
  if (text.includes('college') || text.includes('ucla') || text.includes('university')) categories.push('UCLA');
  if (text.includes('high school')) categories.push('High School');
  if (text.includes('business')) categories.push('Business Contacts');
  if (text.includes('tech') || text.includes('technology') || text.includes('software') || text.includes('engineer')) categories.push('Tech Industry');
  if (text.includes('entrepreneur') || text.includes('startup') || text.includes('founder')) categories.push('Entrepreneur');
  
  // Always add Networking category
  if (!categories.includes('Networking')) {
    categories.push('Networking');
  }
  
  // If no specific categories found, default to Networking and Professional
  if (categories.length === 1) {
    categories.push('Professional');
  }
  
  return categories;
};
