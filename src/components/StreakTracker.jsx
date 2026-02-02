import { useState, useMemo } from 'react';
import { Flame, Snowflake, Calendar, TrendingUp, X } from 'lucide-react';
import ReactCalendar from 'react-calendar';
import useGamification from '../hooks/useGamification';
import 'react-calendar/dist/Calendar.css';

const StreakTracker = ({ compact = false }) => {
  const { streak, currentMultiplier, loading, leadStats } = useGamification();

  const currentStreak = streak?.currentStreak || 0;
  const longestStreak = streak?.longestStreak || 0;
  const lastActivityDate = streak?.lastActivityDate;
  const activityDates = streak?.activityDates || [];

  // Debug: Log activity dates
  console.log('StreakTracker activityDates:', activityDates);

  // Convert activity dates to Set for quick lookup
  const activityDateSet = useMemo(() => {
    const set = new Set(activityDates);
    console.log('Activity date set:', Array.from(set));
    return set;
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
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    if (activityDateSet.has(dateKey)) {
      return (
        <div className="flex justify-center mt-1">
          <div className={`w-2 h-2 rounded-full ${isWeekend ? 'bg-orange-300' : 'bg-orange-500'}`}></div>
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
      classes.push(isWeekend ? 'activity-day-weekend' : 'activity-day');
    }
    if (isWeekend) {
      classes.push('weekend-day');
    }
    return classes.join(' ');
  };

  // Calendar styles
  const calendarStyles = `
    .react-calendar {
      width: 100%;
      border: none;
      font-family: inherit;
      background: transparent;
    }
    .react-calendar__navigation {
      margin-bottom: 0.5em;
    }
    .react-calendar__navigation button {
      min-width: 32px;
      background: none;
      font-size: 14px;
    }
    .react-calendar__navigation button:hover {
      background: #f3f4f6;
      border-radius: 4px;
    }
    .react-calendar__month-view__weekdays {
      font-size: 10px;
      font-weight: 600;
      color: #6b7280;
    }
    .react-calendar__month-view__weekdays__weekday {
      padding: 0.25em;
    }
    .react-calendar__month-view__weekdays__weekday abbr {
      text-decoration: none;
    }
    .react-calendar__tile {
      padding: 0.4em 0.25em;
      font-size: 12px;
      border-radius: 4px;
    }
    .react-calendar__tile:hover {
      background: #f3f4f6;
    }
    .react-calendar__tile.activity-day {
      background: #fed7aa !important;
      color: #c2410c;
      font-weight: 600;
    }
    .react-calendar__tile.activity-day:hover {
      background: #fdba74 !important;
    }
    .react-calendar__tile.activity-day-weekend {
      background: #fef3c7 !important;
      color: #d97706;
      font-weight: 500;
    }
    .react-calendar__tile.activity-day-weekend:hover {
      background: #fde68a !important;
    }
    .react-calendar__tile.weekend-day {
      color: #9ca3af;
    }
    .react-calendar__tile--now {
      background: #dbeafe !important;
      color: #1d4ed8;
    }
    .react-calendar__tile--active {
      background: #3b82f6 !important;
      color: white !important;
    }
  `;

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl p-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Compact version with inline calendar
  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <style>{calendarStyles}</style>
        
        {/* Header with streak info */}
        <div className={`p-4 ${
          currentStreak > 0 
            ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white' 
            : 'bg-gray-100 text-gray-700'
        }`}>
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
          {isAtRisk && (
            <p className="mt-2 text-sm text-yellow-200 animate-pulse">
              ⚠️ Don't lose your streak! Log activity today.
            </p>
          )}
        </div>

        {/* Inline Calendar */}
        <div className="p-3">
          <div className="mb-2 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="text-gray-600">Weekday</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-300"></div>
              <span className="text-gray-600">Weekend</span>
            </div>
          </div>
          
          <ReactCalendar
            tileContent={tileContent}
            tileClassName={tileClassName}
            maxDate={new Date()}
            showNeighboringMonth={false}
            prev2Label={null}
            next2Label={null}
          />
          
          <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-500">
            <span>Longest: {longestStreak} days</span>
            <span>{activityDates.length} activity days</span>
          </div>
        </div>
      </div>
    );
  }

  // Full version with side-by-side layout
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <style>{calendarStyles}</style>
      
      <div className="flex flex-col lg:flex-row">
        {/* Left: Streak Info */}
        <div className={`flex-1 p-6 ${
          currentStreak > 0 
            ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white' 
            : 'bg-gray-100'
        }`}>
          <div className="flex items-center gap-4 mb-4">
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
                Current Streak
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
            <div className="bg-white/20 rounded-xl px-4 py-3 inline-flex items-center gap-2">
              <TrendingUp size={20} />
              <span className="text-2xl font-bold">{currentMultiplier}x</span>
              <span className="text-xs text-orange-200">Point Bonus</span>
            </div>
          )}

          {isAtRisk && (
            <div className="mt-4 bg-yellow-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
              <span className="animate-pulse">⚠️</span>
              <span className="text-sm">Your streak is at risk! Log an activity today to keep it going.</span>
            </div>
          )}
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
            <div>
              <p className={`text-2xl font-bold ${currentStreak > 0 ? 'text-white' : 'text-gray-900'}`}>{longestStreak}</p>
              <p className={`text-xs ${currentStreak > 0 ? 'text-orange-200' : 'text-gray-500'}`}>Longest Streak</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${currentStreak > 0 ? 'text-white' : 'text-gray-900'}`}>{activityDates.length}</p>
              <p className={`text-xs ${currentStreak > 0 ? 'text-orange-200' : 'text-gray-500'}`}>Activity Days</p>
            </div>
          </div>
        </div>
        
        {/* Right: Calendar */}
        <div className="flex-1 p-4 border-l border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              Activity Calendar
            </h4>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-gray-500">Weekday</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-300"></div>
                <span className="text-gray-500">Weekend</span>
              </div>
            </div>
          </div>
          
          <ReactCalendar
            tileContent={tileContent}
            tileClassName={tileClassName}
            maxDate={new Date()}
            showNeighboringMonth={false}
          />
          
          <p className="mt-3 text-xs text-gray-400 text-center">
            Streak counts consecutive weekdays only (Mon-Fri)
          </p>
        </div>
      </div>

      {/* Streak Milestones */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Streak Milestones</h4>
        <div className="flex gap-3">
          <StreakMilestone days={5} current={currentStreak} multiplier="1.2x" />
          <StreakMilestone days={10} current={currentStreak} multiplier="1.5x" />
          <StreakMilestone days={20} current={currentStreak} multiplier="2x" />
          <StreakMilestone days={50} current={currentStreak} multiplier="🏆" />
        </div>
      </div>
    </div>
  );
};

const StreakMilestone = ({ days, current, multiplier }) => {
  const isReached = current >= days;
  const progress = Math.min((current / days) * 100, 100);
  
  return (
    <div className={`flex-1 rounded-lg p-2 text-center ${
      isReached ? 'bg-orange-100 border border-orange-300' : 'bg-white border border-gray-200'
    }`}>
      <p className={`text-sm font-bold ${isReached ? 'text-orange-600' : 'text-gray-400'}`}>
        {days}d
      </p>
      <p className={`text-xs ${isReached ? 'text-orange-500' : 'text-gray-400'}`}>
        {multiplier}
      </p>
      {!isReached && (
        <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
          <div 
            className="h-full bg-orange-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {isReached && (
        <span className="text-green-500 text-xs">✓</span>
      )}
    </div>
  );
};

export default StreakTracker;
