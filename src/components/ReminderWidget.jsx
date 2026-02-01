import { useState, useMemo } from 'react';
import { Bell, AlertTriangle, Calendar, ChevronDown, ChevronUp, Clock, User, EyeOff, Eye } from 'lucide-react';
import { useContacts } from '../contexts/ContactContext';
import { 
  categorizeReminders,
  getOverdueReminders,
  getTimeSinceContact, 
  formatReminderDate 
} from '../services/reminderService';

const ReminderWidget = ({ onContactClick, onIgnoreContact }) => {
  const { contacts, updateContact } = useContacts();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  
  const reminders = useMemo(() => categorizeReminders(contacts), [contacts]);
  
  // Get ignored reminders (overdue contacts that are ignored)
  const ignoredReminders = useMemo(() => {
    return getOverdueReminders(contacts, false).filter(c => c.reminderIgnored);
  }, [contacts]);
  
  const displayOverdue = showAll ? reminders.overdue : reminders.overdue.slice(0, 3);
  const displayDueSoon = showAll ? reminders.dueSoon : reminders.dueSoon.slice(0, 3);
  
  const handleIgnoreToggle = async (e, contact) => {
    e.stopPropagation();
    const newIgnoredState = !contact.reminderIgnored;
    try {
      await updateContact(contact.id, { reminderIgnored: newIgnoredState });
      onIgnoreContact?.(contact, newIgnoredState);
    } catch (error) {
      console.error('Error toggling ignore:', error);
    }
  };
  
  if (reminders.totalCount === 0 && ignoredReminders.length === 0) {
    return null; // Don't show widget if no reminders
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Bell className="text-blue-600" size={20} />
          <h3 className="font-semibold text-gray-900">
            Follow-up Reminders
          </h3>
          <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
            {reminders.totalCount}
          </span>
          {ignoredReminders.length > 0 && (
            <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">
              {ignoredReminders.length} ignored
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Overdue Section */}
          {reminders.overdue.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-500" />
                <span className="text-sm font-medium text-red-700">
                  Overdue ({reminders.overdue.length})
                </span>
              </div>
              <div className="space-y-2">
                {displayOverdue.map(contact => (
                  <div 
                    key={contact.id}
                    className="flex items-center justify-between p-2 rounded-md bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <div 
                      className="flex items-center gap-2 flex-1 cursor-pointer"
                      onClick={() => onContactClick?.(contact)}
                    >
                      <User size={14} className="text-red-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {contact.firstName} {contact.lastName}
                      </span>
                      {contact.company && (
                        <span className="text-xs text-gray-500">
                          ({contact.company})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600">
                        {getTimeSinceContact(contact.lastContactDate)}
                      </span>
                      <button
                        onClick={(e) => handleIgnoreToggle(e, contact)}
                        className="p-1 rounded hover:bg-red-200 text-red-400 hover:text-red-600 transition-colors"
                        title="Ignore this reminder"
                      >
                        <EyeOff size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {!showAll && reminders.overdue.length > 3 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    +{reminders.overdue.length - 3} more
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Due This Week Section */}
          {reminders.dueSoon.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-yellow-500" />
                <span className="text-sm font-medium text-yellow-700">
                  Due This Week ({reminders.dueSoon.length})
                </span>
              </div>
              <div className="space-y-2">
                {displayDueSoon.map(contact => (
                  <div 
                    key={contact.id}
                    className="flex items-center justify-between p-2 rounded-md bg-yellow-50 hover:bg-yellow-100 transition-colors"
                  >
                    <div 
                      className="flex items-center gap-2 flex-1 cursor-pointer"
                      onClick={() => onContactClick?.(contact)}
                    >
                      <User size={14} className="text-yellow-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {contact.firstName} {contact.lastName}
                      </span>
                      {contact.company && (
                        <span className="text-xs text-gray-500">
                          ({contact.company})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-yellow-600">
                        {formatReminderDate(contact.nextReminderDate)}
                      </span>
                      <button
                        onClick={(e) => handleIgnoreToggle(e, contact)}
                        className="p-1 rounded hover:bg-yellow-200 text-yellow-400 hover:text-yellow-600 transition-colors"
                        title="Ignore this reminder"
                      >
                        <EyeOff size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {!showAll && reminders.dueSoon.length > 3 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
                    className="text-xs text-yellow-600 hover:text-yellow-700 font-medium"
                  >
                    +{reminders.dueSoon.length - 3} more
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* View All Link */}
          {showAll && (
            <button
              onClick={() => setShowAll(false)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Show less
            </button>
          )}
          
          {/* Ignored Reminders Section */}
          {ignoredReminders.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowIgnored(!showIgnored)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showIgnored ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>{showIgnored ? 'Hide' : 'Show'} {ignoredReminders.length} ignored reminder{ignoredReminders.length > 1 ? 's' : ''}</span>
              </button>
              
              {showIgnored && (
                <div className="mt-2 space-y-2">
                  {ignoredReminders.map(contact => (
                    <div 
                      key={contact.id}
                      className="flex items-center justify-between p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors opacity-60"
                    >
                      <div 
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                        onClick={() => onContactClick?.(contact)}
                      >
                        <User size={14} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">
                          {contact.firstName} {contact.lastName}
                        </span>
                        {contact.company && (
                          <span className="text-xs text-gray-400">
                            ({contact.company})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {getTimeSinceContact(contact.lastContactDate)}
                        </span>
                        <button
                          onClick={(e) => handleIgnoreToggle(e, contact)}
                          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Restore this reminder"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReminderWidget;
