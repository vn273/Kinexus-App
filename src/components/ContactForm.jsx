import { useState, useEffect, useMemo } from 'react';
import { X, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCompanySuggestions, getJobTitleSuggestions } from '../services/searchService';
import { useContacts } from '../contexts/ContactContext';
import { useSettings } from '../contexts/SettingsContext';
import { debouncedSearchLocations } from '../services/locationService';
import { REMINDER_INTERVALS, DEFAULT_CRM_INTERVAL, calculateNextReminder } from '../services/reminderService';

const ContactForm = ({ contact, onSubmit, onCancel }) => {
  const { contacts } = useContacts();
  const { relationshipTypes, sectors, loading: settingsLoading } = useSettings();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    jobTitle: '',
    role: '', // Keep for backwards compatibility
    location: '',
    relationshipTypes: [], // Changed to array for multi-select
    sector: '',
    tags: '',
    email: '',
    phone: '',
    linkedInUrl: '',
    notes: '',
    strategicValue: 3,
    relationshipCloseness: 5,
    introducedBy: '',
    contactRegularity: '6-months',
    lastContactDate: '',
    // Reminder fields
    reminderEnabled: true,
    reminderInterval: DEFAULT_CRM_INTERVAL,
    nextReminderDate: null
  });
  
  // Contact regularity options
  const CONTACT_REGULARITY_OPTIONS = [
    { value: '3-years', label: 'Every 3 years', days: 1095 },
    { value: '1-year', label: 'Every year', days: 365 },
    { value: '6-months', label: 'Every 6 months', days: 180 },
    { value: '3-months', label: 'Every 3 months', days: 90 },
    { value: '1-month', label: 'Every month', days: 30 },
    { value: '2-weeks', label: 'Every 2 weeks', days: 14 },
    { value: '1-week', label: 'Every week', days: 7 },
    { value: '3-days', label: 'Every 3 days', days: 3 },
    { value: '1-day', label: 'Every day', days: 1 }
  ];
  
  const [companySuggestions, setCompanySuggestions] = useState([]);
  const [jobTitleSuggestions, setJobTitleSuggestions] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [showJobTitleSuggestions, setShowJobTitleSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (contact) {
      let lastContactDateStr = '';
      if (contact.lastContactDate) {
        try {
          const date = new Date(contact.lastContactDate);
          if (!isNaN(date.getTime())) {
            lastContactDateStr = date.toISOString().split('T')[0];
          }
        } catch (error) {
          console.error('Error parsing date:', error);
        }
      }
      
      // Handle backwards compatibility: convert old relationshipType to new relationshipTypes array
      let relationshipTypes = contact.relationshipTypes || [];
      if (!relationshipTypes.length && contact.relationshipType) {
        relationshipTypes = [contact.relationshipType];
      }
      
      setFormData({
        ...contact,
        jobTitle: contact.jobTitle || contact.role || '',
        relationshipTypes,
        tags: Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
        lastContactDate: lastContactDateStr,
        // Reminder fields with defaults for backwards compatibility
        reminderEnabled: contact.reminderEnabled !== undefined ? contact.reminderEnabled : true,
        reminderInterval: contact.reminderInterval || DEFAULT_CRM_INTERVAL,
        nextReminderDate: contact.nextReminderDate || null
      });
    }
  }, [contact]);
  
  // Update company suggestions
  useEffect(() => {
    if (formData.company && formData.company.length >= 2) {
      const suggestions = getCompanySuggestions(contacts, formData.company);
      setCompanySuggestions(suggestions);
    } else {
      setCompanySuggestions([]);
    }
  }, [formData.company, contacts]);
  
  // Update job title suggestions
  useEffect(() => {
    if (formData.jobTitle && formData.jobTitle.length >= 2) {
      const suggestions = getJobTitleSuggestions(contacts, formData.jobTitle);
      setJobTitleSuggestions(suggestions);
    } else {
      setJobTitleSuggestions([]);
    }
  }, [formData.jobTitle, contacts]);

  // Update location suggestions
  useEffect(() => {
    if (formData.location && formData.location.length >= 2) {
      setLocationLoading(true);
      debouncedSearchLocations(formData.location, (results) => {
        // Extract display strings from result objects
        const displayStrings = results.map(r => 
          typeof r === 'string' ? r : (r.display || '')
        ).filter(Boolean);
        setLocationSuggestions(displayStrings);
        setLocationLoading(false);
      });
    } else {
      setLocationSuggestions([]);
    }
  }, [formData.location]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate relationship types
    if (!formData.relationshipTypes || formData.relationshipTypes.length === 0) {
      alert('Please select at least one relationship type');
      return;
    }
    
    const lastContactDateParsed = formData.lastContactDate 
      ? new Date(formData.lastContactDate)
      : null;
    
    // Calculate next reminder date if reminders are enabled
    let nextReminderDate = formData.nextReminderDate;
    if (formData.reminderEnabled && formData.reminderInterval) {
      nextReminderDate = calculateNextReminder(
        lastContactDateParsed || new Date(),
        formData.reminderInterval
      );
    }
    
    const submitData = {
      ...formData,
      role: formData.jobTitle, // Sync for backwards compatibility
      tags: formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [],
      lastContactDate: lastContactDateParsed,
      // Reminder fields
      reminderEnabled: formData.reminderEnabled,
      reminderInterval: formData.reminderInterval,
      nextReminderDate: nextReminderDate
    };

    onSubmit(submitData);
  };

  const selectCompanySuggestion = (company) => {
    setFormData({ ...formData, company });
    setShowCompanySuggestions(false);
  };
  
  const selectJobTitleSuggestion = (title) => {
    setFormData({ ...formData, jobTitle: title });
    setShowJobTitleSuggestions(false);
  };

  const selectLocationSuggestion = (location) => {
    setFormData({ ...formData, location });
    setShowLocationSuggestions(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="John"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Doe"
          />
        </div>
      </div>

      {/* Job Title with autocomplete */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Job Title
        </label>
        <input
          type="text"
          value={formData.jobTitle}
          onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
          onFocus={() => setShowJobTitleSuggestions(true)}
          onBlur={() => setTimeout(() => setShowJobTitleSuggestions(false), 200)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Investment Analyst"
        />
        {showJobTitleSuggestions && jobTitleSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {jobTitleSuggestions.map((title, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectJobTitleSuggestion(title)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
              >
                {title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Company with autocomplete */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company
        </label>
        <input
          type="text"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          onFocus={() => setShowCompanySuggestions(true)}
          onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 200)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Point72, KKR, Deloitte..."
        />
        {showCompanySuggestions && companySuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {companySuggestions.map((company, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectCompanySuggestion(company)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
              >
                {company}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Location with autocomplete */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <input
          type="text"
          value={formData.location || ''}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          onFocus={() => setShowLocationSuggestions(true)}
          onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Start typing a city name..."
        />
        {showLocationSuggestions && (locationSuggestions.length > 0 || locationLoading) && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {locationLoading && (
              <div className="px-3 py-2 text-sm text-gray-500">
                Searching locations...
              </div>
            )}
            {locationSuggestions.map((location, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectLocationSuggestion(location)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
              >
                {location}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Relationship Types - Multi-Select */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Relationship Types <span className="text-red-500">*</span>
          </label>
          <Link 
            to="/settings" 
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Settings size={12} />
            Edit options
          </Link>
        </div>
        <div className="border border-gray-300 rounded-md p-2 max-h-48 overflow-y-auto bg-white">
          {relationshipTypes.map(type => {
            const isSelected = (formData.relationshipTypes || []).includes(type.value);
            return (
              <label
                key={type.value}
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 ${
                  isSelected ? 'bg-blue-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    const currentTypes = formData.relationshipTypes || [];
                    if (e.target.checked) {
                      setFormData({ ...formData, relationshipTypes: [...currentTypes, type.value] });
                    } else {
                      setFormData({ ...formData, relationshipTypes: currentTypes.filter(t => t !== type.value) });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{type.label}</span>
              </label>
            );
          })}
        </div>
        {(formData.relationshipTypes || []).length === 0 && (
          <p className="text-xs text-red-500 mt-1">Please select at least one relationship type</p>
        )}
      </div>

      {/* Sector/Industry - Single Select Dropdown */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Sector / Industry
          </label>
          <Link 
            to="/settings" 
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Settings size={12} />
            Edit options
          </Link>
        </div>
        <select
          value={formData.sector || ''}
          onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select sector...</option>
          {sectors.map(sector => (
            <option key={sector.value} value={sector.value}>
              {sector.label}
            </option>
          ))}
        </select>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="john@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+1234567890"
          />
        </div>
      </div>

      {/* LinkedIn URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          LinkedIn URL
        </label>
        <input
          type="url"
          value={formData.linkedInUrl}
          onChange={(e) => setFormData({ ...formData, linkedInUrl: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://linkedin.com/in/username"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="recruiting, alumni, finance..."
        />
        <p className="text-xs text-gray-500 mt-1">Use tags for additional context and easier searching</p>
      </div>

      {/* Strategic Value and Relationship Closeness */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Strategic Value
          </label>
          <select
            value={formData.strategicValue}
            onChange={(e) => setFormData({ ...formData, strategicValue: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[...Array(10)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} {i === 0 ? '- Minimal' : i === 4 ? '- Moderate' : i === 9 ? '- Critical' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Professional/career value</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Relationship Closeness
          </label>
          <select
            value={formData.relationshipCloseness || 5}
            onChange={(e) => setFormData({ ...formData, relationshipCloseness: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[...Array(10)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} {i === 0 ? '- Distant' : i === 4 ? '- Acquaintance' : i === 6 ? '- Close' : i === 9 ? '- Very Close' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Personal relationship strength</p>
        </div>
      </div>
      
      {/* Introduced By */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Introduced By
        </label>
        <input
          type="text"
          value={formData.introducedBy || ''}
          onChange={(e) => setFormData({ ...formData, introducedBy: e.target.value || '' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Name of person who introduced you (or leave blank)"
        />
        <p className="text-xs text-gray-500 mt-1">Who introduced you to this contact?</p>
      </div>

      {/* Last Contact Date and Contact Regularity */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Contact Date
          </label>
          <input
            type="date"
            value={formData.lastContactDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setFormData({ ...formData, lastContactDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Cannot be a future date</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Regularity
          </label>
          <select
            value={formData.contactRegularity || '6-months'}
            onChange={(e) => setFormData({ ...formData, contactRegularity: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CONTACT_REGULARITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">How often to stay in touch</p>
        </div>
      </div>

      {/* Reminder Settings */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">
            Follow-up Reminders
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.reminderEnabled}
              onChange={(e) => setFormData({ ...formData, reminderEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        {formData.reminderEnabled && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Reminder Interval</label>
              <select
                value={formData.reminderInterval}
                onChange={(e) => {
                  const newInterval = e.target.value;
                  const nextDate = calculateNextReminder(
                    formData.lastContactDate ? new Date(formData.lastContactDate) : new Date(),
                    newInterval
                  );
                  setFormData({ 
                    ...formData, 
                    reminderInterval: newInterval,
                    nextReminderDate: nextDate
                  });
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(REMINDER_INTERVALS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            {formData.nextReminderDate && (
              <p className="text-xs text-gray-500">
                Next reminder: {new Date(formData.nextReminderDate).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add any notes about this contact..."
        />
      </div>

      {/* Form actions */}
      <div className="flex gap-3 justify-end pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          {contact ? 'Update Contact' : 'Add Contact'}
        </button>
      </div>
    </form>
  );
};

export default ContactForm;
