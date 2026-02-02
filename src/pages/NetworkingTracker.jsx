import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useContacts } from '../contexts/ContactContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
  Upload, Download, Plus, TrendingUp, User, Search,
  Users, Phone, Clock, CheckCircle2, ChevronDown, ChevronRight,
  ArrowUpDown, CheckSquare, Square, Trash2, Calendar, Share2, Settings, Trophy, Flame, Target
} from 'lucide-react';
import NetworkingLeadCardCompact from '../components/NetworkingLeadCardCompact';
import LeadDetailPanel from '../components/LeadDetailPanel';
import LeadForm from '../components/LeadForm';
import DuplicateWarningModal from '../components/DuplicateWarningModal';
import AIAssistant from '../components/AIAssistant';
import ScoreDashboard from '../components/ScoreDashboard';
import StreakTracker from '../components/StreakTracker';
import GoalSetting from '../components/GoalSetting';
import AchievementsList from '../components/AchievementsList';
import useGamification from '../hooks/useGamification';
import { useShiftSelect } from '../hooks/useShiftSelect';
import * as networkingService from '../services/networkingLeadService';
import * as importService from '../services/networkingImportService';
import { findBatchDuplicates, findDuplicates } from '../services/duplicateService';

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'firm-asc', label: 'Firm (A-Z)' },
  { value: 'firm-desc', label: 'Firm (Z-A)' },
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
  { value: 'recent', label: 'Recently Contacted' },
  { value: 'oldest', label: 'Oldest Contacted' },
  { value: 'status', label: 'Status Priority' },
];

const BATCH_DUPLICATE_THRESHOLD = 10;

const NetworkingTracker = () => {
  const { currentUser } = useAuth();
  const { addContact, checkDuplicates, contacts } = useContacts();
  const { monthlyGoalTargets } = useSettings();
  const { 
    score, 
    streak, 
    goals, 
    tier, 
    currentMultiplier,
    logNetworkingActivity,
    refreshScores,
    syncGoalsFromLeads,
    loading: gamificationLoading 
  } = useGamification();
  
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [showGamification, setShowGamification] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null); // For split-screen detail view
  const [expandedSections, setExpandedSections] = useState({
    'Follow-up Needed': true,
    'Pending Response': true,
    'Call Scheduled': true,
    'Converted to Contact': false,
    'Dead Lead': false
  });
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('status');
  
  // Duplicate detection state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState(null);
  const [pendingConversion, setPendingConversion] = useState(null);
  
  // CSV batch duplicate state
  const [showBatchDuplicateModal, setShowBatchDuplicateModal] = useState(false);
  const [batchDuplicateResult, setBatchDuplicateResult] = useState(null);
  const [pendingImportLeads, setPendingImportLeads] = useState([]);
  
  // Lead duplicate state (for adding new leads)
  const [showLeadDuplicateModal, setShowLeadDuplicateModal] = useState(false);
  const [leadDuplicateResult, setLeadDuplicateResult] = useState(null);
  const [pendingLeadData, setPendingLeadData] = useState(null);
  
  // Keyboard shortcut for Ctrl/Cmd+K to add lead
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setEditingLead(null);
        setShowLeadForm(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Load leads
  useEffect(() => {
    if (currentUser) {
      loadLeads();
    } else {
      setLoading(false);
    }
  }, [currentUser]);
  
  const loadLeads = async () => {
    try {
      setLoading(true);
      const fetchedLeads = await networkingService.getNetworkingLeads(currentUser.uid);
      setLeads(fetchedLeads);
      setStatistics(networkingService.getLeadStatistics(fetchedLeads));
      
      // Sync goals and scores from lead data
      await syncGoalsFromLeads(fetchedLeads, monthlyGoalTargets);
    } catch (error) {
      console.error('Error loading leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter leads based on search query
  const filteredLeads = leads.filter(lead => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const searchableFields = [
      lead.firstName,
      lead.lastName,
      `${lead.firstName} ${lead.lastName}`,
      lead.firm,
      lead.location,
      lead.title,
      lead.commonalities
    ].filter(Boolean);
    
    return searchableFields.some(field => 
      field.toLowerCase().includes(query)
    );
  });
  
  // Sort filtered leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      case 'name-desc':
        return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
      case 'firm-asc':
        return (a.firm || '').localeCompare(b.firm || '');
      case 'firm-desc':
        return (b.firm || '').localeCompare(a.firm || '');
      case 'title-asc':
        return (a.title || '').localeCompare(b.title || '');
      case 'title-desc':
        return (b.title || '').localeCompare(a.title || '');
      case 'recent':
        const aRecent = a.dateContacted ? new Date(a.dateContacted).getTime() : 0;
        const bRecent = b.dateContacted ? new Date(b.dateContacted).getTime() : 0;
        return bRecent - aRecent;
      case 'oldest':
        const aOldest = a.dateContacted ? new Date(a.dateContacted).getTime() : Infinity;
        const bOldest = b.dateContacted ? new Date(b.dateContacted).getTime() : Infinity;
        return aOldest - bOldest;
      case 'status':
      default:
        const statusOrder = { 'Follow-up Needed': 0, 'Pending Response': 1, 'Call Scheduled': 2, 'Converted to Contact': 3, 'Dead Lead': 4 };
        return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
    }
  });
  
  // Group sorted leads by status
  const groupedLeads = {
    'Follow-up Needed': sortedLeads.filter(l => l.status === 'Follow-up Needed'),
    'Pending Response': sortedLeads.filter(l => l.status === 'Pending Response'),
    'Call Scheduled': sortedLeads.filter(l => l.status === 'Call Scheduled'),
    'Converted to Contact': sortedLeads.filter(l => l.status === 'Converted to Contact'),
    'Dead Lead': sortedLeads.filter(l => l.status === 'Dead Lead')
  };
  
  // Shift-click selection hook
  const { handleItemClick: handleShiftClick, resetLastClicked } = useShiftSelect(
    sortedLeads,
    selectedIds,
    setSelectedIds
  );
  
  // Multi-select handlers
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedIds(new Set());
    resetLastClicked();
  };
  
  const handleSelectLead = (leadId, event) => {
    if (event?.shiftKey) {
      handleShiftClick(leadId, event);
    } else {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(leadId)) {
        newSelected.delete(leadId);
      } else {
        newSelected.add(leadId);
      }
      setSelectedIds(newSelected);
    }
  };
  
  const selectAll = () => {
    setSelectedIds(new Set(sortedLeads.map(l => l.id)));
  };
  
  const deselectAll = () => {
    setSelectedIds(new Set());
  };
  
  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected leads?`)) return;
    
    try {
      for (const id of selectedIds) {
        await networkingService.deleteNetworkingLead(id);
      }
      setSelectedIds(new Set());
      setIsSelectMode(false);
      await loadLeads();
      alert(`Successfully deleted ${selectedIds.size} leads`);
    } catch (error) {
      console.error('Error deleting leads:', error);
      alert('Failed to delete some leads');
    }
  };
  
  const handleBulkMarkContacted = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      const today = new Date();
      for (const id of selectedIds) {
        const lead = leads.find(l => l.id === id);
        if (lead) {
          await networkingService.updateNetworkingLead(id, { 
            ...lead, 
            dateContacted: today,
            reachedOut: true
          });
        }
      }
      setSelectedIds(new Set());
      setIsSelectMode(false);
      await loadLeads();
      alert(`Marked ${selectedIds.size} leads as contacted today`);
    } catch (error) {
      console.error('Error updating leads:', error);
      alert('Failed to update some leads');
    }
  };
  
  const handleBulkConvert = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Convert ${selectedIds.size} leads to contacts?`)) return;
    
    try {
      let convertedCount = 0;
      let skippedDuplicates = 0;
      
      for (const id of selectedIds) {
        const lead = leads.find(l => l.id === id);
        if (lead && !lead.linkedContactId) {
          const contactData = buildContactDataFromLead(lead, 'Bulk converted from networking lead');
          
          // Check for duplicates
          const duplicates = checkDuplicates(contactData);
          
          if (duplicates.hasBlockingDuplicates) {
            // Skip exact duplicates during bulk convert
            console.log(`Skipping duplicate: ${lead.firstName} ${lead.lastName}`);
            skippedDuplicates++;
            continue;
          }
          
          await processConversion(lead, contactData, true); // Skip check since we already did it
          convertedCount++;
        }
      }
      
      setSelectedIds(new Set());
      setIsSelectMode(false);
      await loadLeads();
      
      let message = `Successfully converted ${convertedCount} leads to contacts`;
      if (skippedDuplicates > 0) {
        message += `. ${skippedDuplicates} were skipped due to duplicate contacts.`;
      }
      alert(message);
    } catch (error) {
      console.error('Error converting leads:', error);
      alert('Failed to convert some leads');
    }
  };
  
  // Auto-convert leads with call scheduled to contacts (with duplicate checking)
  const autoConvertCallScheduledLeads = async (leadsToProcess) => {
    const callScheduledLeads = leadsToProcess.filter(l => l.callScheduled && !l.linkedContactId);
    let convertedCount = 0;
    let skippedDuplicates = 0;
    
    for (const lead of callScheduledLeads) {
      try {
        const contactData = buildContactDataFromLead(lead, 'Auto-converted from networking lead (call scheduled)');
        
        // Check for duplicates - skip if exact duplicate (email/LinkedIn)
        const duplicates = checkDuplicates(contactData);
        
        if (duplicates.hasBlockingDuplicates) {
          // Skip exact duplicates during bulk import
          console.log(`Skipping duplicate: ${lead.firstName} ${lead.lastName}`);
          skippedDuplicates++;
          continue;
        }
        
        // For warning-level duplicates, still add but log
        if (duplicates.hasDuplicates) {
          console.log(`Warning: Potential duplicate for ${lead.firstName} ${lead.lastName}`);
        }
        
        await processConversion(lead, contactData, true); // Skip check since we already did it
        convertedCount++;
      } catch (error) {
        console.error(`Error auto-converting lead ${lead.firstName} ${lead.lastName}:`, error);
      }
    }
    
    return { convertedCount, skippedDuplicates };
  };
  
  // Handle CSV import with duplicate detection
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target.result;
        const importedLeads = importService.parseNetworkingCSV(csvText);
        
        if (importedLeads.length === 0) {
          alert('No leads found in CSV file');
          return;
        }
        
        // Check for duplicates against existing leads (by LinkedIn URL and name)
        const duplicateResults = findBatchDuplicates(importedLeads, leads, {
          checkEmail: false, // Leads may not have email
          checkLinkedIn: true,
          checkName: true,
          checkCompanyTitle: false,
          checkPhone: false
        });
        
        const totalDuplicates = duplicateResults.blocked.length + duplicateResults.warnings.length;
        
        if (totalDuplicates >= BATCH_DUPLICATE_THRESHOLD) {
          // Show batch duplicate modal for 10+ duplicates
          setPendingImportLeads(importedLeads);
          setBatchDuplicateResult(duplicateResults);
          setShowBatchDuplicateModal(true);
          return;
        } else if (totalDuplicates > 0) {
          // Show confirmation for fewer duplicates
          const proceed = window.confirm(
            `Found ${totalDuplicates} potential duplicate(s) in CSV.\n` +
            `- ${duplicateResults.blocked.length} exact duplicates (same LinkedIn)\n` +
            `- ${duplicateResults.warnings.length} similar names\n\n` +
            `Import ${duplicateResults.clean.length} non-duplicate leads?`
          );
          
          if (!proceed) return;
          
          // Import only clean leads
          await importLeads(duplicateResults.clean);
        } else {
          // No duplicates, import all
          if (!window.confirm(`Ready to import ${importedLeads.length} networking leads. Continue?`)) {
            return;
          }
          await importLeads(importedLeads);
        }
      } catch (error) {
        console.error('Error importing CSV:', error);
        alert(`Failed to import CSV: ${error.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  // Import leads to database
  const importLeads = async (leadsToImport) => {
    if (leadsToImport.length === 0) {
      alert('No leads to import');
      return;
    }
    
    const addedLeadIds = [];
    for (const lead of leadsToImport) {
      const leadId = await networkingService.addNetworkingLead(currentUser.uid, lead);
      addedLeadIds.push({ ...lead, id: leadId });
    }
    
    // Auto-convert call scheduled leads
    const callScheduledCount = leadsToImport.filter(l => l.callScheduled).length;
    if (callScheduledCount > 0) {
      const allLeads = await networkingService.getNetworkingLeads(currentUser.uid);
      const { convertedCount, skippedDuplicates } = await autoConvertCallScheduledLeads(allLeads);
      
      let message = `Successfully imported ${leadsToImport.length} leads!`;
      if (convertedCount > 0) {
        message += ` ${convertedCount} with scheduled calls were auto-converted to contacts.`;
      }
      if (skippedDuplicates > 0) {
        message += ` ${skippedDuplicates} were skipped due to duplicate contacts.`;
      }
      alert(message);
    } else {
      alert(`Successfully imported ${leadsToImport.length} leads!`);
    }
    
    await loadLeads();
    
    // Recalculate scores from updated leads
    const updatedLeads = await networkingService.getNetworkingLeads(currentUser.uid);
    await syncGoalsFromLeads(updatedLeads, monthlyGoalTargets);
  };
  
  // Batch import handlers
  const handleBatchImportAll = async () => {
    if (!pendingImportLeads.length) return;
    await importLeads(pendingImportLeads);
    closeBatchDuplicateModal();
  };
  
  const handleBatchImportClean = async () => {
    if (!batchDuplicateResult) return;
    await importLeads(batchDuplicateResult.clean);
    closeBatchDuplicateModal();
  };
  
  const closeBatchDuplicateModal = () => {
    setShowBatchDuplicateModal(false);
    setBatchDuplicateResult(null);
    setPendingImportLeads([]);
  };
  
  // Handle CSV export
  const handleExport = () => {
    const csvContent = importService.exportLeadsToCSV(leads);
    importService.downloadLeadsCSV(csvContent, `networking_leads_${new Date().toISOString().split('T')[0]}.csv`);
  };
  
  // Action handlers
  const handleFollowUp = async (lead) => {
    const notes = prompt('Follow-up notes (optional):');
    try {
      await networkingService.updateNetworkingLead(lead.id, {
        ...lead,
        followUpDate: new Date(),
        notes: notes || lead.notes,
        reachedOut: true
      });
      
      // Log gamification activity
      if (currentUser) {
        await logNetworkingActivity('follow_up', {
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName}`,
          company: lead.firm
        });
      }
      
      await loadLeads();
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead');
    }
  };
  
  const handleLogResponse = async (lead) => {
    const notes = prompt('Response notes:');
    if (notes === null) return;
    
    try {
      await networkingService.logResponse(lead.id, notes);
      
      // Log gamification activity for response received
      if (currentUser) {
        await logNetworkingActivity('response_received', {
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName}`,
          company: lead.firm
        });
      }
      
      await loadLeads();
    } catch (error) {
      console.error('Error logging response:', error);
      alert('Failed to log response');
    }
  };
  
  const handleScheduleCall = async (lead) => {
    const dateStr = prompt('Call date (YYYY-MM-DD):');
    if (!dateStr) return;
    
    try {
      const callDate = new Date(dateStr);
      if (isNaN(callDate.getTime())) {
        alert('Invalid date format');
        return;
      }
      
      await networkingService.scheduleCall(lead.id, callDate);
      
      // Log gamification activity for call scheduled
      if (currentUser) {
        await logNetworkingActivity('call_scheduled', {
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName}`,
          company: lead.firm,
          callDate: callDate.toISOString()
        });
      }
      
      // Auto-convert to contact when call is scheduled (if not already linked)
      if (!lead.linkedContactId) {
        const contactData = buildContactDataFromLead(
          lead, 
          `Auto-converted from networking lead (call scheduled for ${callDate.toLocaleDateString()})`
        );
        
        // Check for duplicates
        const duplicates = checkDuplicates(contactData);
        
        if (duplicates.hasDuplicates) {
          // Store pending conversion and show modal
          setPendingConversion({ lead, contactData, conversionType: 'call-scheduled' });
          setDuplicateResult(duplicates);
          setShowDuplicateModal(true);
          return;
        }
        
        // No duplicates, proceed with conversion
        await processConversion(lead, contactData);
        alert('Call scheduled and lead auto-converted to contact!');
      }
      
      await loadLeads();
    } catch (error) {
      console.error('Error scheduling call:', error);
      alert('Failed to schedule call');
    }
  };
  
  // Helper function to build contact data from lead
  const buildContactDataFromLead = (lead, conversionReason = 'Converted from networking lead') => {
    const categories = networkingService.parseCategoriesFromCommonalities(lead.commonalities);
    
    let notesContent = '';
    if (lead.commonalities) {
      notesContent += `Commonalities: ${lead.commonalities}\n\n`;
    }
    if (lead.notes) {
      notesContent += `Notes: ${lead.notes}\n\n`;
    }
    notesContent += `${conversionReason}.\nFirst contacted: ${lead.dateContacted ? new Date(lead.dateContacted).toLocaleDateString() : 'Unknown'}`;
    
    return {
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.firm || '',
      role: lead.title || '',
      email: lead.email || '',
      linkedInUrl: lead.linkedInUrl || '',
      categories: categories,
      tags: [],
      notes: notesContent,
      // Default values for contacts converted from networking leads
      relationshipTypes: ['professional-networking'], // Store as array
      relationshipCloseness: 4, // Acquaintance level
      strategicValue: 5, // Moderate value
      contactRegularity: '6-months', // Default contact frequency
      lastContactDate: lead.dateContacted,
      phone: lead.phone || ''
    };
  };
  
  // Process conversion after duplicate check
  const processConversion = async (lead, contactData, skipDuplicateCheck = false) => {
    try {
      const contactId = await addContact(contactData, { skipDuplicateCheck, linkedLeadId: lead.id });
      await networkingService.convertLeadToContact(lead.id, contactId);
      return contactId;
    } catch (error) {
      console.error('Error processing conversion:', error);
      throw error;
    }
  };
  
  const handleConvert = async (lead) => {
    if (!window.confirm(`Convert ${lead.firstName} ${lead.lastName} to a contact in your CRM?`)) {
      return;
    }
    
    try {
      const contactData = buildContactDataFromLead(lead);
      
      // Check for duplicates
      const duplicates = checkDuplicates(contactData);
      
      if (duplicates.hasDuplicates) {
        // Store pending conversion and show modal
        setPendingConversion({ lead, contactData, conversionType: 'manual' });
        setDuplicateResult(duplicates);
        setShowDuplicateModal(true);
        return;
      }
      
      // No duplicates, proceed with conversion
      await processConversion(lead, contactData);
      alert('Successfully converted to contact!');
      await loadLeads();
    } catch (error) {
      console.error('Error converting lead:', error);
      alert('Failed to convert lead to contact');
    }
  };
  
  // Handle duplicate modal actions
  const handleDuplicateAddAnyway = async () => {
    if (!pendingConversion) return;
    
    try {
      const { lead, contactData, conversionType } = pendingConversion;
      await processConversion(lead, contactData, true);
      
      setShowDuplicateModal(false);
      setDuplicateResult(null);
      setPendingConversion(null);
      
      if (conversionType === 'manual') {
        alert('Successfully converted to contact!');
      } else if (conversionType === 'call-scheduled') {
        alert('Call scheduled and lead converted to contact!');
      }
      
      await loadLeads();
    } catch (error) {
      console.error('Error converting with duplicates:', error);
      alert('Failed to convert lead to contact');
    }
  };
  
  const handleDuplicateSkip = () => {
    setShowDuplicateModal(false);
    setDuplicateResult(null);
    setPendingConversion(null);
    alert('Conversion cancelled due to potential duplicate.');
  };
  
  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
    setDuplicateResult(null);
    setPendingConversion(null);
  };
  
  const handleMarkDead = async (lead) => {
    if (!window.confirm(`Mark ${lead.firstName} ${lead.lastName} as a dead lead?`)) {
      return;
    }
    
    try {
      await networkingService.markLeadAsDead(lead.id);
      await loadLeads();
    } catch (error) {
      console.error('Error marking lead as dead:', error);
      alert('Failed to mark lead as dead');
    }
  };
  
  // Delete lead permanently
  const handleDelete = async (lead) => {
    if (!window.confirm(`Permanently delete ${lead.firstName} ${lead.lastName}? This cannot be undone.`)) {
      return;
    }
    
    try {
      await networkingService.deleteNetworkingLead(lead.id);
      
      // Log deletion activity to deduct points
      await logNetworkingActivity('lead_deleted', {
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName}`,
        company: lead.firm
      });
      
      await loadLeads();
      alert('Lead deleted successfully');
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Failed to delete lead');
    }
  };
  
  const handleEdit = (lead) => {
    setEditingLead(lead);
    setShowLeadForm(true);
  };
  
  const handleAddLead = () => {
    setEditingLead(null);
    setShowLeadForm(true);
  };
  
  // Check for duplicate leads
  const checkLeadDuplicates = (leadData) => {
    // Map lead data to contact-like format for duplicate checking
    const normalizedData = {
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      email: leadData.email,
      linkedInUrl: leadData.linkedInUrl,
      company: leadData.firm,
      title: leadData.title,
      phone: leadData.phone
    };
    
    // Check against existing leads
    const existingLeads = leads.map(l => ({
      ...l,
      company: l.firm // Normalize field name
    }));
    
    return findDuplicates(normalizedData, existingLeads, {
      checkEmail: true,
      checkLinkedIn: true,
      checkName: true,
      checkCompanyTitle: false,
      checkPhone: false
    });
  };
  
  const handleFormSubmit = async (formData) => {
    try {
      if (editingLead) {
        // Update existing lead - no duplicate check needed
        await networkingService.updateNetworkingLead(editingLead.id, formData);
        
        // Auto-convert to contact if callScheduled is newly set to true
        if (formData.callScheduled && !editingLead.callScheduled && !editingLead.linkedContactId) {
          const leadWithId = { ...formData, id: editingLead.id };
          const contactData = buildContactDataFromLead(
            leadWithId, 
            'Auto-converted from networking lead (call scheduled)'
          );
          
          const duplicates = checkDuplicates(contactData);
          if (duplicates.hasDuplicates) {
            setPendingConversion({ lead: leadWithId, contactData, conversionType: 'call-scheduled' });
            setDuplicateResult(duplicates);
            setShowDuplicateModal(true);
            setShowLeadForm(false);
            setEditingLead(null);
            await loadLeads();
            return;
          }
          
          await processConversion(leadWithId, contactData);
          alert('Lead updated and auto-converted to contact!');
        } else {
          alert('Lead updated successfully!');
        }
        
        setShowLeadForm(false);
        setEditingLead(null);
        await loadLeads();
      } else {
        // Add new lead - check for duplicates first
        const duplicates = checkLeadDuplicates(formData);
        
        if (duplicates.hasDuplicates) {
          // Store pending lead and show duplicate modal
          setPendingLeadData(formData);
          setLeadDuplicateResult(duplicates);
          setShowLeadDuplicateModal(true);
          return;
        }
        
        // No duplicates, add the lead
        const newLeadId = await networkingService.addNetworkingLead(currentUser.uid, formData);
        
        // Log gamification activity for lead added
        if (currentUser) {
          await logNetworkingActivity('lead_added', {
            leadName: `${formData.firstName} ${formData.lastName}`,
            company: formData.firm
          });
        }
        
        // Auto-convert to contact if callScheduled is true on new lead
        if (formData.callScheduled) {
          const leadWithId = { ...formData, id: newLeadId };
          const contactData = buildContactDataFromLead(
            leadWithId, 
            'Auto-converted from networking lead (call scheduled)'
          );
          
          const contactDuplicates = checkDuplicates(contactData);
          if (contactDuplicates.hasDuplicates) {
            setPendingConversion({ lead: leadWithId, contactData, conversionType: 'call-scheduled' });
            setDuplicateResult(contactDuplicates);
            setShowDuplicateModal(true);
            setShowLeadForm(false);
            setEditingLead(null);
            await loadLeads();
            return;
          }
          
          await processConversion(leadWithId, contactData);
          alert('Lead added and auto-converted to contact!');
        } else {
          alert('Lead added successfully!');
        }
        
        setShowLeadForm(false);
        setEditingLead(null);
        await loadLeads();
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      alert(`Failed to ${editingLead ? 'update' : 'add'} lead: ${error.message}`);
    }
  };
  
  const handleFormCancel = () => {
    setShowLeadForm(false);
    setEditingLead(null);
  };
  
  // Lead duplicate handlers
  const handleLeadDuplicateAddAnyway = async () => {
    if (!pendingLeadData) return;
    setShowLeadDuplicateModal(false);
    try {
      await addNetworkingLead(currentUser.uid, pendingLeadData);
      await loadLeads();
      setShowLeadForm(false);
    } catch (error) {
      console.error('Error adding lead:', error);
      alert(`Failed to add lead: ${error.message}`);
    } finally {
      setPendingLeadData(null);
      setLeadDuplicateResult(null);
    }
  };
  
  const handleLeadDuplicateSkip = () => {
    setShowLeadDuplicateModal(false);
    setPendingLeadData(null);
    setLeadDuplicateResult(null);
  };
  
  const handleCloseLeadDuplicateModal = () => {
    setShowLeadDuplicateModal(false);
    setPendingLeadData(null);
    setLeadDuplicateResult(null);
  };
  
  const toggleSection = (status) => {
    setExpandedSections(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };
  
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
          <p className="text-gray-600">Please log in to access the Networking Tracker.</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading networking leads...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Networking Tracker</h1>
              {currentUser && (
                <p className="text-sm text-gray-600">{currentUser.email}</p>
              )}
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex gap-2 border-l border-gray-300 pl-6">
              <Link
                to="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <User size={16} />
                Contacts
              </Link>
              <Link
                to="/networking"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md"
              >
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
            {/* Gamification Toggle */}
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
            
            <button
              onClick={handleExport}
              disabled={leads.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              Export
            </button>
            
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
            
            <button
              className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              onClick={handleAddLead}
            >
              <Plus size={18} />
              Add Lead
            </button>
          </div>
        </div>
        
        {/* Search Bar and Controls */}
        <div className="mb-4">
          <div className="flex items-center gap-4 mb-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name, firm, location, title, or commonalities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
            
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={16} className="text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Select Mode Toggle */}
            <button
              onClick={toggleSelectMode}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                isSelectMode 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isSelectMode ? <CheckSquare size={16} /> : <Square size={16} />}
              Select
            </button>
          </div>
          
          {/* Bulk Action Bar */}
          {isSelectMode && (
            <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-md">
              <span className="text-sm text-blue-700 font-medium">
                {selectedIds.size} selected
              </span>
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Select All ({sortedLeads.length})
              </button>
              <button
                onClick={deselectAll}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Deselect All
              </button>
              <div className="flex-1" />
              <button
                onClick={handleBulkMarkContacted}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Calendar size={14} />
                Mark Contacted Today
              </button>
              <button
                onClick={handleBulkConvert}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <User size={14} />
                Convert to Contacts
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
          
          {searchQuery && (
            <p className="text-sm text-gray-500 mt-1">
              Showing {filteredLeads.length} of {leads.length} leads
            </p>
          )}
        </div>
        
        {/* Gamification Progress Section - Visually Distinct */}
        {showGamification && (
          <div className="mt-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Trophy size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Progress & Goals</h2>
                  <p className="text-slate-400 text-sm">Track your networking journey</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {streak?.currentStreak > 0 && (
                  <div className="flex items-center gap-1 bg-orange-500/20 px-3 py-1 rounded-full">
                    <Flame size={16} className="text-orange-400" />
                    <span className="text-orange-300 font-medium">{streak.currentStreak}-day streak</span>
                  </div>
                )}
                {currentMultiplier > 1 && (
                  <div className="bg-purple-500/20 px-3 py-1 rounded-full">
                    <span className="text-purple-300 font-medium">{currentMultiplier}x multiplier</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Current Score */}
              <div className="bg-white/10 backdrop-blur p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy size={16} className="text-yellow-400" />
                  <span className="text-sm text-slate-300">Total Score</span>
                </div>
                <div className="text-2xl font-bold">{(score?.totalScore || 0).toLocaleString()}</div>
                <div className="text-xs text-slate-400">{tier?.icon} {tier?.name}</div>
              </div>
              
              {/* Current Streak */}
              <div className="bg-white/10 backdrop-blur p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Flame size={16} className="text-orange-400" />
                  <span className="text-sm text-slate-300">Current Streak</span>
                </div>
                <div className="text-2xl font-bold">{streak?.currentStreak || 0} days</div>
                <div className="text-xs text-slate-400">
                  {currentMultiplier > 1 ? 'Multiplier active!' : 'Build a 7-day streak'}
                </div>
              </div>
              
              {/* Monthly Goal Progress */}
              <Link to="/settings" className="bg-white/10 backdrop-blur p-4 rounded-xl hover:bg-white/20 transition-colors block">
                <div className="flex items-center gap-2 mb-1">
                  <Target size={16} className="text-green-400" />
                  <span className="text-sm text-slate-300">Monthly Goals</span>
                </div>
                <div className="text-2xl font-bold">
                  {goals?.progress && goals?.targets ? Math.round(
                    Object.keys(goals.targets).filter(k => 
                      (goals.progress[k] || 0) >= (goals.targets[k] || 1)
                    ).length / Math.max(Object.keys(goals.targets).length, 1) * 100
                  ) : 0}%
                </div>
                <div className="text-xs text-slate-400">
                  {goals?.targets ? `${Object.keys(goals.targets).filter(k => (goals.progress?.[k] || 0) >= (goals.targets[k] || 1)).length}/${Object.keys(goals.targets).length} completed` : 'Set goals to track →'}
                </div>
              </Link>
              
              {/* Activity Score Today */}
              <div className="bg-white/10 backdrop-blur p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={16} className="text-blue-400" />
                  <span className="text-sm text-slate-300">Today's Activity</span>
                </div>
                <div className="text-2xl font-bold">{score?.activityScore || 0}</div>
                <div className="text-xs text-slate-400">
                  {score?.activityHighScore > 0 && score?.activityHighScore > (score?.activityScore || 0) 
                    ? `Best: ${score.activityHighScore} pts` 
                    : score?.activityScore > 0 ? '🔥 New high!' : 'points today'}
                </div>
              </div>
            </div>
            
            {/* Goals & Streak Expanded */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GoalSetting compact />
              <StreakTracker compact />
            </div>
          </div>
        )}
        
        {/* Networking Metrics Section - Removed from header, now in sticky footer */}
      </div>
      
      {/* Main content with split-screen layout */}
      <div className={`flex ${selectedLead ? 'h-[calc(100vh-200px)]' : ''}`}>
        {/* Leads List - Takes full width or half when detail panel is open */}
        <div className={`${selectedLead ? 'w-1/2 border-r border-gray-200 overflow-y-auto' : 'w-full'} p-6`}>
          {leads.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <TrendingUp size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Networking Leads Yet</h3>
              <p className="text-gray-600 mb-4">Import a CSV or add your first lead to get started</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload size={18} />
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedLeads).map(([status, statusLeads]) => {
                if (statusLeads.length === 0) return null;
                
                const isExpanded = expandedSections[status];
                
                return (
                  <div key={status} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleSection(status)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <h2 className="text-sm font-semibold text-gray-900">
                          {status.toUpperCase()} ({statusLeads.length})
                        </h2>
                        {status === 'Follow-up Needed' && (
                          <span className="text-xs text-red-600">⚠️ Needs attention</span>
                        )}
                      </div>
                      <span className="text-gray-500 text-sm">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-3 space-y-2">
                        {statusLeads.map(lead => (
                          <div 
                            key={lead.id} 
                            className="relative"
                            onClick={(e) => {
                              // Auto-activate select mode on shift+click
                              if (e.shiftKey && !isSelectMode) {
                                setIsSelectMode(true);
                                handleSelectLead(lead.id, e);
                              }
                            }}
                          >
                            {isSelectMode && (
                              <div
                                className="absolute top-3 left-3 z-10 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectLead(lead.id, e);
                                }}
                              >
                                {selectedIds.has(lead.id) ? (
                                  <CheckSquare className="text-blue-600" size={20} />
                                ) : (
                                  <Square className="text-gray-400 hover:text-gray-600" size={20} />
                                )}
                              </div>
                            )}
                            <div className={isSelectMode ? 'pl-8' : ''}>
                              <NetworkingLeadCardCompact
                                lead={lead}
                                isSelected={selectedLead?.id === lead.id}
                                onClick={() => setSelectedLead(lead)}
                                onFollowUp={handleFollowUp}
                                onLogResponse={handleLogResponse}
                                onScheduleCall={handleScheduleCall}
                                onConvert={handleConvert}
                                onMarkDead={handleMarkDead}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Lead Detail Panel - Shows on right when a lead is selected */}
        {selectedLead && (
          <div className="w-1/2 h-full overflow-hidden">
            <LeadDetailPanel
              lead={selectedLead}
              onClose={() => setSelectedLead(null)}
              onFollowUp={(lead) => { handleFollowUp(lead); setSelectedLead({...lead}); }}
              onLogResponse={(lead) => { handleLogResponse(lead); }}
              onScheduleCall={(lead) => { handleScheduleCall(lead); }}
              onConvert={handleConvert}
              onMarkDead={handleMarkDead}
              onEdit={handleEdit}
              onDelete={(lead) => { handleDelete(lead); setSelectedLead(null); }}
            />
          </div>
        )}
      </div>
      
      {/* Sticky Bottom Metrics Bar */}
      {statistics && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-slate-900 to-slate-800 border-t border-slate-700 px-6 py-3 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-400" />
                <span className="text-slate-300 text-sm">Active:</span>
                <span className="text-white font-bold">{statistics.active}</span>
              </div>
              
              <div className="h-6 w-px bg-slate-700" />
              
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-green-400" />
                <span className="text-slate-300 text-sm">Response Rate:</span>
                <span className="text-white font-bold">{statistics.responseRate}%</span>
                <span className="text-slate-500 text-xs">({statistics.responded}/{statistics.total})</span>
              </div>
              
              <div className="h-6 w-px bg-slate-700" />
              
              <div className="flex items-center gap-2">
                <Phone size={18} className="text-purple-400" />
                <span className="text-slate-300 text-sm">Call Rate:</span>
                <span className="text-white font-bold">{statistics.callConversionRate}%</span>
                <span className="text-slate-500 text-xs">({statistics.callsScheduled}/{statistics.total})</span>
              </div>
              
              <div className="h-6 w-px bg-slate-700" />
              
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-indigo-400" />
                <span className="text-slate-300 text-sm">Converted:</span>
                <span className="text-white font-bold">{statistics.converted}</span>
              </div>
            </div>
            
            {/* Quick Gamification Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <Trophy size={16} className="text-yellow-400" />
                <span className="text-white font-medium">{(score?.totalScore || 0).toLocaleString()} pts</span>
              </div>
              
              {streak?.currentStreak > 0 && (
                <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1.5 rounded-full">
                  <Flame size={16} className="text-orange-400" />
                  <span className="text-orange-300 font-medium">{streak.currentStreak}-day streak</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lead Form Modal */}
      {showLeadForm && (
        <LeadForm
          lead={editingLead}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
      
      {/* Duplicate Warning Modal (for single conversions) */}
      {showDuplicateModal && duplicateResult && (
        <DuplicateWarningModal
          isOpen={true}
          duplicateResult={duplicateResult}
          entryName={pendingConversion ? `${pendingConversion.lead.firstName} ${pendingConversion.lead.lastName}` : 'Contact'}
          onAddAnyway={handleDuplicateAddAnyway}
          onSkip={handleDuplicateSkip}
          onClose={handleCloseDuplicateModal}
        />
      )}
      
      {/* Lead Duplicate Warning Modal (for new lead additions) */}
      {showLeadDuplicateModal && leadDuplicateResult && (
        <DuplicateWarningModal
          isOpen={true}
          duplicateResult={leadDuplicateResult}
          entryName={pendingLeadData ? `${pendingLeadData.firstName} ${pendingLeadData.lastName}` : 'Lead'}
          onAddAnyway={handleLeadDuplicateAddAnyway}
          onSkip={handleLeadDuplicateSkip}
          onClose={handleCloseLeadDuplicateModal}
        />
      )}
      
      {/* Batch Duplicate Modal (for CSV imports with 10+ duplicates) */}
      {showBatchDuplicateModal && batchDuplicateResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={closeBatchDuplicateModal}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                CSV Contains Many Duplicates
              </h3>
              <p className="text-gray-600 mb-4">
                Your CSV file contains {batchDuplicateResult.blocked.length + batchDuplicateResult.warnings.length} potential duplicates:
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Clean entries (no duplicates):</span>
                  <span className="font-medium text-green-600">{batchDuplicateResult.clean.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Similar names (warnings):</span>
                  <span className="font-medium text-yellow-600">{batchDuplicateResult.warnings.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Exact duplicates (same LinkedIn):</span>
                  <span className="font-medium text-red-600">{batchDuplicateResult.blocked.length}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-medium">
                  <span>Total in CSV:</span>
                  <span>{pendingImportLeads.length}</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                What would you like to do?
              </p>
              
              <div className="space-y-2">
                <button
                  onClick={handleBatchImportAll}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Import All ({pendingImportLeads.length} leads)
                </button>
                <button
                  onClick={handleBatchImportClean}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Import Only Non-Duplicates ({batchDuplicateResult.clean.length} leads)
                </button>
                <button
                  onClick={closeBatchDuplicateModal}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Cancel Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Assistant for Leads */}
      <AIAssistant dataSource="leads" data={leads} />
    </div>
  );
};

export default NetworkingTracker;
