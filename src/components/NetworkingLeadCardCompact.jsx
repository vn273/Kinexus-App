import { Building2, MapPin, Calendar, CheckCircle, XCircle, Trash2, Phone, Mail, Clock, User, ChevronDown, ChevronUp, MessageCircle, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { parseDate, formatDateShort, formatDateWithYear } from '../utils/dateHelpers';

const NetworkingLeadCardCompact = ({ 
  lead, 
  onFollowUp, 
  onLogResponse, 
  onScheduleCall, 
  onConvert, 
  onMarkDead, 
  onEdit, 
  onDelete,
  onRecordFollowUp,
  isSelected,
  onClick 
}) => {
  const [showFollowUps, setShowFollowUps] = useState(false);
  const getStatusColor = () => {
    const colors = {
      'Follow-up Needed': 'border-l-red-500 bg-gradient-to-r from-red-50/80 to-white',
      'Pending Response': 'border-l-yellow-500 bg-gradient-to-r from-yellow-50/60 to-white',
      'Call Scheduled': 'border-l-green-500 bg-gradient-to-r from-green-50/60 to-white',
      'Converted to Contact': 'border-l-blue-500 bg-gradient-to-r from-blue-50/60 to-white',
      'Dead Lead': 'border-l-gray-400 bg-gradient-to-r from-gray-50/60 to-white'
    };
    return colors[lead.status] || 'border-l-gray-300';
  };

  const getStatusBadge = () => {
    const badges = {
      'Follow-up Needed': { bg: 'bg-red-100', text: 'text-red-700', label: 'Follow-up' },
      'Pending Response': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      'Call Scheduled': { bg: 'bg-green-100', text: 'text-green-700', label: 'Call Set' },
      'Converted to Contact': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Converted' },
      'Dead Lead': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Dead' }
    };
    return badges[lead.status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: lead.status };
  };
  
  const getDaysSinceContact = () => {
    if (!lead.dateContacted) return null;
    const contactDate = parseDate(lead.dateContacted);
    if (!contactDate) return null;
    const days = Math.floor((new Date() - contactDate) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const formatFollowUpEntryDate = (entry) => {
    if (!entry) return '—';
    // Handle both Firestore Timestamp and Date objects/strings
    const dateValue = entry.date?.toDate ? entry.date.toDate() : entry.date;
    return formatDateWithYear(dateValue);
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

  // Get follow-up history (handle both array of objects and legacy format)
  const followUpHistory = (lead.followUpDates || []).map(entry => {
    if (typeof entry === 'object' && entry.date) {
      return entry;
    }
    // Legacy format: just a date
    return { date: entry, notes: '' };
  });

  const statusBadge = getStatusBadge();
  
  return (
    <div 
      className={`mx-[10%] border-l-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer ${getStatusColor()} ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <div className="p-4 flex gap-4">
        {/* LEFT SIDE - Name & Company (Large) */}
        <div className="flex-shrink-0 w-[45%] flex flex-col justify-center border-r border-gray-200 pr-4">
          <div className="flex items-center gap-2 mb-1">
            {lead.status === 'Follow-up Needed' && (
              <span className="text-red-500 text-lg">⚠️</span>
            )}
            <h3 className="text-lg font-bold text-gray-900 truncate">
              {lead.firstName} {lead.lastName}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Building2 size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-base font-medium truncate">{lead.firm || 'No company'}</span>
          </div>
          {lead.location && (
            <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
              <MapPin size={14} className="text-gray-400 flex-shrink-0" />
              <span className="truncate">{lead.location}</span>
            </div>
          )}
        </div>

        {/* RIGHT SIDE - Details, Status, Buttons */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Top Row: Title & Status Badge */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              {lead.title && (
                <p className="text-sm text-gray-700 font-medium truncate">{lead.title}</p>
              )}
              {lead.email && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <Mail size={12} />
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${statusBadge.bg} ${statusBadge.text}`}>
              {statusBadge.label}
            </span>
          </div>

          {/* Middle Row: Dates & Progress Checkboxes */}
          <div className="flex items-center justify-between gap-3 mb-2 text-xs">
            <div className="flex items-center gap-4">
              {/* Contact Date */}
              <div className="flex items-center gap-1 text-gray-600">
                <Calendar size={12} />
                <span>{formatDateShort(lead.dateContacted)}</span>
                {getDaysSinceContact() && (
                  <span className="text-gray-400">({getDaysSinceContact()})</span>
                )}
              </div>
              
              {/* Follow-up Date */}
              {lead.followUpDate && (
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-blue-500" />
                  <span className={isFollowUpPastDue() ? 'text-red-600 font-medium' : 'text-blue-600'}>
                    {formatDateShort(lead.followUpDate)}
                  </span>
                </div>
              )}
            </div>

            {/* Progress Checkboxes */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1" title="Reached Out">
                {lead.reachedOut ? (
                  <CheckCircle size={14} className="text-green-600" />
                ) : (
                  <XCircle size={14} className="text-gray-300" />
                )}
                <span className={`${lead.reachedOut ? 'text-green-700' : 'text-gray-400'}`}>Out</span>
              </div>
              
              <div className="flex items-center gap-1" title="Response Received">
                {lead.response ? (
                  <CheckCircle size={14} className="text-green-600" />
                ) : (
                  <XCircle size={14} className="text-gray-300" />
                )}
                <span className={`${lead.response ? 'text-green-700' : 'text-gray-400'}`}>Resp</span>
              </div>
              
              <div className="flex items-center gap-1" title="Call Scheduled">
                {lead.callScheduled ? (
                  <CheckCircle size={14} className="text-green-600" />
                ) : (
                  <XCircle size={14} className="text-gray-300" />
                )}
                <span className={`${lead.callScheduled ? 'text-green-700' : 'text-gray-400'}`}>Call</span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {lead.status === 'Follow-up Needed' && (
              <button
                onClick={() => onFollowUp(lead)}
                className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                Follow Up
              </button>
            )}
            
            {!lead.response && lead.status !== 'Converted to Contact' && (
              <button
                onClick={() => onLogResponse(lead)}
                className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
              >
                Log Response
              </button>
            )}
            
            {lead.response && !lead.callScheduled && lead.status !== 'Converted to Contact' && (
              <button
                onClick={() => onScheduleCall(lead)}
                className="px-2.5 py-1 text-xs font-medium text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
              >
                Schedule Call
              </button>
            )}
            
            {lead.status !== 'Converted to Contact' && lead.status !== 'Dead Lead' && (
              <button
                onClick={() => onConvert(lead)}
                className="px-2.5 py-1 text-xs font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100 transition-colors"
              >
                Convert
              </button>
            )}
            
            <button
              onClick={() => onEdit(lead)}
              className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              Edit
            </button>
            
            {lead.status !== 'Dead Lead' && lead.status !== 'Converted to Contact' && (
              <button
                onClick={() => onMarkDead(lead)}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                title="Mark as Dead Lead"
              >
                <XCircle size={14} />
              </button>
            )}
            
            <button
              onClick={() => onDelete(lead)}
              className="px-2 py-1 text-xs text-red-500 hover:text-red-700 transition-colors"
              title="Delete Lead"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Follow-up Section */}
      <div className="border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        {/* Follow-up Header - Always visible */}
        <div className="px-4 py-2 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <RotateCcw size={14} className="text-indigo-500" />
              <span className="font-medium">Follow-ups:</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                (lead.followUpCount || 0) > 0 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {lead.followUpCount || 0}
              </span>
            </div>
            {lead.lastFollowUpDate && (
              <span className="text-xs text-gray-400">
                Last: {formatDateShort(lead.lastFollowUpDate?.toDate ? lead.lastFollowUpDate.toDate() : lead.lastFollowUpDate)}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {lead.status !== 'Converted to Contact' && lead.status !== 'Dead Lead' && onRecordFollowUp && (
              <button
                onClick={() => onRecordFollowUp(lead)}
                className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1"
              >
                <MessageCircle size={12} />
                Record
              </button>
            )}
            {followUpHistory.length > 0 && (
              <button
                onClick={() => setShowFollowUps(!showFollowUps)}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title={showFollowUps ? 'Hide history' : 'Show history'}
              >
                {showFollowUps ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>
        </div>
        
        {/* Follow-up History - Collapsible */}
        {showFollowUps && followUpHistory.length > 0 && (
          <div className="px-4 py-2 bg-indigo-50/30 border-t border-gray-100">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {followUpHistory.slice().reverse().map((entry, index) => (
                <div key={index} className="flex items-start gap-2 text-xs">
                  <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-indigo-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-500">
                      {formatFollowUpEntryDate(entry)}
                    </div>
                    {entry.notes && (
                      <div className="text-gray-700 mt-0.5 break-words">
                        {entry.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkingLeadCardCompact;
