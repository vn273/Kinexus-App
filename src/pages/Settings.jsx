import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, RotateCcw, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const Settings = () => {
  const { currentUser } = useAuth();
  const { 
    relationshipTypes, 
    sectors, 
    addRelationshipType, 
    removeRelationshipType,
    updateRelationshipType,
    addSector, 
    removeSector,
    updateSector,
    resetToDefaults,
    loading 
  } = useSettings();
  
  const [newRelationshipType, setNewRelationshipType] = useState('');
  const [newSector, setNewSector] = useState('');
  const [editingRelationship, setEditingRelationship] = useState(null);
  const [editingRelationshipLabel, setEditingRelationshipLabel] = useState('');
  const [editingSector, setEditingSector] = useState(null);
  const [editingSectorLabel, setEditingSectorLabel] = useState('');
  const [error, setError] = useState('');

  const handleAddRelationshipType = async () => {
    if (!newRelationshipType.trim()) return;
    
    try {
      setError('');
      await addRelationshipType(newRelationshipType.trim());
      setNewRelationshipType('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveRelationshipType = async (value) => {
    if (!window.confirm('Are you sure you want to remove this relationship type?')) return;
    
    try {
      await removeRelationshipType(value);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateRelationshipType = async () => {
    if (!editingRelationshipLabel.trim()) return;
    
    try {
      await updateRelationshipType(editingRelationship, editingRelationshipLabel.trim());
      setEditingRelationship(null);
      setEditingRelationshipLabel('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddSector = async () => {
    if (!newSector.trim()) return;
    
    try {
      setError('');
      await addSector(newSector.trim());
      setNewSector('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveSector = async (value) => {
    if (!window.confirm('Are you sure you want to remove this sector?')) return;
    
    try {
      await removeSector(value);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateSector = async () => {
    if (!editingSectorLabel.trim()) return;
    
    try {
      await updateSector(editingSector, editingSectorLabel.trim());
      setEditingSector(null);
      setEditingSectorLabel('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('Reset all relationship types and sectors to defaults? This will remove any custom options you\'ve added.')) return;
    
    try {
      await resetToDefaults();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
          <p className="text-gray-600">Please log in to access settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </Link>
            <div className="border-l border-gray-300 pl-4">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <SettingsIcon size={24} />
                Settings
              </h1>
              <p className="text-sm text-gray-600">
                Customize relationship types and sectors
              </p>
            </div>
          </div>
          
          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            <RotateCcw size={18} />
            Reset to Defaults
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Relationship Types */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Relationship Types</h2>
              <p className="text-sm text-gray-600">Categories for how you know your contacts</p>
            </div>
            
            <div className="p-4">
              {/* Add new */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newRelationshipType}
                  onChange={(e) => setNewRelationshipType(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRelationshipType()}
                  placeholder="Add new type..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={handleAddRelationshipType}
                  disabled={!newRelationshipType.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={18} />
                </button>
              </div>
              
              {/* List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {relationshipTypes.map(type => (
                  <div 
                    key={type.value}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-md group"
                  >
                    {editingRelationship === type.value ? (
                      <>
                        <input
                          type="text"
                          value={editingRelationshipLabel}
                          onChange={(e) => setEditingRelationshipLabel(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateRelationshipType()}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <button
                          onClick={handleUpdateRelationshipType}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingRelationship(null);
                            setEditingRelationshipLabel('');
                          }}
                          className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-700">{type.label}</span>
                        <button
                          onClick={() => {
                            setEditingRelationship(type.value);
                            setEditingRelationshipLabel(type.label);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleRemoveRelationshipType(type.value)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sectors */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Sectors / Industries</h2>
              <p className="text-sm text-gray-600">Industry categories for your contacts</p>
            </div>
            
            <div className="p-4">
              {/* Add new */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSector()}
                  placeholder="Add new sector..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={handleAddSector}
                  disabled={!newSector.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={18} />
                </button>
              </div>
              
              {/* List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {sectors.map(sector => (
                  <div 
                    key={sector.value}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-md group"
                  >
                    {editingSector === sector.value ? (
                      <>
                        <input
                          type="text"
                          value={editingSectorLabel}
                          onChange={(e) => setEditingSectorLabel(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateSector()}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <button
                          onClick={handleUpdateSector}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingSector(null);
                            setEditingSectorLabel('');
                          }}
                          className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-700">{sector.label}</span>
                        <button
                          onClick={() => {
                            setEditingSector(sector.value);
                            setEditingSectorLabel(sector.label);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleRemoveSector(sector.value)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
