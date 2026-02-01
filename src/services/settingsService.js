import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_COLLECTION = 'userSettings';

// Default relationship types
export const DEFAULT_RELATIONSHIP_TYPES = [
  { value: 'high-school', label: 'High School' },
  { value: 'college-ucla', label: 'College (UCLA)' },
  { value: 'professional-worked', label: 'Professional - Worked Together' },
  { value: 'professional-networking', label: 'Professional - Networking' },
  { value: 'personal-friends', label: 'Personal Friends' },
  { value: 'family', label: 'Family' },
  { value: 'mentors-advisors', label: 'Mentors/Advisors' },
];

// Default sectors
export const DEFAULT_SECTORS = [
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

/**
 * Get user settings from Firestore
 */
export const getUserSettings = async (userId) => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    
    // Return defaults if no settings exist
    return {
      relationshipTypes: DEFAULT_RELATIONSHIP_TYPES,
      sectors: DEFAULT_SECTORS
    };
  } catch (error) {
    console.error('Error getting user settings:', error);
    // Return defaults on error
    return {
      relationshipTypes: DEFAULT_RELATIONSHIP_TYPES,
      sectors: DEFAULT_SECTORS
    };
  }
};

/**
 * Save user settings to Firestore
 */
export const saveUserSettings = async (userId, settings) => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, userId);
    await setDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving user settings:', error);
    throw error;
  }
};

/**
 * Update relationship types
 */
export const updateRelationshipTypes = async (userId, relationshipTypes) => {
  return saveUserSettings(userId, { relationshipTypes });
};

/**
 * Update sectors
 */
export const updateSectors = async (userId, sectors) => {
  return saveUserSettings(userId, { sectors });
};

/**
 * Add a new relationship type
 */
export const addRelationshipType = async (userId, currentTypes, newType) => {
  const value = newType.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const updated = [...currentTypes, { value, label: newType }];
  await updateRelationshipTypes(userId, updated);
  return updated;
};

/**
 * Remove a relationship type
 */
export const removeRelationshipType = async (userId, currentTypes, valueToRemove) => {
  const updated = currentTypes.filter(t => t.value !== valueToRemove);
  await updateRelationshipTypes(userId, updated);
  return updated;
};

/**
 * Add a new sector
 */
export const addSector = async (userId, currentSectors, newSector) => {
  const value = newSector.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const updated = [...currentSectors, { value, label: newSector }];
  await updateSectors(userId, updated);
  return updated;
};

/**
 * Remove a sector
 */
export const removeSector = async (userId, currentSectors, valueToRemove) => {
  const updated = currentSectors.filter(s => s.value !== valueToRemove);
  await updateSectors(userId, updated);
  return updated;
};
