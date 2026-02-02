import { useState, useMemo } from 'react';
import { Flame, Snowflake, Calendar, TrendingUp, X } from 'lucide-react';
import ReactCalendar from 'react-calendar';
import useGamification from '../hooks/useGamification';
import 'react-calendar/dist/Calendar.css';

const StreakTracker = ({ compact = false }) => {
  const { streak, currentMultiplier, loading } = useGamification();
  const [showCalendar, setShowCalendar] = useState(false);

  const currentStreak = streak?.currentStreak || 0;
  const longestStreak = streak?.longestStreak || 0;
  const lastActivityDate = streak?.lastActivityDate;
  const activityDates = streak?.activityDates || [];

  // Convert activity dates to Set for quick lookup
  const activityDateSet = useMemo(() => {
    return new Set(activityDates);
  }, [activityDates]);

  // Check if streak is at risk (no activity today and last activity was yesterday)
  const isAtRisk = useMemo(() => {
    if (!lastActivityDate) return false;
    const today = new Date().toISOString().split('T')[0];
    // Skip weekend check for at-risk
    const todayDate = new Date();
    const isWeekend = todayDate.getDay() === 0 || todayDate.getDay() === 6;
    if (isWeekend) return false; // No risk on weekends
    return lastActivityDate !== today && currentStreak > 0;
  }, [lastActivityDate, currentStreak]);

  // Get streak message
  const getStreakMessage = () => {
    if (currentStreak === 0) return "Start your streak today!";
    if (currentStreak >= 30) return "You're unstoppable! 🏆";
    if (currentStreak >= 14) return "Two weeks strong! Keep it up!";
    if (currentStreak >= 7) return "One week down! Great momentum!";
    if (currentStreak >= 3) return "Building consistency!";
    return "Great start! Keep going!";
  };

  // Custom tile content for calendar - show orange dot on activity days
  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (activityDateSet.has(dateKey)) {
      return (
        <div className="flex justify-center mt-1">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
        </div>
      );
    }
    return null;
  };

  // Custom tile class for calendar
  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    let classes = [];
    if (activityDateSet.has(dateKey)) {
      classes.push('activity-day');
    }
    if (isWeekend) {
      classes.push('weekend-day');
    }
    return classes.join(' ');
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl p-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (compact) {
    return (
      <>
        <div 
          className={`rounded-xl p-4 cursor-pointer hover:opacity-90 transition-opacity ${
            currentStreak > 0 
              ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white' 
              : 'bg-gray-100 text-gray-700'
          }`}
          onClick={() => setShowCalendar(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStreak > 0 ? (
                <Flame className="text-yellow-300" size={28} />
              ) : (
                <Snowflake className="text-gray-400" size={28} />
              )}
              <div>
                <p className="text-2xl font-bold">{currentStreak}</p>
                <p className={`text-sm ${currentStreak > 0 ? 'text-orange-200' : 'text-gray-500'}`}>
                  weekday streak
                </p>
              </div>
            </div>
            {currentMultiplier > 1 && (
              <div className="bg-white/20 rounded-lg px-3 py-1">
                <span className="font-bold">{currentMultiplier}x</span>
              </div>
            )}
          </div>
          <p className={`mt-2 text-xs ${currentStreak > 0 ? 'text-orange-200' : 'text-gray-400'}`}>
            Click to view calendar
          </p>
          {isAtRisk && (
            <p className="mt-2 text-sm text-yellow-200 animate-pulse">
              ⚠️ Don't lose your streak! Log activity today.
            </p>
          )}
        </div>

        {/* Calendar Modal */}
        {showCalendar && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCalendar(false)}>
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Flame className="text-orange-500" size={20} />
                  Activity Calendar
                </h3>
                <button onClick={() => setShowCalendar(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-gray-600">Activity day</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-200"></div>
                  <span className="text-gray-600">Weekend (ignored)</span>
                </div>
              </div>

              <style>{`
                .react-calendar {
                  width: 100%;
                  border: none;
                  font-family: inherit;
                }
                .react-calendar__tile {
                  padding: 0.75em 0.5em;
                }
                .react-calendar__tile.activity-day {
                  background: #fed7aa !important;
                  color: #c2410c;
                  font-weight: 600;
                }
                .react-calendar__tile.activity-day:hover {
                  background: #fdba74 !important;
                }
                .react-calendar__tile.weekend-day {
                  color: #9ca3af;
                }
                .react-calendar__tile--now {
                  background: #e5e7eb;
                }
                .react-calendar__tile--active {
                  background: #3b82f6 !important;
                  color: white !important;
                }
              `}</style>

              <ReactCalendar
                tileContent={tileContent}
                tileClassName={tileClassName}
                maxDate={new Date()}
              />

              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-orange-600">{currentStreak}</p>
                  <p className="text-xs text-gray-500">Current Streak</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-700">{longestStreak}</p>
                  <p className="text-xs text-gray-500">Longest Streak</p>
                </div>
              </div>
              
              <p className="mt-3 text-xs text-gray-400 text-center">
                Streak counts consecutive weekdays only (Mon-Fri)
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Full version
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header - clickable */}
      <div 
        className={`p-6 cursor-pointer hover:opacity-95 transition-opacity ${
          currentStreak > 0 
            ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white' 
            : 'bg-gray-100'
        }`}
        onClick={() => setShowCalendar(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              currentStreak > 0 ? 'bg-white/20' : 'bg-white'
            }`}>
              {currentStreak > 0 ? (
                <Flame className="text-yellow-300" size={36} />
              ) : (
                <Snowflake className="text-gray-400" size={36} />
              )}
            </div>
            <div>
              <p className={`text-sm ${currentStreak > 0 ? 'text-orange-200' : 'text-gray-500'}`}>
                Current Streak (click for calendar)
              </p>
              <p className={`text-4xl font-bold ${currentStreak > 0 ? 'text-white' : 'text-gray-900'}`}>
                {currentStreak} days
              </p>
              <p className={`text-sm mt-1 ${currentStreak > 0 ? 'text-orange-200' : 'text-gray-500'}`}>
                {getStreakMessage()}
              </p>
            </div>
          </div>
          
          {currentMultiplier > 1 && (
            <div className="text-center bg-white/20 rounded-xl px-4 py-3">
              <TrendingUp className="mx-auto mb-1" size={20} />
              <p className="text-2xl font-bold">{currentMultiplier}x</p>
              <p className="text-xs text-orange-200">Point Bonus</p>
            </div>
          )}
        </div>

        {isAtRisk && (
          <div className="mt-4 bg-yellow-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="animate-pulse">⚠️</span>
            <span className="text-sm">Your streak is at risk! Log an activity today to keep it going.</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 border-b border-gray-200">
        <div className="p-4 text-center border-r border-gray-200">
          <p className="text-2xl font-bold text-gray-900">{longestStreak}</p>
          <p className="text-xs text-gray-500">Longest Streak</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{activityDates.length}</p>
          <p className="text-xs text-gray-500">Total Activity Days</p>
        </div>
      </div>

      {/* Streak Milestones */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Streak Milestones (Weekdays Only)</h4>
        <div className="flex gap-4">
          <StreakMilestone days={5} current={currentStreak} multiplier="1.2x" />
          <StreakMilestone days={10} current={currentStreak} multiplier="1.5x" />
          <StreakMilestone days={20} current={currentStreak} multiplier="2x" />
          <StreakMilestone days={50} current={currentStreak} multiplier="🏆" />
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Weekends (Sat/Sun) are not counted - streak continues on Monday!
        </p>
      </div>

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCalendar(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Flame className="text-orange-500" size={20} />
                Activity Calendar
              </h3>
              <button onClick={() => setShowCalendar(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-gray-600">Activity day</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-200"></div>
                <span className="text-gray-600">Weekend</span>
              </div>
            </div>

            <style>{`
              .react-calendar {
                width: 100%;
                border: none;
                font-family: inherit;
              }
              .react-calendar__tile {
                padding: 0.75em 0.5em;
              }
              .react-calendar__tile.activity-day {
                background: #fed7aa !important;
                color: #c2410c;
                font-weight: 600;
              }
              .react-calendar__tile.activity-day:hover {
                background: #fdba74 !important;
              }
              .react-calendar__tile.weekend-day {
                color: #9ca3af;
              }
              .react-calendar__tile--now {
                background: #e5e7eb;
              }
              .react-calendar__tile--active {
                background: #3b82f6 !important;
                color: white !important;
              }
            `}</style>

            <ReactCalendar
              tileContent={tileContent}
              tileClassName={tileClassName}
              maxDate={new Date()}
            />

            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-orange-600">{currentStreak}</p>
                <p className="text-xs text-gray-500">Current Streak</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-700">{longestStreak}</p>
                <p className="text-xs text-gray-500">Longest Streak</p>
              </div>
            </div>
            
            <p className="mt-3 text-xs text-gray-400 text-center">
              Streak counts consecutive weekdays only (Mon-Fri)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const StreakMilestone = ({ days, current, multiplier }) => {
  const isReached = current >= days;
  const progress = Math.min((current / days) * 100, 100);
  
  return (
    <div className={`flex-1 rounded-lg p-3 text-center ${
      isReached ? 'bg-orange-100 border-2 border-orange-400' : 'bg-gray-50'
    }`}>
      <p className={`text-lg font-bold ${isReached ? 'text-orange-600' : 'text-gray-400'}`}>
        {days} days
      </p>
      <p className={`text-xs ${isReached ? 'text-orange-500' : 'text-gray-400'}`}>
        {multiplier}
      </p>
      {!isReached && (
        <div className="h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div 
            className="h-full bg-orange-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {isReached && (
        <span className="text-green-500 text-sm">✓</span>
      )}
    </div>
  );
};

export default StreakTracker;
