import { useState, useEffect } from 'react';
import { Target, Calendar, TrendingUp, Mail, Phone, Users, Flame, Trophy, Save, X, Edit2 } from 'lucide-react';
import useGamification from '../hooks/useGamification';

const GOAL_METRICS = [
  { id: 'coldEmails', name: 'Cold Emails', icon: Mail, color: 'blue', defaultTarget: 20 },
  { id: 'followUps', name: 'Follow Ups', icon: TrendingUp, color: 'green', defaultTarget: 15 },
  { id: 'calls', name: 'Calls/Meetings', icon: Phone, color: 'purple', defaultTarget: 10 },
  { id: 'newContacts', name: 'New Contacts', icon: Users, color: 'orange', defaultTarget: 10 },
  { id: 'responseRate', name: 'Response Rate %', icon: Target, color: 'pink', defaultTarget: 30 },
  { id: 'streak', name: 'Streak Days', icon: Flame, color: 'red', defaultTarget: 20 },
  { id: 'totalScore', name: 'Total Score', icon: Trophy, color: 'yellow', defaultTarget: 500 },
];

const GoalSetting = ({ compact = false }) => {
  const { goals, setMonthlyGoals, loading, refreshScores } = useGamification();
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoals, setEditedGoals] = useState({});
  const [saving, setSaving] = useState(false);

  // Get current month name
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (goals?.targets) {
      setEditedGoals(goals.targets);
    }
  }, [goals?.targets]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setMonthlyGoals(editedGoals);
      setIsEditing(false);
      await refreshScores();
    } catch (error) {
      console.error('Failed to save goals:', error);
    }
    setSaving(false);
  };

  const handleGoalChange = (metricId, value) => {
    setEditedGoals(prev => ({
      ...prev,
      [metricId]: parseInt(value) || 0
    }));
  };

  // Calculate overall progress
  const overallProgress = (() => {
    if (!goals?.targets || !goals?.progress) return 0;
    
    let totalProgress = 0;
    let metricCount = 0;
    
    GOAL_METRICS.forEach(metric => {
      const target = goals.targets[metric.id];
      const current = goals.progress[metric.id] || 0;
      if (target > 0) {
        totalProgress += Math.min((current / target) * 100, 100);
        metricCount++;
      }
    });
    
    return metricCount > 0 ? Math.round(totalProgress / metricCount) : 0;
  })();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl p-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="text-purple-500" size={20} />
            <h3 className="font-semibold text-gray-900">Monthly Goals</h3>
          </div>
          <span className="text-sm font-medium text-purple-600">{overallProgress}%</span>
        </div>

        {/* Compact progress bar */}
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div 
            className={`h-full transition-all duration-500 ${
              overallProgress >= 100 ? 'bg-green-500' :
              overallProgress >= 75 ? 'bg-purple-500' :
              overallProgress >= 50 ? 'bg-blue-500' :
              'bg-gray-400'
            }`}
            style={{ width: `${Math.min(overallProgress, 100)}%` }}
          />
        </div>

        {/* Top 3 goals */}
        <div className="space-y-2">
          {GOAL_METRICS.slice(0, 3).map(metric => {
            const target = goals.targets?.[metric.id] || metric.defaultTarget;
            const current = goals.progress?.[metric.id] || 0;
            const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
            
            return (
              <div key={metric.id} className="flex items-center gap-3">
                <metric.icon size={16} className={`text-${metric.color}-500`} />
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{metric.name}</span>
                    <span className="text-gray-900 font-medium">{current}/{target}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-${metric.color}-500 transition-all`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Target className="text-purple-600" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Monthly Goals</h2>
              <p className="text-sm text-gray-500">{currentMonth}</p>
            </div>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Edit2 size={18} />
              Edit Goals
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedGoals(goals.targets || {});
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X size={18} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* Overall progress */}
        <div className="bg-white/80 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className={`text-lg font-bold ${
              overallProgress >= 100 ? 'text-green-600' : 'text-purple-600'
            }`}>
              {overallProgress}%
            </span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                overallProgress >= 100 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                'bg-gradient-to-r from-purple-400 to-indigo-500'
              }`}
              style={{ width: `${Math.min(overallProgress, 100)}%` }}
            />
          </div>
          {overallProgress >= 100 && (
            <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
              <Trophy size={16} /> All goals achieved! 🎉
            </p>
          )}
        </div>
      </div>

      {/* Goals list */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GOAL_METRICS.map(metric => {
            const target = isEditing 
              ? (editedGoals[metric.id] ?? goals.targets?.[metric.id] ?? metric.defaultTarget)
              : (goals.targets?.[metric.id] || metric.defaultTarget);
            const current = goals.progress?.[metric.id] || 0;
            const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
            const isComplete = progress >= 100;
            
            return (
              <GoalCard
                key={metric.id}
                metric={metric}
                target={target}
                current={current}
                progress={progress}
                isComplete={isComplete}
                isEditing={isEditing}
                onTargetChange={(value) => handleGoalChange(metric.id, value)}
              />
            );
          })}
        </div>
      </div>

      {/* Tips */}
      {!isEditing && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-2">💡 Tips</h4>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Set realistic goals based on your available time</li>
            <li>• Focus on quality over quantity for better results</li>
            <li>• Track your streak to build consistent habits</li>
            <li>• Review and adjust goals monthly</li>
          </ul>
        </div>
      )}
    </div>
  );
};

const GoalCard = ({ metric, target, current, progress, isComplete, isEditing, onTargetChange }) => {
  const Icon = metric.icon;
  
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', bar: 'bg-blue-500', border: 'border-blue-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', bar: 'bg-green-500', border: 'border-green-200' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', bar: 'bg-purple-500', border: 'border-purple-200' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', bar: 'bg-orange-500', border: 'border-orange-200' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-600', bar: 'bg-pink-500', border: 'border-pink-200' },
    red: { bg: 'bg-red-100', text: 'text-red-600', bar: 'bg-red-500', border: 'border-red-200' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', bar: 'bg-yellow-500', border: 'border-yellow-200' },
  };
  
  const colors = colorClasses[metric.color] || colorClasses.blue;

  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${
      isComplete ? 'border-green-300 bg-green-50' : `${colors.border} bg-white`
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isComplete ? 'bg-green-100' : colors.bg
          }`}>
            <Icon size={20} className={isComplete ? 'text-green-600' : colors.text} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{metric.name}</h4>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">Target:</span>
                <input
                  type="number"
                  min="0"
                  value={target}
                  onChange={(e) => onTargetChange(e.target.value)}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {current} / {target} {metric.id === 'responseRate' ? '%' : ''}
              </p>
            )}
          </div>
        </div>
        {isComplete && (
          <span className="text-green-500 text-xl">✓</span>
        )}
      </div>

      {/* Progress bar */}
      {!isEditing && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Progress</span>
            <span className={`font-medium ${isComplete ? 'text-green-600' : colors.text}`}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                isComplete ? 'bg-green-500' : colors.bar
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalSetting;
