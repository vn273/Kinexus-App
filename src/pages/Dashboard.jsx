import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, LogOut, Download, Upload, X, Trash2, Edit, TrendingUp, Check, CheckSquare, Square, ArrowUpDown, Calendar, Tag, Share2, Settings, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useContacts } from '../contexts/ContactContext';
import { daysSinceContact, CONTACT_REGULARITY_DAYS } from '../utils/dateHelpers';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';
import ContactCard from '../components/ContactCard';
import QuickAddModal from '../components/QuickAddModal';
import ContactForm from '../components/ContactForm';
import FilterBar from '../components/FilterBar';
import DuplicateWarningModal from '../components/DuplicateWarningModal';
import { useShiftSelect } from '../hooks/useShiftSelect';
import { exportToCSV, downloadCSV, parseLinkedInCSV } from '../services/csvService';
import { searchContacts } from '../services/searchService';
import { RELATIONSHIP_TYPES, getSectorLabel } from '../constants/categories';
import ReminderWidget from '../components/ReminderWidget';
import NetworkInsights from '../components/NetworkInsights';
import AIAssistant from '../components/AIAssistant';
import ScoreDashboard from '../components/ScoreDashboard';
import StreakTracker from '../components/StreakTracker';
import AchievementsList from '../components/AchievementsList';
import GoalSetting from '../components/GoalSetting';

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'company-asc', label: 'Company (A-Z)' },
  { value: 'company-desc', label: 'Company (Z-A)' },
  { value: 'role-asc', label: 'Role (A-Z)' },
  { value: 'role-desc', label: 'Role (Z-A)' },
  { value: 'recent', label: 'Recently Contacted' },
  { value: 'oldest', label: 'Oldest Contacted' },
];

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const { contacts, deleteContact, updateContact, addContact, checkBatchDuplicates } = useContacts();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelationshipTypes, setSelectedRelationshipTypes] = useState([]);
  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedContactStatus, setSelectedContactStatus] = useState(null); // 'recent', 'soon', 'overdue'
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showBulkRelationshipModal, setShowBulkRelationshipModal] = useState(false);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('name-asc');
  
  // Gamification panel toggle
  const [showGamification, setShowGamification] = useState(false);
  
  // CSV Import state
  const [showBatchDuplicateModal, setShowBatchDuplicateModal] = useState(false);
  const [batchDuplicateResult, setBatchDuplicateResult] = useState(null);
  const [pendingImportContacts, setPendingImportContacts] = useState([]);

  // Listen for quick add keyboard shortcut
  useEffect(() => {
    const handleOpenQuickAdd = () => setIsQuickAddOpen(true);
    document.addEventListener('openQuickAdd', handleOpenQuickAdd);
    return () => document.removeEventListener('openQuickAdd', handleOpenQuickAdd);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Handle relationship type filter toggle
  const handleRelationshipTypeToggle = (type) => {
    if (type === null) {
      setSelectedRelationshipTypes([]);
      return;
    }

    setSelectedRelationshipTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  // Reset all filters
  const handleResetFilters = () => {
    setSelectedSector(null);
    setSelectedCompany(null);
    setSelectedLocation(null);
    setSelectedContactStatus(null);
  };

  // Helper to get contact status based on regularity
  const getContactStatus = (contact) => {
    const days = daysSinceContact(contact.lastContactDate);
    if (days === null) return 'overdue'; // Never contacted = overdue
    
    const threshold = CONTACT_REGULARITY_DAYS[contact.contactRegularity] || 180;
    
    if (days <= threshold) return 'recent'; // Within expected contact frequency
    if (days <= threshold + 7) return 'soon'; // Past threshold but within 1 week grace
    return 'overdue'; // More than 1 week overdue
  };

  // Filter contacts using search service
  const filteredContacts = useMemo(() => {
    let results = searchContacts(contacts, searchQuery, {
      relationshipTypes: selectedRelationshipTypes,
      sector: selectedSector,
      company: selectedCompany,
      location: selectedLocation
    });
    
    // Apply contact status filter
    if (selectedContactStatus) {
      results = results.filter(contact => getContactStatus(contact) === selectedContactStatus);
    }
    
    return results;
  }, [contacts, searchQuery, selectedRelationshipTypes, selectedSector, selectedCompany, selectedLocation, selectedContactStatus]);
  
  // Sort contacts
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      case 'name-desc':
        return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
      case 'company-asc':
        return (a.company || '').localeCompare(b.company || '');
      case 'company-desc':
        return (b.company || '').localeCompare(a.company || '');
      case 'role-asc':
        return (a.role || '').localeCompare(b.role || '');
      case 'role-desc':
        return (b.role || '').localeCompare(a.role || '');
      case 'recent':
        const aRecent = a.lastContactDate ? new Date(a.lastContactDate).getTime() : 0;
        const bRecent = b.lastContactDate ? new Date(b.lastContactDate).getTime() : 0;
        return bRecent - aRecent;
      case 'oldest':
        const aOldest = a.lastContactDate ? new Date(a.lastContactDate).getTime() : Infinity;
        const bOldest = b.lastContactDate ? new Date(b.lastContactDate).getTime() : Infinity;
        return aOldest - bOldest;
      default:
        return 0;
    }
  });
  
  // Shift-click selection
  const { handleItemClick: handleShiftClick, resetLastClicked } = useShiftSelect(
    sortedContacts, 
    selectedIds, 
    setSelectedIds
  );
  
  // Multi-select handlers
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedIds(new Set());
    resetLastClicked();
  };
  
  const handleSelectContact = (contactId, event) => {
    if (event?.shiftKey) {
      // Use shift-click handler for range selection
      handleShiftClick(contactId, event);
    } else {
      // Regular toggle
      const newSelected = new Set(selectedIds);
      if (newSelected.has(contactId)) {
        newSelected.delete(contactId);
      } else {
        newSelected.add(contactId);
      }
      setSelectedIds(newSelected);
    }
  };
  
  const selectAll = () => {
    setSelectedIds(new Set(sortedContacts.map(c => c.id)));
  };
  
  const deselectAll = () => {
    setSelectedIds(new Set());
  };
  
  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected contacts?`)) return;
    
    try {
      for (const id of selectedIds) {
        await deleteContact(id);
      }
      setSelectedIds(new Set());
      setIsSelectMode(false);
      alert(`Successfully deleted ${selectedIds.size} contacts`);
    } catch (error) {
      console.error('Error deleting contacts:', error);
      alert('Failed to delete some contacts');
    }
  };
  
  const handleBulkSetRelationshipType = async (relationshipType) => {
    if (selectedIds.size === 0) return;
    
    try {
      for (const id of selectedIds) {
        const contact = contacts.find(c => c.id === id);
        if (contact) {
          await updateContact(id, { 
            ...contact, 
            relationshipType 
          });
        }
      }
      setShowBulkRelationshipModal(false);
      setSelectedIds(new Set());
      setIsSelectMode(false);
      const typeLabel = RELATIONSHIP_TYPES.find(t => t.value === relationshipType)?.label || relationshipType;
      alert(`Set relationship type "${typeLabel}" for ${selectedIds.size} contacts`);
    } catch (error) {
      console.error('Error updating contacts:', error);
      alert('Failed to update some contacts');
    }
  };
  
  const handleBulkMarkMessaged = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      const today = new Date();
      for (const id of selectedIds) {
        const contact = contacts.find(c => c.id === id);
        if (contact) {
          await updateContact(id, { ...contact, lastContactDate: today });
        }
      }
      setSelectedIds(new Set());
      setIsSelectMode(false);
      alert(`Marked ${selectedIds.size} contacts as messaged today`);
    } catch (error) {
      console.error('Error updating contacts:', error);
      alert('Failed to update some contacts');
    }
  };

  // Handle contact card click
  const handleContactClick = (contact) => {
    setSelectedContact(contact);
    setIsEditMode(false);
  };

  // Handle contact edit
  const handleEditContact = async (contactData) => {
    try {
      await updateContact(selectedContact.id, contactData);
      setSelectedContact(null);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Failed to update contact');
    }
  };

  // Handle contact delete
  const handleDeleteContact = async () => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      await deleteContact(selectedContact.id);
      setSelectedContact(null);
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact');
    }
  };

  // Handle CSV export
  const handleExport = () => {
    const csvContent = exportToCSV(filteredContacts);
    downloadCSV(csvContent, `contacts_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Handle CSV import
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target.result;
        const importedContacts = parseLinkedInCSV(csvText);
        
        if (importedContacts.length === 0) {
          alert('No contacts found in CSV file');
          return;
        }
        
        // Check for duplicates in batch
        const duplicateResults = checkBatchDuplicates(importedContacts);
        
        if (duplicateResults.blocked.length > 0 || duplicateResults.warnings.length > 0) {
          // Show batch duplicate modal
          setPendingImportContacts(importedContacts);
          setBatchDuplicateResult(duplicateResults);
          setShowBatchDuplicateModal(true);
        } else {
          // No duplicates, import all
          await importContacts(duplicateResults.clean);
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  // Import contacts to database
  const importContacts = async (contactsToImport) => {
    if (contactsToImport.length === 0) {
      alert('No contacts to import');
      return;
    }
    
    let importedCount = 0;
    let errorCount = 0;
    
    for (const contact of contactsToImport) {
      try {
        await addContact(contact, { skipDuplicateCheck: true });
        importedCount++;
      } catch (error) {
        console.error(`Error importing ${contact.firstName} ${contact.lastName}:`, error);
        errorCount++;
      }
    }
    
    let message = `Successfully imported ${importedCount} contacts!`;
    if (errorCount > 0) {
      message += ` (${errorCount} failed)`;
    }
    alert(message);
  };
  
  // Handle batch import after duplicate warning
  const handleBatchImportAnyway = async () => {
    if (!batchDuplicateResult) return;
    
    // Import clean and warnings (skip blocked)
    const contactsToImport = [
      ...batchDuplicateResult.clean,
      ...batchDuplicateResult.warnings.map(w => w.entry)
    ];
    
    await importContacts(contactsToImport);
    
    const skipped = batchDuplicateResult.blocked.length;
    if (skipped > 0) {
      alert(`Note: ${skipped} contacts were skipped due to exact duplicates (same email or LinkedIn URL).`);
    }
    
    setShowBatchDuplicateModal(false);
    setBatchDuplicateResult(null);
    setPendingImportContacts([]);
  };
  
  // Handle batch import - only clean
  const handleBatchImportCleanOnly = async () => {
    if (!batchDuplicateResult) return;
    
    await importContacts(batchDuplicateResult.clean);
    
    const skipped = batchDuplicateResult.blocked.length + batchDuplicateResult.warnings.length;
    if (skipped > 0) {
      alert(`${skipped} potential duplicates were skipped.`);
    }
    
    setShowBatchDuplicateModal(false);
    setBatchDuplicateResult(null);
    setPendingImportContacts([]);
  };
  
  const handleCloseBatchDuplicateModal = () => {
    setShowBatchDuplicateModal(false);
    setBatchDuplicateResult(null);
    setPendingImportContacts([]);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top navigation bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kinexus</h1>
              {currentUser ? (
                <p className="text-sm text-gray-600">{currentUser.email}</p>
              ) : (
                <p className="text-sm text-gray-600">Demo Mode</p>
              )}
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex gap-2 border-l border-gray-300 pl-6">
              <Link
                to="/dashboard"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md"
              >
                Contacts
              </Link>
              <Link
                to="/networking"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <TrendingUp size={16} />
                Networking Tracker
              </Link>
              <Link
                to="/network-graph"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Share2 size={16} />
                Network Graph
              </Link>
              <Link
                to="/settings"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Settings size={16} />
                Settings
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Gamification toggle */}
            <button
              onClick={() => setShowGamification(!showGamification)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                showGamification 
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Trophy size={18} />
              Progress
            </button>

            {/* Export button */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Download size={18} />
              Export
            </button>

            {/* Import button */}
            <label className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
              <Upload size={18} />
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="hidden"
              />
            </label>

            {/* Quick add button */}
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              Add Contact
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, company, title, sector, location, or tags..."
            />
          </div>
          
          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Select mode toggle */}
          <button
            onClick={toggleSelectMode}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              isSelectMode 
                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CheckSquare size={16} />
            {isSelectMode ? 'Cancel' : 'Select'}
          </button>
        </div>
        
        {/* Filter Bar */}
        <FilterBar
          contacts={contacts}
          selectedSector={selectedSector}
          onSectorChange={setSelectedSector}
          selectedCompany={selectedCompany}
          onCompanyChange={setSelectedCompany}
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          selectedContactStatus={selectedContactStatus}
          onContactStatusChange={setSelectedContactStatus}
          onResetFilters={handleResetFilters}
        />
        
        {/* Bulk action bar */}
        {isSelectMode && (
          <div className="mt-3 flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-800 font-medium">
              {selectedIds.size} selected
            </span>
            <div className="flex-1 flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-blue-600 hover:underline"
              >
                Select all
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={deselectAll}
                className="text-xs text-blue-600 hover:underline"
              >
                Deselect all
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkMarkMessaged}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Calendar size={14} />
                Mark Messaged Today
              </button>
              <button
                onClick={() => setShowBulkRelationshipModal(true)}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Tag size={14} />
                Set Relationship Type
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          selectedRelationshipTypes={selectedRelationshipTypes}
          onRelationshipTypeToggle={handleRelationshipTypeToggle}
        />

        {/* Contact grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Reminder Widget */}
          <ReminderWidget onContactClick={(contact) => setSelectedContact(contact)} />
          
          {/* Network Insights */}
          <NetworkInsights onContactClick={(contact) => setSelectedContact(contact)} />
          
          {sortedContacts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No contacts found</p>
              <button
                onClick={() => setIsQuickAddOpen(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first contact
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedContacts.map(contact => (
                <div 
                  key={contact.id} 
                  className="relative"
                  onClick={(e) => {
                    // Auto-activate select mode on shift+click
                    if (e.shiftKey && !isSelectMode) {
                      setIsSelectMode(true);
                      handleSelectContact(contact.id, e);
                    }
                  }}
                >
                  {isSelectMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectContact(contact.id, e);
                      }}
                      className="absolute top-2 left-2 z-10 p-1 bg-white rounded-md shadow-sm border border-gray-200"
                    >
                      {selectedIds.has(contact.id) ? (
                        <CheckSquare size={20} className="text-blue-600" />
                      ) : (
                        <Square size={20} className="text-gray-400" />
                      )}
                    </button>
                  )}
                  <ContactCard
                    contact={contact}
                    onClick={isSelectMode 
                      ? (e) => handleSelectContact(contact.id, e) 
                      : handleContactClick
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Quick add modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />

      {/* Contact detail/edit modal */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSelectedContact(null)}
          />
          
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isEditMode ? 'Edit Contact' : 'Contact Details'}
                </h2>
                <div className="flex items-center gap-2">
                  {!isEditMode && (
                    <>
                      <button
                        onClick={() => setIsEditMode(true)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={handleDeleteContact}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setSelectedContact(null);
                      setIsEditMode(false);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                {isEditMode ? (
                  <ContactForm
                    contact={selectedContact}
                    onSubmit={handleEditContact}
                    onCancel={() => setIsEditMode(false)}
                  />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {selectedContact.firstName} {selectedContact.lastName}
                      </h3>
                      {(selectedContact.jobTitle || selectedContact.role) && (
                        <p className="text-lg text-gray-700">
                          {selectedContact.jobTitle || selectedContact.role}
                          {selectedContact.company && ` @ ${selectedContact.company}`}
                        </p>
                      )}
                      {!selectedContact.jobTitle && !selectedContact.role && selectedContact.company && (
                        <p className="text-gray-600">{selectedContact.company}</p>
                      )}
                    </div>

                    {/* Relationship Types & Sector badges */}
                    <div className="flex flex-wrap gap-2">
                      {/* Handle both array and single value format */}
                      {(selectedContact.relationshipTypes?.length > 0 
                        ? selectedContact.relationshipTypes 
                        : (selectedContact.relationshipType ? [selectedContact.relationshipType] : [])
                      ).map((type, idx) => (
                        <span key={idx} className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                          {RELATIONSHIP_TYPES.find(t => t.value === type)?.label || type}
                        </span>
                      ))}
                      {selectedContact.sector && (
                        <span className="px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full">
                          {getSectorLabel(selectedContact.sector)}
                        </span>
                      )}
                    </div>

                    {selectedContact.location && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Location</p>
                        <p className="text-gray-900">{selectedContact.location}</p>
                      </div>
                    )}

                    {selectedContact.email && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="text-gray-900">{selectedContact.email}</p>
                      </div>
                    )}

                    {selectedContact.phone && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <p className="text-gray-900">{selectedContact.phone}</p>
                      </div>
                    )}

                    {selectedContact.linkedInUrl && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">LinkedIn</p>
                        <a
                          href={selectedContact.linkedInUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Profile
                        </a>
                      </div>
                    )}

                    {selectedContact.tags && selectedContact.tags.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedContact.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedContact.notes && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Notes</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{selectedContact.notes}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Strategic Value</p>
                        <p className="text-gray-900">{selectedContact.strategicValue}/5</p>
                      </div>
                      {selectedContact.lastContactDate && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Last Contact</p>
                          <p className="text-gray-900">
                            {new Date(selectedContact.lastContactDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Relationship Type Modal */}
      {showBulkRelationshipModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowBulkRelationshipModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Set Relationship Type for {selectedIds.size} Contacts
              </h3>
              <div className="space-y-2">
                {RELATIONSHIP_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => handleBulkSetRelationshipType(type.value)}
                    className="w-full px-3 py-2 text-sm text-left border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowBulkRelationshipModal(false)}
                className="mt-4 w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Batch Duplicate Warning Modal */}
      {showBatchDuplicateModal && batchDuplicateResult && (
        <DuplicateWarningModal
          duplicateResult={batchDuplicateResult}
          entryName="CSV Import"
          isBatchMode={true}
          onAddAnyway={handleBatchImportAnyway}
          onSkip={handleBatchImportCleanOnly}
          onClose={handleCloseBatchDuplicateModal}
        />
      )}
      
      {/* Gamification Overlay Modal */}
      {showGamification && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowGamification(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy size={24} />
                  <h2 className="text-xl font-bold">Your Progress</h2>
                </div>
                <button
                  onClick={() => setShowGamification(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <ScoreDashboard compact />
                  </div>
                  <div>
                    <StreakTracker compact />
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GoalSetting compact />
                  <AchievementsList compact />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Assistant Floating Button */}
      <AIAssistant />
    </div>
  );
};

export default Dashboard;
