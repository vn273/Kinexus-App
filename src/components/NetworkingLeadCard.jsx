import { Building2, MapPin, Mail, Calendar, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { parseDate, formatDateWithYear } from '../utils/dateHelpers';

const NetworkingLeadCard = ({ lead, onFollowUp, onLogResponse, onScheduleCall, onConvert, onMarkDead, onEdit, onDelete }) => {
  const getStatusBadge = () => {
    const badges = {
      'Follow-up Needed': 'bg-red-100 text-red-800 border-red-300',
      'Pending Response': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Call Scheduled': 'bg-green-100 text-green-800 border-green-300',
      'Converted to Contact': 'bg-blue-100 text-blue-800 border-blue-300',
      'Dead Lead': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    
    return badges[lead.status] || 'bg-gray-100 text-gray-800';
  };
  
  const getDaysSinceContact = () => {
    if (!lead.dateContacted) return null;
    const contactDate = parseDate(lead.dateContacted);
    if (!contactDate) return null;
    const days = Math.floor((new Date() - contactDate) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };
  
  const getFollowUpText = () => {
    if (!lead.followUpDate) return null;
    const followUpDate = parseDate(lead.followUpDate);
    if (!followUpDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUpDateNormalized = new Date(followUpDate);
    followUpDateNormalized.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((followUpDateNormalized - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    return formatDateWithYear(lead.followUpDate);
  };
  
  // Check if follow-up date is past due
  const isFollowUpPastDue = () => {
    if (!lead.followUpDate) return false;
    const followUpDate = parseDate(lead.followUpDate);
    if (!followUpDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return followUpDate < today;
  };
  
  return (
    <div className={`p-4 rounded-lg border-2 bg-white hover:shadow-md transition-shadow ${
      lead.status === 'Follow-up Needed' ? 'border-red-300' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {lead.status === 'Follow-up Needed' && (
              <span className="text-red-500 text-xl">⚠️</span>
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              {lead.firstName} {lead.lastName}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
            <Building2 size={14} />
            <span className="font-medium">{lead.firm}</span>
            {lead.title && (
              <>
                <span>•</span>
                <span>{lead.title}</span>
              </>
            )}
          </div>
          
          {lead.divisionGroup && (
            <div className="text-sm text-gray-600 mt-1">
              {lead.divisionGroup}
            </div>
          )}
        </div>
        
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge()}`}>
          {lead.status}
        </span>
      </div>
      
      {/* Location and Contact Info */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-3">
        {lead.location && (
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span>{lead.location}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-1">
            <Mail size={12} />
            <span>{lead.email}</span>
          </div>
        )}
      </div>
      
      {/* Commonalities */}
      {lead.commonalities && (
        <div className="mb-3">
          <span className="text-xs text-gray-500">Commonalities: </span>
          <span className="text-xs text-gray-700">{lead.commonalities}</span>
        </div>
      )}
      
      {/* Date Info */}
      <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
        <Calendar size={12} />
        <span>
          Contacted: {lead.dateContacted ? formatDateWithYear(lead.dateContacted) : 'Not set'}
        </span>
        {getDaysSinceContact() && (
          <span className="text-gray-500">({getDaysSinceContact()})</span>
        )}
      </div>
      
      {/* Follow-up Date */}
      {lead.followUpDate && (
        <div className="flex items-center gap-1 text-xs mb-3">
          <Clock size={12} />
          <span className="text-gray-600">Follow up on: </span>
          <span className={`font-medium ${
            isFollowUpPastDue() ? 'text-red-600' : 'text-blue-600'
          }`}>
            {getFollowUpText()}
          </span>
        </div>
      )}
      
      {/* Checkboxes */}
      <div className="flex gap-4 mb-3 text-sm">
        <div className="flex items-center gap-1">
          {lead.reachedOut ? (
            <CheckCircle size={16} className="text-green-600" />
          ) : (
            <XCircle size={16} className="text-gray-400" />
          )}
          <span className={lead.reachedOut ? 'text-gray-900' : 'text-gray-500'}>
            Reached Out
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {lead.response ? (
            <CheckCircle size={16} className="text-green-600" />
          ) : (
            <XCircle size={16} className="text-gray-400" />
          )}
          <span className={lead.response ? 'text-gray-900' : 'text-gray-500'}>
            Response
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {lead.callScheduled ? (
            <CheckCircle size={16} className="text-green-600" />
          ) : (
            <XCircle size={16} className="text-gray-400" />
          )}
          <span className={lead.callScheduled ? 'text-gray-900' : 'text-gray-500'}>
            Call
          </span>
        </div>
      </div>
      
      {/* Notes */}
      {lead.notes && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
          {lead.notes}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {lead.status === 'Follow-up Needed' && (
          <button
            onClick={() => onFollowUp(lead)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            Follow Up
          </button>
        )}
        
        {!lead.response && lead.status !== 'Converted to Contact' && (
          <button
            onClick={() => onLogResponse(lead)}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
          >
            Log Response
          </button>
        )}
        
        {lead.response && !lead.callScheduled && lead.status !== 'Converted to Contact' && (
          <button
            onClick={() => onScheduleCall(lead)}
            className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
          >
            Schedule Call
          </button>
        )}
        
        {lead.status !== 'Converted to Contact' && lead.status !== 'Dead Lead' && (
          <button
            onClick={() => onConvert(lead)}
            className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100 transition-colors"
          >
            Convert to Contact
          </button>
        )}
        
        <button
          onClick={() => onEdit(lead)}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
        >
          Edit
        </button>
        
        {lead.status !== 'Dead Lead' && lead.status !== 'Converted to Contact' && (
          <button
            onClick={() => onMarkDead(lead)}
            className="px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded hover:bg-orange-100 transition-colors"
          >
            Mark as Dead
          </button>
        )}
        
        {onDelete && (
          <button
            onClick={() => onDelete(lead)}
            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors flex items-center gap-1"
          >
            <Trash2 size={12} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default NetworkingLeadCard;
