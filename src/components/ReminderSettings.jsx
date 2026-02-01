import { useState } from 'react';
import { Bell, BellOff, Calendar, ChevronDown } from 'lucide-react';
import { 
  REMINDER_INTERVALS, 
  DEFAULT_CRM_INTERVAL, 
  calculateNextReminder,
  formatReminderDate,
  snoozeReminder,
  getIntervalLabel
} from '../services/reminderService';

const ReminderSettings = ({ 
  contact, 
  onUpdate,
  compact = false 
}) => {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  
  const reminderEnabled = contact.reminderEnabled !== false; // Default true
  const reminderInterval = contact.reminderInterval || DEFAULT_CRM_INTERVAL;
  const nextReminderDate = contact.nextReminderDate || 
    calculateNextReminder(contact.lastContactDate, reminderInterval);
  
  const handleToggleReminder = () => {
    onUpdate({
      reminderEnabled: !reminderEnabled
    });
  };
  
  const handleIntervalChange = (e) => {
    const newInterval = e.target.value;
    const newNextDate = calculateNextReminder(contact.lastContactDate, newInterval);
    onUpdate({
      reminderInterval: newInterval,
      nextReminderDate: newNextDate
    });
  };
  
  const handleSnooze = (days) => {
    const newDate = snoozeReminder(days);
    onUpdate({
      nextReminderDate: newDate
    });
    setShowSnoozeOptions(false);
  };
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleReminder}
          className={`p-1.5 rounded ${
            reminderEnabled 
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
              : 'text-gray-400 hover:bg-gray-100'
          }`}
          title={reminderEnabled ? 'Reminders enabled' : 'Reminders disabled'}
        >
          {reminderEnabled ? <Bell size={16} /> : <BellOff size={16} />}
        </button>
        {reminderEnabled && (
          <select
            value={reminderInterval}
            onChange={handleIntervalChange}
            className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {REMINDER_INTERVALS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Bell size={16} />
          Follow-up Reminders
        </h4>
        <button
          onClick={handleToggleReminder}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            reminderEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              reminderEnabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      
      {reminderEnabled && (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Remind me to reconnect every:
            </label>
            <select
              value={reminderInterval}
              onChange={handleIntervalChange}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {REMINDER_INTERVALS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                Next reminder: 
              </span>
            </div>
            <span className="font-medium text-gray-900">
              {formatReminderDate(nextReminderDate)}
            </span>
          </div>
          
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <div className="relative">
              <button
                onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                className="text-xs px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 flex items-center gap-1"
              >
                Snooze
                <ChevronDown size={12} />
              </button>
              
              {showSnoozeOptions && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowSnoozeOptions(false)} 
                  />
                  <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                    {[
                      { days: 1, label: '1 day' },
                      { days: 3, label: '3 days' },
                      { days: 7, label: '1 week' },
                      { days: 14, label: '2 weeks' },
                      { days: 30, label: '1 month' }
                    ].map(opt => (
                      <button
                        key={opt.days}
                        onClick={() => handleSnooze(opt.days)}
                        className="block w-full text-left text-xs px-3 py-2 hover:bg-gray-50"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={handleToggleReminder}
              className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded"
            >
              Disable
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ReminderSettings;
