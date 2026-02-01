import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, X, Edit, Link as LinkIcon, Plus, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useContacts } from '../contexts/ContactContext';
import NetworkGraph from '../components/NetworkGraph';
import GraphControls from '../components/GraphControls';
import ContactForm from '../components/ContactForm';
import AIAssistant from '../components/AIAssistant';
import { getConnections, addConnection, recordIntroduction, recordMutualConnection, CONNECTION_TYPES } from '../services/connectionService';
import { RELATIONSHIP_TYPES } from '../constants/categories';

const NetworkGraphPage = () => {
  const { currentUser } = useAuth();
  const { contacts, updateContact } = useContacts();
  const graphRef = useRef(null);
  
  // Graph state
  const [viewType, setViewType] = useState('closeness');
  const [filters, setFilters] = useState({});
  const [showIntroductions, setShowIntroductions] = useState(true);
  const [showMutualConnections, setShowMutualConnections] = useState(true);
  const [connections, setConnections] = useState([]);
  
  // UI state
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddConnectionModal, setShowAddConnectionModal] = useState(false);
  const [connectionType, setConnectionType] = useState('mutual_friends');
  const [connectionTarget, setConnectionTarget] = useState(null);
  const [connectionNotes, setConnectionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Load connections
  useEffect(() => {
    const loadConnections = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      try {
        const userConnections = await getConnections(currentUser.uid);
        setConnections(userConnections);
      } catch (error) {
        console.error('Error loading connections:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadConnections();
  }, [currentUser]);
  
  // Handle node click
  const handleNodeClick = useCallback((node) => {
    if (node.type === 'user') return;
    
    setSelectedNode(node.id);
    setSelectedContact(node.data);
    setShowContactPanel(true);
    setShowEditForm(false);
  }, []);
  
  // Handle contact update
  const handleContactUpdate = async (contactData) => {
    try {
      await updateContact(selectedContact.id, contactData);
      setSelectedContact({ ...selectedContact, ...contactData });
      setShowEditForm(false);
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Failed to update contact');
    }
  };
  
  // Handle adding a connection
  const handleAddConnection = async () => {
    if (!selectedContact || !connectionTarget) {
      alert('Please select a contact to connect with');
      return;
    }
    
    try {
      if (connectionType === 'introduced') {
        await recordIntroduction(
          currentUser.uid,
          selectedContact.id, // The one who introduced
          connectionTarget, // The one being introduced
          connectionNotes
        );
      } else {
        await recordMutualConnection(
          currentUser.uid,
          selectedContact.id,
          connectionTarget,
          connectionType,
          3,
          connectionNotes
        );
      }
      
      // Reload connections
      const userConnections = await getConnections(currentUser.uid);
      setConnections(userConnections);
      
      // Reset modal
      setShowAddConnectionModal(false);
      setConnectionTarget(null);
      setConnectionNotes('');
      
      alert('Connection added successfully!');
    } catch (error) {
      console.error('Error adding connection:', error);
      alert('Failed to add connection');
    }
  };
  
  // Reset view
  const handleResetView = () => {
    setFilters({});
    setSelectedNode(null);
    setShowContactPanel(false);
    
    // Reset graph zoom/position
    if (graphRef.current) {
      graphRef.current.centerAt(0, 0, 500);
      graphRef.current.zoom(1, 500);
    }
  };
  
  // Export as PNG
  const handleExportPNG = () => {
    // Note: react-force-graph doesn't have built-in PNG export
    // We could implement canvas capture here
    alert('PNG export coming soon!');
  };
  
  // Close panel
  const handleClosePanel = () => {
    setShowContactPanel(false);
    setSelectedNode(null);
    setSelectedContact(null);
    setShowEditForm(false);
  };
  
  // Get relationship label
  const getRelationshipLabel = (value) => {
    const type = RELATIONSHIP_TYPES.find(t => t.value === value);
    return type ? type.label : value || 'Not set';
  };
  
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
          <p className="text-gray-600">Please log in to access the Network Graph.</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading network graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              Back to Contacts
            </Link>
            <div className="border-l border-gray-300 pl-4">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users size={24} />
                Network Graph
              </h1>
              <p className="text-sm text-gray-600">
                Visualize your professional network
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {contacts.length} contacts • {connections.length} connections
            </span>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph area */}
        <div className="flex-1 relative">
          <NetworkGraph
            contacts={contacts}
            connections={connections}
            viewType={viewType}
            filters={filters}
            showIntroductions={showIntroductions}
            showMutualConnections={showMutualConnections}
            selectedNode={selectedNode}
            onNodeClick={handleNodeClick}
            graphRef={graphRef}
          />
          
          {/* View type toggle (floating) */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-1 flex">
            <button
              onClick={() => setViewType('closeness')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewType === 'closeness'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Closeness
            </button>
            <button
              onClick={() => setViewType('strategic')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewType === 'strategic'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Strategic Value
            </button>
          </div>
          
          {/* Contact Detail Panel */}
          {showContactPanel && selectedContact && (
            <div className="absolute top-0 right-72 bottom-0 w-80 bg-white border-l border-gray-200 shadow-lg overflow-y-auto">
              {/* Panel header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  {showEditForm ? 'Edit Contact' : 'Contact Details'}
                </h3>
                <div className="flex items-center gap-2">
                  {!showEditForm && (
                    <button
                      onClick={() => setShowEditForm(true)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit size={18} />
                    </button>
                  )}
                  <button
                    onClick={handleClosePanel}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              
              {/* Panel content */}
              <div className="p-4">
                {showEditForm ? (
                  <ContactForm
                    contact={selectedContact}
                    onSubmit={handleContactUpdate}
                    onCancel={() => setShowEditForm(false)}
                  />
                ) : (
                  <div className="space-y-4">
                    {/* Name and title */}
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">
                        {selectedContact.firstName} {selectedContact.lastName}
                      </h4>
                      {selectedContact.jobTitle && (
                        <p className="text-gray-600">{selectedContact.jobTitle}</p>
                      )}
                      {selectedContact.company && (
                        <p className="text-gray-600">{selectedContact.company}</p>
                      )}
                    </div>
                    
                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-700">
                          {selectedContact.relationshipCloseness || 5}
                        </p>
                        <p className="text-xs text-blue-600">Closeness</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-green-700">
                          {selectedContact.strategicValue || 3}
                        </p>
                        <p className="text-xs text-green-600">Strategic Value</p>
                      </div>
                    </div>
                    
                    {/* Relationship types */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Relationship Types</p>
                      <div className="flex flex-wrap gap-1">
                        {(selectedContact.relationshipTypes?.length > 0 
                          ? selectedContact.relationshipTypes 
                          : (selectedContact.relationshipType ? [selectedContact.relationshipType] : [])
                        ).map((type, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {getRelationshipLabel(type)}
                          </span>
                        ))}
                        {!selectedContact.relationshipTypes?.length && !selectedContact.relationshipType && (
                          <span className="text-sm text-gray-400">Not set</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Introduced by */}
                    {selectedContact.introducedBy && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Introduced By</p>
                        <p className="text-sm text-gray-900">
                          {(() => {
                            const introducer = contacts.find(c => c.id === selectedContact.introducedBy);
                            return introducer 
                              ? `${introducer.firstName} ${introducer.lastName}`
                              : 'Unknown';
                          })()}
                        </p>
                      </div>
                    )}
                    
                    {/* Contact info */}
                    {selectedContact.email && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                        <p className="text-sm text-gray-900">{selectedContact.email}</p>
                      </div>
                    )}
                    
                    {selectedContact.linkedInUrl && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">LinkedIn</p>
                        <a
                          href={selectedContact.linkedInUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View Profile
                        </a>
                      </div>
                    )}
                    
                    {/* Notes */}
                    {selectedContact.notes && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {selectedContact.notes}
                        </p>
                      </div>
                    )}
                    
                    {/* Add connection button */}
                    <button
                      onClick={() => setShowAddConnectionModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      <LinkIcon size={16} />
                      Add Connection to Another Contact
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Controls sidebar */}
        <GraphControls
          contacts={contacts}
          viewType={viewType}
          onViewTypeChange={setViewType}
          filters={filters}
          onFiltersChange={setFilters}
          showIntroductions={showIntroductions}
          onShowIntroductionsChange={setShowIntroductions}
          showMutualConnections={showMutualConnections}
          onShowMutualConnectionsChange={setShowMutualConnections}
          onResetView={handleResetView}
          onExportPNG={handleExportPNG}
        />
      </div>
      
      {/* Add Connection Modal */}
      {showAddConnectionModal && selectedContact && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowAddConnectionModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add Connection from {selectedContact.firstName}
              </h3>
              
              {/* Connection type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Connection Type
                </label>
                <select
                  value={connectionType}
                  onChange={(e) => setConnectionType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="introduced">{selectedContact.firstName} introduced me to...</option>
                  <option value="mutual_friends">Mutual friends with...</option>
                  <option value="colleagues">Colleagues with...</option>
                  <option value="classmates">Classmates with...</option>
                  <option value="family">Family with...</option>
                </select>
              </div>
              
              {/* Target contact */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Contact
                </label>
                <select
                  value={connectionTarget || ''}
                  onChange={(e) => setConnectionTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a contact...</option>
                  {contacts
                    .filter(c => c.id !== selectedContact.id)
                    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                    .map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName}
                        {contact.company ? ` (${contact.company})` : ''}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={connectionNotes}
                  onChange={(e) => setConnectionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="e.g., Met at industry conference"
                />
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowAddConnectionModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddConnection}
                  disabled={!connectionTarget}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Connection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Assistant for Network Graph */}
      <AIAssistant 
        dataSource="contacts" 
        title="AI Network Graph Assistant"
        placeholder="Ask about your network connections..."
      />
    </div>
  );
};

export default NetworkGraphPage;
