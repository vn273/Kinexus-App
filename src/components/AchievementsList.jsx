import { useState, useMemo } from 'react';
import { Trophy, Lock, ChevronDown, ChevronUp, Search, X, Star } from 'lucide-react';
import useGamification from '../hooks/useGamification';
import { ACHIEVEMENT_CATEGORIES } from '../services/achievementService';
import { SCORE_TIERS, getTierForScore } from '../utils/scoreCalculations';

const AchievementsList = ({ compact = false }) => {
  const { 
    unlockedAchievementsList, 
    lockedAchievements, 
    achievementProgress,
    achievements,
    ACHIEVEMENTS,
    loading,
    score
  } = useGamification();

  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLocked, setShowLocked] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Get current tier and total score
  const totalScore = score?.totalScore || 0;
  const currentTier = getTierForScore(totalScore);

  const allAchievements = useMemo(() => {
    return Object.values(ACHIEVEMENTS);
  }, [ACHIEVEMENTS]);

  const unlockedIds = useMemo(() => {
    return new Set(achievements.unlockedAchievements || []);
  }, [achievements]);

  const filteredAchievements = useMemo(() => {
    let filtered = allAchievements;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(query) || 
        a.description.toLowerCase().includes(query)
      );
    }
    
    // Sort: unlocked first, then by points
    return filtered.sort((a, b) => {
      const aUnlocked = unlockedIds.has(a.id);
      const bUnlocked = unlockedIds.has(b.id);
      if (aUnlocked && !bUnlocked) return -1;
      if (!aUnlocked && bUnlocked) return 1;
      return b.points - a.points;
    });
  }, [allAchievements, selectedCategory, searchQuery, unlockedIds]);

  const stats = useMemo(() => {
    const total = allAchievements.length;
    const unlocked = unlockedAchievementsList.length;
    const totalPoints = allAchievements.reduce((sum, a) => sum + a.points, 0);
    const earnedPoints = achievements.totalPoints || 0;
    
    return { total, unlocked, totalPoints, earnedPoints };
  }, [allAchievements, unlockedAchievementsList, achievements]);

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl p-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-500" size={20} />
              <h3 className="font-semibold text-gray-900">Achievements</h3>
            </div>
            <span className="text-sm text-gray-500">
              {stats.unlocked}/{stats.total}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all"
              style={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
            />
          </div>

          {/* Recent achievements */}
          <div className="flex flex-wrap gap-2 mb-3">
            {unlockedAchievementsList.slice(0, 6).map(achievement => (
              <div 
                key={achievement.id}
                className="text-2xl hover:scale-110 transition-transform cursor-pointer"
                title={`${achievement.name}: ${achievement.description}`}
              >
                {achievement.icon}
              </div>
            ))}
            {stats.unlocked > 6 && (
              <span className="text-sm text-gray-400 self-center">
                +{stats.unlocked - 6} more
              </span>
            )}
          </div>
          
          {/* See all achievements link */}
          <button
            onClick={() => setShowAllAchievements(true)}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            See all achievements →
          </button>
        </div>
        
        {/* All Achievements Modal */}
        {showAllAchievements && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAllAchievements(false)}>
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy size={24} />
                  <div>
                    <h2 className="text-lg font-bold">All Achievements</h2>
                    <p className="text-sm text-yellow-100">{stats.unlocked} of {stats.total} unlocked • {stats.earnedPoints} pts earned</p>
                  </div>
                </div>
                <button onClick={() => setShowAllAchievements(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              {/* Scrollable Content - Level Progression + Achievements */}
              <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
                {/* Level Progression Section */}
                <div className="px-6 pt-5 pb-4 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="text-purple-500" size={18} />
                    <h3 className="font-semibold text-gray-900">Level Progression</h3>
                    <span className="text-sm text-gray-500 ml-auto">{totalScore} total pts</span>
                  </div>
                  <div className="space-y-2">
                    {SCORE_TIERS.map((tier, index) => {
                      const isCurrentTier = currentTier.name === tier.name;
                      const isCompleted = totalScore > tier.max;
                      const pointsDisplay = tier.max === Infinity ? `${tier.min}+` : `${tier.min} - ${tier.max}`;
                      
                      return (
                        <div
                          key={tier.name}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                            isCurrentTier
                              ? 'bg-purple-100 border-2 border-purple-400 shadow-sm'
                              : isCompleted
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <span className="text-xl w-8 text-center">{tier.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm ${
                                isCurrentTier ? 'text-purple-900' : isCompleted ? 'text-green-700' : 'text-gray-600'
                              }`}>
                                {tier.name}
                              </span>
                              {isCurrentTier && (
                                <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
                                  Current
                                </span>
                              )}
                              {isCompleted && (
                                <span className="text-green-500 text-sm">✓</span>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs font-medium ${
                            isCurrentTier ? 'text-purple-700' : isCompleted ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {pointsDisplay} pts
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              
                {/* Achievements Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allAchievements
                    .sort((a, b) => {
                      const aUnlocked = unlockedIds.has(a.id);
                      const bUnlocked = unlockedIds.has(b.id);
                      if (aUnlocked && !bUnlocked) return -1;
                      if (!aUnlocked && bUnlocked) return 1;
                      return b.points - a.points;
                    })
                    .map(achievement => {
                      const isUnlocked = unlockedIds.has(achievement.id);
                      const progress = achievementProgress[achievement.id];
                      
                      return (
                        <div
                          key={achievement.id}
                          className={`rounded-lg border p-3 ${
                            isUnlocked
                              ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`text-2xl ${!isUnlocked && 'grayscale opacity-40'}`}>
                              {isUnlocked ? achievement.icon : <Lock className="text-gray-400" size={24} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-semibold text-sm ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                                  {achievement.name}
                                </h4>
                                {isUnlocked && (
                                  <span className="text-green-500 text-xs">✓</span>
                                )}
                              </div>
                              <p className={`text-xs mt-0.5 ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                                {achievement.description}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                  isUnlocked 
                                    ? 'bg-yellow-200 text-yellow-800' 
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                  +{achievement.points} pts
                                </span>
                                {!isUnlocked && progress && (
                                  <span className="text-xs text-gray-500">
                                    {progress.current}/{progress.target}
                                  </span>
                                )}
                              </div>
                              {!isUnlocked && progress && (
                                <div className="h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                  <div 
                                    className="h-full bg-yellow-400 transition-all"
                                    style={{ width: `${progress.percentage}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
              {/* End of scrollable content */}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Trophy className="text-yellow-600" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Achievements</h2>
              <p className="text-sm text-gray-500">
                {stats.unlocked} of {stats.total} unlocked
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-yellow-600">
              {stats.earnedPoints.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">
              / {stats.totalPoints.toLocaleString()} points
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
            style={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search achievements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>

          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {ACHIEVEMENT_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map(achievement => {
            const isUnlocked = unlockedIds.has(achievement.id);
            const progress = achievementProgress[achievement.id];
            
            if (!showLocked && !isUnlocked) return null;
            
            return (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                isUnlocked={isUnlocked}
                progress={progress}
              />
            );
          })}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Trophy className="mx-auto mb-3 text-gray-300" size={48} />
            <p>No achievements found</p>
          </div>
        )}
      </div>

      {/* Toggle locked */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={() => setShowLocked(!showLocked)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          {showLocked ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          {showLocked ? 'Hide' : 'Show'} locked achievements
        </button>
      </div>
    </div>
  );
};

const AchievementCard = ({ achievement, isUnlocked, progress }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={`relative rounded-xl border-2 p-4 transition-all cursor-pointer hover:shadow-md ${
        isUnlocked
          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300'
          : 'bg-gray-50 border-gray-200'
      }`}
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Badge */}
      {isUnlocked && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`text-3xl ${!isUnlocked && 'opacity-40 grayscale'}`}>
          {isUnlocked ? achievement.icon : <Lock className="text-gray-400" size={32} />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold truncate ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
            {achievement.name}
          </h4>
          <p className={`text-sm ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
            {achievement.description}
          </p>
          
          {/* Points */}
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              isUnlocked 
                ? 'bg-yellow-200 text-yellow-800' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              +{achievement.points} pts
            </span>
            
            {/* Progress bar for locked achievements */}
            {!isUnlocked && progress && (
              <span className="text-xs text-gray-500">
                {progress.current}/{progress.target}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {!isUnlocked && progress && (
            <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-yellow-400 transition-all"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AchievementsList;
