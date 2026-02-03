import { useState, useEffect } from 'react';
import { X, Plus, Trash2, RotateCcw } from 'lucide-react';

// Helper to parse date safely (handles timezone issues)
const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Handle Firestore Timestamp
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

// Helper to format date for input field (YYYY-MM-DD)
const formatDateForInput = (date) => {
  if (!date) return '';
  const d = parseDate(date);
  if (!d || isNaN(d.getTime())) return '';
  // Format as YYYY-MM-DD using local date parts
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to format follow-up date for display
const formatFollowUpDisplay = (entry) => {
  if (!entry) return '';
  const dateValue = entry.date || entry;
  const d = parseDate(dateValue);
  if (!d || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const LeadForm = ({ lead, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(() => {
    const defaults = {
      firstName: '',
      lastName: '',
      firm: '',
      title: '',
      divisionGroup: '',
      commonalities: '',
      location: '',
      linkedInUrl: '',
      email: '',
      phone: '',
      notes: '',
      reachedOut: false,
      dateContacted: '',
      response: false,
      responseDate: '',
      callScheduled: false,
      callDate: '',
    };
    
    if (lead) {
      return {
        ...defaults,
        ...lead,
        // Ensure dates are properly formatted when editing
        dateContacted: formatDateForInput(lead.dateContacted),
        responseDate: formatDateForInput(lead.responseDate),
        callDate: formatDateForInput(lead.callDate || lead.followUpDate),
      };
    }
    
    return defaults;
  });

  // Separate state for managing follow-ups list
  const [followUpsList, setFollowUpsList] = useState([]);
  const [newFollowUpDate, setNewFollowUpDate] = useState('');
  const [newFollowUpNotes, setNewFollowUpNotes] = useState('');

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (lead) {
      setFormData(prev => ({ 
        ...prev, 
        ...lead,
        // Format dates properly for input fields
        dateContacted: formatDateForInput(lead.dateContacted),
        responseDate: formatDateForInput(lead.responseDate),
        callDate: formatDateForInput(lead.callDate || lead.followUpDate),
      }));
      
      // Initialize follow-ups list from lead data
      const existingFollowUps = (lead.followUpDates || []).map(entry => {
        if (typeof entry === 'object' && entry.date) {
          return {
            date: formatDateForInput(entry.date),
            notes: entry.notes || ''
          };
        }
        return { date: formatDateForInput(entry), notes: '' };
      });
      setFollowUpsList(existingFollowUps);
    }
  }, [lead]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Follow-up management handlers
  const handleAddFollowUp = () => {
    if (!newFollowUpDate) return;
    
    setFollowUpsList(prev => [...prev, {
      date: newFollowUpDate,
      notes: newFollowUpNotes
    }]);
    setNewFollowUpDate('');
    setNewFollowUpNotes('');
  };

  const handleRemoveFollowUp = (index) => {
    setFollowUpsList(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.firm?.trim()) {
      newErrors.firm = 'Firm/Company is required';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (formData.reachedOut && !formData.dateContacted) {
      newErrors.dateContacted = 'Date contacted is required when reached out is checked';
    }
    
    if (formData.response && !formData.responseDate) {
      newErrors.responseDate = 'Response date is required when response is checked';
    }
    
    if (formData.callScheduled && !formData.callDate) {
      newErrors.callDate = 'Call date is required when call scheduled is checked';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    // Include follow-ups in the submitted data
    const submitData = {
      ...formData,
      followUpDates: followUpsList.map(fu => ({
        date: fu.date,
        notes: fu.notes
      })),
      followUpCount: followUpsList.length,
      lastFollowUpDate: followUpsList.length > 0 
        ? followUpsList[followUpsList.length - 1].date 
        : null
    };

    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {lead ? 'Edit Lead' : 'Add New Lead'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firm/Company <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firm"
                  value={formData.firm}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.firm ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Acme Corp"
                />
                {errors.firm && (
                  <p className="text-red-500 text-xs mt-1">{errors.firm}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Software Engineer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Division/Group
                </label>
                <input
                  type="text"
                  name="divisionGroup"
                  value={formData.divisionGroup}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Technology Division"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Los Angeles, CA"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commonalities/Shared Connections
              </label>
              <input
                type="text"
                name="commonalities"
                value={formData.commonalities}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="UCLA alumni, tech community"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Contact Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn URL
              </label>
              <input
                type="url"
                name="linkedInUrl"
                value={formData.linkedInUrl}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Outreach Status */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Outreach Status
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="reachedOut"
                  id="reachedOut"
                  checked={formData.reachedOut}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="reachedOut" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Reached Out
                  </label>
                  {formData.reachedOut && (
                    <div className="mt-2">
                      <label className="block text-sm text-gray-600 mb-1">
                        Date Contacted <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="dateContacted"
                        value={formData.dateContacted}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.dateContacted ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.dateContacted && (
                        <p className="text-red-500 text-xs mt-1">{errors.dateContacted}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="response"
                  id="response"
                  checked={formData.response}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="response" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Received Response
                  </label>
                  {formData.response && (
                    <div className="mt-2">
                      <label className="block text-sm text-gray-600 mb-1">
                        Response Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="responseDate"
                        value={formData.responseDate}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.responseDate ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.responseDate && (
                        <p className="text-red-500 text-xs mt-1">{errors.responseDate}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="callScheduled"
                  id="callScheduled"
                  checked={formData.callScheduled}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="callScheduled" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Call Scheduled
                  </label>
                  {formData.callScheduled && (
                    <div className="mt-2">
                      <label className="block text-sm text-gray-600 mb-1">
                        Call Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="callDate"
                        value={formData.callDate}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.callDate ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.callDate && (
                        <p className="text-red-500 text-xs mt-1">{errors.callDate}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Follow-ups Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <RotateCcw size={16} className="text-indigo-500" />
              Follow-up History
              {followUpsList.length > 0 && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-normal">
                  {followUpsList.length}
                </span>
              )}
            </h3>
            
            {/* Existing Follow-ups List */}
            {followUpsList.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                {followUpsList.map((fu, index) => (
                  <div 
                    key={index} 
                    className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100"
                  >
                    <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-indigo-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700">
                        {new Date(fu.date).toLocaleDateString('en-US', { 
                          month: 'short', day: 'numeric', year: 'numeric' 
                        })}
                      </div>
                      {fu.notes && (
                        <div className="text-xs text-gray-500 mt-0.5 break-words">
                          {fu.notes}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFollowUp(index)}
                      className="flex-shrink-0 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove follow-up"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Follow-up */}
            <div className="border border-gray-200 rounded-lg p-3 bg-white">
              <div className="text-sm font-medium text-gray-700 mb-2">Add Follow-up</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={newFollowUpDate}
                    onChange={(e) => setNewFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={newFollowUpNotes}
                    onChange={(e) => setNewFollowUpNotes(e.target.value)}
                    placeholder="Brief note about this follow-up"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddFollowUp}
                disabled={!newFollowUpDate}
                className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  newFollowUpDate 
                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' 
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                }`}
              >
                <Plus size={14} />
                Add Follow-up
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add any additional notes about this lead..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              {lead ? 'Update Lead' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadForm;
