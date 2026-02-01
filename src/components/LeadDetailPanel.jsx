import { 
  X, Building2, MapPin, Mail, Phone, Calendar, Clock, CheckCircle, XCircle, 
  ExternalLink, User, FileText, Tag, Trash2 
} from 'lucide-react';

const LeadDetailPanel = ({ 
  lead, 
  onClose, 
  onFollowUp, 
  onLogResponse, 
  onScheduleCall, 
  onConvert, 
  onMarkDead, 
  onEdit, 
  onDelete 
}) => {
  if (!lead) return null;
  
  const getStatusColor = () => {
    const colors = {
      'Follow-up Needed': 'bg-red-100 text-red-800 border-red-300',
      'Pending Response': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Call Scheduled': 'bg-green-100 text-green-800 border-green-300',
      'Converted to Contact': 'bg-blue-100 text-blue-800 border-blue-300',
      'Dead Lead': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[lead.status] || 'bg-gray-100 text-gray-800';
  };
  
  const getDaysSinceContact = () => {
    if (!lead.dateContacted) return null;
    const days = Math.floor((new Date() - new Date(lead.dateContacted)) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };
  
  const getFollowUpText = () => {
    if (!lead.followUpDate) return null;
    const followUpDate = new Date(lead.followUpDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    followUpDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((followUpDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    return followUpDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {lead.firstName} {lead.lastName}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-gray-600">
              <Building2 size={16} />
              <span className="font-medium">{lead.firm || 'No company'}</span>
              {lead.title && (
                <>
                  <span className="text-gray-400">•</span>
                  <span>{lead.title}</span>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Status badge */}
        <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor()}`}>
          {lead.status === 'Follow-up Needed' && '⚠️ '}
          {lead.status}
        </span>
      </div>
      
      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Contact Info */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Contact Information
          </h3>
          <div className="space-y-3">
            {lead.location && (
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin size={18} className="text-gray-400" />
                <span>{lead.location}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-3 text-gray-700">
                <Mail size={18} className="text-gray-400" />
                <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                  {lead.email}
                </a>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-3 text-gray-700">
                <Phone size={18} className="text-gray-400" />
                <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                  {lead.phone}
                </a>
              </div>
            )}
            {lead.linkedInUrl && (
              <div className="flex items-center gap-3 text-gray-700">
                <ExternalLink size={18} className="text-gray-400" />
                <a 
                  href={lead.linkedInUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  LinkedIn Profile
                </a>
              </div>
            )}
          </div>
        </section>
        
        {/* Division/Group */}
        {lead.divisionGroup && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Division/Group
            </h3>
            <p className="text-gray-700">{lead.divisionGroup}</p>
          </section>
        )}
        
        {/* Timeline */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Timeline
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-gray-400" />
              <div>
                <span className="text-gray-600">Contacted: </span>
                <span className="font-medium text-gray-900">
                  {lead.dateContacted 
                    ? new Date(lead.dateContacted).toLocaleDateString('en-US', { 
                        month: 'long', day: 'numeric', year: 'numeric' 
                      })
                    : 'Not set'}
                </span>
                {getDaysSinceContact() && (
                  <span className="text-gray-500 ml-2">({getDaysSinceContact()})</span>
                )}
              </div>
            </div>
            
            {lead.followUpDate && (
              <div className="flex items-center gap-3">
                <Clock size={18} className={
                  new Date(lead.followUpDate) < new Date() ? 'text-red-500' : 'text-blue-500'
                } />
                <div>
                  <span className="text-gray-600">Follow up: </span>
                  <span className={`font-medium ${
                    new Date(lead.followUpDate) < new Date() ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {getFollowUpText()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
        
        {/* Progress Checklist */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Progress
          </h3>
          <div className="space-y-2">
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              lead.reachedOut ? 'bg-green-50' : 'bg-gray-50'
            }`}>
              {lead.reachedOut ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : (
                <XCircle size={20} className="text-gray-300" />
              )}
              <span className={lead.reachedOut ? 'text-green-800 font-medium' : 'text-gray-500'}>
                Reached Out
              </span>
            </div>
            
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              lead.response ? 'bg-green-50' : 'bg-gray-50'
            }`}>
              {lead.response ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : (
                <XCircle size={20} className="text-gray-300" />
              )}
              <span className={lead.response ? 'text-green-800 font-medium' : 'text-gray-500'}>
                Received Response
              </span>
            </div>
            
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              lead.callScheduled ? 'bg-green-50' : 'bg-gray-50'
            }`}>
              {lead.callScheduled ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : (
                <XCircle size={20} className="text-gray-300" />
              )}
              <span className={lead.callScheduled ? 'text-green-800 font-medium' : 'text-gray-500'}>
                Call Scheduled
              </span>
            </div>
          </div>
        </section>
        
        {/* Commonalities */}
        {lead.commonalities && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Commonalities
            </h3>
            <div className="p-3 bg-purple-50 rounded-lg text-purple-800">
              {lead.commonalities}
            </div>
          </section>
        )}
        
        {/* Notes */}
        {lead.notes && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Notes
            </h3>
            <div className="p-3 bg-gray-50 rounded-lg text-gray-700 whitespace-pre-wrap">
              {lead.notes}
            </div>
          </section>
        )}
      </div>
      
      {/* Actions Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-2">
          {lead.status === 'Follow-up Needed' && (
            <button
              onClick={() => onFollowUp(lead)}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Follow Up
            </button>
          )}
          
          {!lead.response && lead.status !== 'Converted to Contact' && (
            <button
              onClick={() => onLogResponse(lead)}
              className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Log Response
            </button>
          )}
          
          {lead.response && !lead.callScheduled && lead.status !== 'Converted to Contact' && (
            <button
              onClick={() => onScheduleCall(lead)}
              className="flex-1 px-4 py-2 text-sm font-medium text-green-600 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
            >
              Schedule Call
            </button>
          )}
          
          {lead.status !== 'Converted to Contact' && lead.status !== 'Dead Lead' && (
            <button
              onClick={() => onConvert(lead)}
              className="flex-1 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
            >
              Convert to Contact
            </button>
          )}
        </div>
        
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onEdit(lead)}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit Lead
          </button>
          
          {lead.status !== 'Dead Lead' && lead.status !== 'Converted to Contact' && (
            <button
              onClick={() => onMarkDead(lead)}
              className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
            >
              Mark Dead
            </button>
          )}
          
          {onDelete && (
            <button
              onClick={() => onDelete(lead)}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadDetailPanel;
