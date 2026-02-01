import { useMemo } from 'react';
import { Flame, Snowflake, Calendar, TrendingUp } from 'lucide-react';
import useGamification from '../hooks/useGamification';

const StreakTracker = ({ compact = false }) => {
  const { streak, currentMultiplier, loading } = useGamification();

  const currentStreak = streak?.currentStreak || 0;
  const longestStreak = streak?.longestStreak || 0;
  const lastActivityDate = streak?.lastActivityDate;
  const streakHistory = streak?.streakHistory || [];

  // Generate calendar heatmap data (last 90 days)
  const calendarData = useMemo(() => {
    const today = new Date();
    const data = [];
    const historyMap = new Map(
      streakHistory.map(h => [h.date, h.streak])
    );
    
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      data.push({
        date: dateStr,
        hasActivity: historyMap.has(dateStr),
        streak: historyMap.get(dateStr) || 0,
        dayOfWeek: date.getDay(),
        weekNumber: Math.floor(i / 7)
      });
    }
    
    return data;
  }, [streakHistory]);

  // Check if streak is at risk (no activity today and last activity was yesterday)
  const isAtRisk = useMemo(() => {
    if (!lastActivityDate) return false;
    const today = new Date().toISOString().split('T')[0];
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
      <div className={`rounded-xl p-4 ${
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
                day streak
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
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`p-6 ${
        currentStreak > 0 
          ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white' 
          : 'bg-gray-100'
      }`}>
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
      <div className="grid grid-cols-3 border-b border-gray-200">
        <div className="p-4 text-center border-r border-gray-200">
          <p className="text-2xl font-bold text-gray-900">{longestStreak}</p>
          <p className="text-xs text-gray-500">Longest Streak</p>
        </div>
        <div className="p-4 text-center border-r border-gray-200">
          <p className="text-2xl font-bold text-gray-900">{streak?.weeksActiveInLast12 || 0}/12</p>
          <p className="text-xs text-gray-500">Weeks Active</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {streak?.freezesUsed || 0}/1
          </p>
          <p className="text-xs text-gray-500">Freezes Used</p>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={18} />
            <h4 className="font-medium text-gray-700">Activity History (90 days)</h4>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded bg-gray-100"></div>
              <div className="w-3 h-3 rounded bg-orange-200"></div>
              <div className="w-3 h-3 rounded bg-orange-400"></div>
              <div className="w-3 h-3 rounded bg-orange-600"></div>
            </div>
            <span>More</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-2 text-xs text-gray-400">
              <span className="h-3"></span>
              <span className="h-3">Mon</span>
              <span className="h-3"></span>
              <span className="h-3">Wed</span>
              <span className="h-3"></span>
              <span className="h-3">Fri</span>
              <span className="h-3"></span>
            </div>
            
            {/* Weeks */}
            {Array.from({ length: 13 }, (_, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const dayData = calendarData.find(
                    d => d.weekNumber === 12 - weekIndex && d.dayOfWeek === dayIndex
                  );
                  
                  if (!dayData) {
                    return <div key={dayIndex} className="w-3 h-3 rounded bg-transparent" />;
                  }
                  
                  const intensity = dayData.hasActivity 
                    ? Math.min(Math.ceil(dayData.streak / 7), 3) 
                    : 0;
                  
                  const colorClasses = [
                    'bg-gray-100',
                    'bg-orange-200',
                    'bg-orange-400',
                    'bg-orange-600'
                  ];
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`w-3 h-3 rounded ${colorClasses[intensity]} hover:ring-2 hover:ring-orange-300 cursor-pointer transition-all`}
                      title={`${dayData.date}${dayData.hasActivity ? ` - ${dayData.streak} day streak` : ''}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Streak Milestones */}
      <div className="px-6 pb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Streak Milestones</h4>
        <div className="flex gap-4">
          <StreakMilestone days={7} current={currentStreak} multiplier="1.2x" />
          <StreakMilestone days={14} current={currentStreak} multiplier="1.5x" />
          <StreakMilestone days={30} current={currentStreak} multiplier="2x" />
          <StreakMilestone days={100} current={currentStreak} multiplier="🏆" />
        </div>
      </div>
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
