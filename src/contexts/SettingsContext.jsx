import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  getUserSettings, 
  saveUserSettings,
  DEFAULT_RELATIONSHIP_TYPES,
  DEFAULT_SECTORS
} from '../services/settingsService';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [relationshipTypes, setRelationshipTypes] = useState(DEFAULT_RELATIONSHIP_TYPES);
  const [sectors, setSectors] = useState(DEFAULT_SECTORS);
  const [loading, setLoading] = useState(true);

  // Load settings when user changes
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentUser) {
        setRelationshipTypes(DEFAULT_RELATIONSHIP_TYPES);
        setSectors(DEFAULT_SECTORS);
        setLoading(false);
        return;
      }

      try {
        const settings = await getUserSettings(currentUser.uid);
        setRelationshipTypes(settings.relationshipTypes || DEFAULT_RELATIONSHIP_TYPES);
        setSectors(settings.sectors || DEFAULT_SECTORS);
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [currentUser]);

  // Add a new relationship type
  const addRelationshipType = async (label) => {
    if (!currentUser) return;
    
    const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Check if already exists
    if (relationshipTypes.some(t => t.value === value)) {
      throw new Error('Relationship type already exists');
    }
    
    const updated = [...relationshipTypes, { value, label }];
    setRelationshipTypes(updated);
    
    await saveUserSettings(currentUser.uid, { relationshipTypes: updated });
    return updated;
  };

  // Remove a relationship type
  const removeRelationshipType = async (valueToRemove) => {
    if (!currentUser) return;
    
    const updated = relationshipTypes.filter(t => t.value !== valueToRemove);
    setRelationshipTypes(updated);
    
    await saveUserSettings(currentUser.uid, { relationshipTypes: updated });
    return updated;
  };

  // Update relationship type label
  const updateRelationshipType = async (value, newLabel) => {
    if (!currentUser) return;
    
    const updated = relationshipTypes.map(t => 
      t.value === value ? { ...t, label: newLabel } : t
    );
    setRelationshipTypes(updated);
    
    await saveUserSettings(currentUser.uid, { relationshipTypes: updated });
    return updated;
  };

  // Add a new sector
  const addSector = async (label) => {
    if (!currentUser) return;
    
    const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Check if already exists
    if (sectors.some(s => s.value === value)) {
      throw new Error('Sector already exists');
    }
    
    const updated = [...sectors, { value, label }];
    setSectors(updated);
    
    await saveUserSettings(currentUser.uid, { sectors: updated });
    return updated;
  };

  // Remove a sector
  const removeSector = async (valueToRemove) => {
    if (!currentUser) return;
    
    const updated = sectors.filter(s => s.value !== valueToRemove);
    setSectors(updated);
    
    await saveUserSettings(currentUser.uid, { sectors: updated });
    return updated;
  };

  // Update sector label
  const updateSector = async (value, newLabel) => {
    if (!currentUser) return;
    
    const updated = sectors.map(s => 
      s.value === value ? { ...s, label: newLabel } : s
    );
    setSectors(updated);
    
    await saveUserSettings(currentUser.uid, { sectors: updated });
    return updated;
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    if (!currentUser) return;
    
    setRelationshipTypes(DEFAULT_RELATIONSHIP_TYPES);
    setSectors(DEFAULT_SECTORS);
    
    await saveUserSettings(currentUser.uid, {
      relationshipTypes: DEFAULT_RELATIONSHIP_TYPES,
      sectors: DEFAULT_SECTORS
    });
  };

  // Helper to get label from value
  const getRelationshipTypeLabel = (value) => {
    const type = relationshipTypes.find(t => t.value === value);
    return type ? type.label : value || 'Unknown';
  };

  const getSectorLabel = (value) => {
    const sector = sectors.find(s => s.value === value);
    return sector ? sector.label : value || 'Unknown';
  };

  const value = {
    relationshipTypes,
    sectors,
    loading,
    addRelationshipType,
    removeRelationshipType,
    updateRelationshipType,
    addSector,
    removeSector,
    updateSector,
    resetToDefaults,
    getRelationshipTypeLabel,
    getSectorLabel
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
