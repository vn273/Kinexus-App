import { useState } from 'react';
import { 
  Trophy, TrendingUp, Target, Zap, Users, 
  ChevronRight, Award, Flame, Calendar, X 
} from 'lucide-react';
import useGamification from '../hooks/useGamification';

const ScoreDashboard = ({ compact = false }) => {
  const {
    score,
    streak,
    tier,
    tierProgress,
    currentMultiplier,
    goalsProgress,
    targetCompanies,
    unlockedAchievementsList,
    localStats,
    loading,
    scoresSyncedFromLeads,
    leadStats
  } = useGamification();
  
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [showTodayBreakdown, setShowTodayBreakdown] = useState(false);

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl p-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  // Use leadStats for consistent score calculation
  const displayScore = scoresSyncedFromLeads ? (leadStats?.allTime?.totalPoints || 0) : 0;
  const displayStreak = streak?.currentStreak || 0;

  if (compact) {
    return (
      <>
        <div 
          className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-4 text-white cursor-pointer hover:opacity-95 transition-opacity"
          onClick={() => setShowScoreBreakdown(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm">Your Score</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{tier.icon}</span>
                <span className="text-2xl font-bold">{displayScore.toLocaleString()}</span>
              </div>
              <p className="text-purple-200 text-xs">{tier.name}</p>
            </div>
            <div className="text-right">
              {displayStreak > 0 && (
                <div className="flex items-center gap-1 text-orange-300">
                  <Flame size={18} />
                  <span className="font-bold">{displayStreak}-day streak</span>
                </div>
              )}
              {currentMultiplier > 1 && (
                <p className="text-xs text-purple-200">{currentMultiplier}x multiplier</p>
              )}
            </div>
          </div>
          
          {/* Progress bar to next tier */}
          {tierProgress.nextTier && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-purple-200 mb-1">
                <span>{tierProgress.pointsNeeded} pts to {tierProgress.nextTier.name}</span>
                <span>{tierProgress.progress}%</span>
              </div>
              <div className="h-2 bg-purple-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all"
                  style={{ width: `${tierProgress.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Score Breakdown Popup */}
        {showScoreBreakdown && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowScoreBreakdown(false)}>
            <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="text-yellow-500" size={24} />
                  <h3 className="text-lg font-bold text-gray-900">Total Score Breakdown</h3>
                </div>
                <button onClick={() => setShowScoreBreakdown(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Reach Outs</span>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{leadStats?.allTime?.messagesSent || 0}</span>
                    <span className="text-gray-400 text-sm ml-2">× 5 pts = {(leadStats?.allTime?.messagesSent || 0) * 5}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Follow-ups</span>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{leadStats?.allTime?.followUps || 0}</span>
                    <span className="text-gray-400 text-sm ml-2">× 3 pts = {(leadStats?.allTime?.followUps || 0) * 3}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Responses</span>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{leadStats?.allTime?.responses || 0}</span>
                    <span className="text-gray-400 text-sm ml-2">× 5 pts = {(leadStats?.allTime?.responses || 0) * 5}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Calls Scheduled</span>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{leadStats?.allTime?.calls || 0}</span>
                    <span className="text-gray-400 text-sm ml-2">× 20 pts = {(leadStats?.allTime?.calls || 0) * 20}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 bg-yellow-50 rounded-lg px-3 -mx-3">
                  <span className="font-semibold text-gray-900">Total Score</span>
                  <span className="text-xl font-bold text-yellow-600">{leadStats?.allTime?.totalPoints || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Score Card */}
      <div 
        className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl cursor-pointer hover:opacity-95 transition-opacity"
        onClick={() => setShowScoreBreakdown(true)}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-purple-200 text-sm mb-1">Your Networking Score</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{tier.icon}</span>
              <div>
                <span className="text-4xl font-bold">{displayScore.toLocaleString()}</span>
                <span className="text-purple-200 text-lg ml-1">/ 4,000</span>
              </div>
            </div>
            <p className="text-lg font-medium text-white mt-1">{tier.name}</p>
          </div>
          
          {displayStreak > 0 && (
            <div className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
              <Flame className="text-orange-400 mx-auto mb-1" size={28} />
              <p className="text-2xl font-bold">{displayStreak}</p>
              <p className="text-xs text-purple-200">day streak</p>
              {currentMultiplier > 1 && (
                <p className="text-xs text-yellow-300 mt-1">{currentMultiplier}x bonus</p>
              )}
            </div>
          )}
        </div>
        
        {/* Progress to next tier */}
        {tierProgress.nextTier && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-purple-200">Progress to {tierProgress.nextTier.icon} {tierProgress.nextTier.name}</span>
              <span className="text-white font-medium">{tierProgress.pointsNeeded} pts needed</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-500"
                style={{ width: `${tierProgress.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard 
          title="Activity" 
          score={score?.activityScore || 0}
          maxScore={1000}
          icon={<Zap className="text-yellow-500" size={20} />}
          color="yellow"
        />
        <ScoreCard 
          title="Quality" 
          score={score?.qualityScore || 0}
          maxScore={1000}
          icon={<Target className="text-green-500" size={20} />}
          color="green"
        />
        <ScoreCard 
          title="Relationships" 
          score={score?.relationshipScore || 0}
          maxScore={1000}
          icon={<Users className="text-blue-500" size={20} />}
          color="blue"
        />
        <ScoreCard 
          title="Consistency" 
          score={score?.consistencyScore || 0}
          maxScore={1000}
          icon={<Calendar className="text-purple-500" size={20} />}
          color="purple"
        />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStat 
          label="Outreach Sent" 
          value={score?.monthlyStats?.outreachSent || localStats.coldOutreachSent || 0}
          subtext="this month"
        />
        <QuickStat 
          label="Response Rate" 
          value={`${score?.monthlyStats?.responseRate || localStats.responseRate || 0}%`}
          subtext="of outreach"
          highlight={score?.monthlyStats?.responseRate >= 60}
        />
        <QuickStat 
          label="Calls Scheduled" 
          value={score?.monthlyStats?.callsScheduled || localStats.callsScheduled || 0}
          subtext="this month"
        />
        <QuickStat 
          label="Network Size" 
          value={localStats.totalContacts || 0}
          subtext="contacts"
        />
      </div>

      {/* Goals Progress */}
      {goalsProgress.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="text-blue-600" size={20} />
              <h3 className="font-semibold text-gray-900">Monthly Goals</h3>
            </div>
            <span className="text-sm text-gray-500">
              {goalsProgress.completed}/{goalsProgress.total} complete
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
              style={{ width: `${goalsProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Recent Achievements */}
      {unlockedAchievementsList.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-500" size={20} />
              <h3 className="font-semibold text-gray-900">Recent Achievements</h3>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {unlockedAchievementsList.slice(0, 6).map(achievement => (
              <div 
                key={achievement.id}
                className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                title={achievement.description}
              >
                <span className="text-xl">{achievement.icon}</span>
                <span className="text-sm font-medium text-gray-700">{achievement.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target Companies */}
      {targetCompanies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="text-purple-600" size={20} />
              <h3 className="font-semibold text-gray-900">Target Companies</h3>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {targetCompanies.slice(0, 3).map(company => (
              <CompanyProgress key={company.companyName} company={company} />
            ))}
          </div>
        </div>
      )}
      
      {/* Score Breakdown Popup for full view */}
      {showScoreBreakdown && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowScoreBreakdown(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="text-yellow-500" size={24} />
                <h3 className="text-lg font-bold text-gray-900">Total Score Breakdown</h3>
              </div>
              <button onClick={() => setShowScoreBreakdown(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Reach Outs</span>
                <div className="text-right">
                  <span className="font-bold text-gray-900">{leadStats?.allTime?.messagesSent || 0}</span>
                  <span className="text-gray-400 text-sm ml-2">× 5 pts = {(leadStats?.allTime?.messagesSent || 0) * 5}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Responses</span>
                <div className="text-right">
                  <span className="font-bold text-gray-900">{leadStats?.allTime?.responses || 0}</span>
                  <span className="text-gray-400 text-sm ml-2">× 5 pts = {(leadStats?.allTime?.responses || 0) * 5}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Calls Scheduled</span>
                <div className="text-right">
                  <span className="font-bold text-gray-900">{leadStats?.allTime?.calls || 0}</span>
                  <span className="text-gray-400 text-sm ml-2">× 20 pts = {(leadStats?.allTime?.calls || 0) * 20}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-3 bg-yellow-50 rounded-lg px-3 -mx-3">
                <span className="font-semibold text-gray-900">Total Score</span>
                <span className="text-xl font-bold text-yellow-600">{leadStats?.allTime?.totalPoints || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
const ScoreCard = ({ title, score, maxScore, icon, color }) => {
  const percentage = Math.round((score / maxScore) * 100);
  const colorClasses = {
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200'
  };
  const barColors = {
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500'
  };
  
  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-600">{title}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{score}</p>
      <div className="h-1.5 bg-white/50 rounded-full mt-2 overflow-hidden">
        <div 
          className={`h-full ${barColors[color]} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const QuickStat = ({ label, value, subtext, highlight = false }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className={`text-2xl font-bold ${highlight ? 'text-green-600' : 'text-gray-900'}`}>
      {value}
    </p>
    <p className="text-xs text-gray-400">{subtext}</p>
  </div>
);

const CompanyProgress = ({ company }) => {
  const stars = '⭐'.repeat(company.penetrationStars || 1);
  
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-gray-900">{company.companyName}</span>
          <span className="text-sm text-gray-500">{company.companyScore}/100</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
            style={{ width: `${company.companyScore}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">{company.penetrationLevel}</span>
          <span className="text-xs">{stars}</span>
        </div>
      </div>
    </div>
  );
};

export default ScoreDashboard;
