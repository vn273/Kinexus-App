import { useState, useMemo } from 'react';
import { Building2, Users, TrendingUp, Target, Plus, X, ChevronRight, Star, Zap } from 'lucide-react';
import useGamification from '../hooks/useGamification';
import { getCompanyPenetrationLevel, COMPANY_PENETRATION_LEVELS } from '../utils/scoreCalculations';

const CompanyScorecard = ({ compact = false, contacts = [], leads = [] }) => {
  const { 
    companyScores, 
    targetCompanies, 
    setTargetCompany, 
    loading 
  } = useGamification();

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all unique companies from contacts and leads
  const allCompanies = useMemo(() => {
    const companyMap = new Map();
    
    contacts.forEach(contact => {
      if (contact.company) {
        const name = contact.company.trim();
        if (!companyMap.has(name)) {
          companyMap.set(name, { name, contacts: 0, leads: 0 });
        }
        companyMap.get(name).contacts++;
      }
    });
    
    leads.forEach(lead => {
      if (lead.company) {
        const name = lead.company.trim();
        if (!companyMap.has(name)) {
          companyMap.set(name, { name, contacts: 0, leads: 0 });
        }
        companyMap.get(name).leads++;
      }
    });
    
    return Array.from(companyMap.values())
      .sort((a, b) => (b.contacts + b.leads) - (a.contacts + a.leads));
  }, [contacts, leads]);

  // Get scored companies - convert array to name-based lookup
  const scoredCompanies = useMemo(() => {
    // companyScores is an array from the service
    const scoreMap = {};
    companyScores.forEach(cs => {
      scoreMap[cs.companyName] = {
        name: cs.companyName,
        score: cs.companyScore || 0,
        contactCount: cs.contactCount || 0,
        seniorContacts: cs.seniorContacts || 0,
        recentInteractions: cs.recentInteractions || 0,
        isTarget: cs.isTargetCompany || false,
        level: getCompanyPenetrationLevel(cs.companyScore || 0)
      };
    });

    // Add all companies from contacts/leads that might not have scores yet
    allCompanies.forEach(company => {
      if (!scoreMap[company.name]) {
        scoreMap[company.name] = {
          name: company.name,
          score: 0,
          contactCount: company.contacts || 0,
          seniorContacts: 0,
          recentInteractions: 0,
          isTarget: targetCompanies.includes(company.name),
          level: getCompanyPenetrationLevel(0)
        };
      }
    });

    return Object.values(scoreMap).sort((a, b) => {
      // Targets first, then by score
      if (a.isTarget && !b.isTarget) return -1;
      if (!a.isTarget && b.isTarget) return 1;
      return (b.score || 0) - (a.score || 0);
    });
  }, [companyScores, targetCompanies, allCompanies]);

  // Filter for add modal
  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return allCompanies;
    const query = searchQuery.toLowerCase();
    return allCompanies.filter(c => c.name.toLowerCase().includes(query));
  }, [allCompanies, searchQuery]);

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl p-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
            <Building2 className="text-blue-500" size={20} />
            <h3 className="font-semibold text-gray-900">Target Companies</h3>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <Plus size={18} className="text-gray-500" />
          </button>
        </div>

        {targetCompanies.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No target companies set
          </p>
        ) : (
          <div className="space-y-2">
            {scoredCompanies.filter(c => c.isTarget).slice(0, 3).map(company => (
              <CompanyMiniCard key={company.name} company={company} />
            ))}
            {targetCompanies.length > 3 && (
              <p className="text-xs text-gray-400 text-center">
                +{targetCompanies.length - 3} more
              </p>
            )}
          </div>
        )}

        {showAddModal && (
          <AddCompanyModal
            companies={filteredCompanies}
            targetCompanies={targetCompanies}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            onToggle={(name) => setTargetCompany(name, !targetCompanies.includes(name))}
            onClose={() => {
              setShowAddModal(false);
              setSearchQuery('');
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Building2 className="text-blue-600" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Company Scorecard</h2>
              <p className="text-sm text-gray-500">
                Track your network penetration at target companies
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Add Target
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/80 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{targetCompanies.length}</p>
            <p className="text-xs text-gray-500">Target Companies</p>
          </div>
          <div className="bg-white/80 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {scoredCompanies.filter(c => c.isTarget && (c.score || 0) >= 50).length}
            </p>
            <p className="text-xs text-gray-500">Strong Networks</p>
          </div>
          <div className="bg-white/80 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {Math.round(
                scoredCompanies.filter(c => c.isTarget).reduce((sum, c) => sum + (c.score || 0), 0) / 
                Math.max(targetCompanies.length, 1)
              )}
            </p>
            <p className="text-xs text-gray-500">Avg Score</p>
          </div>
        </div>
      </div>

      {/* Penetration levels legend */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <p className="text-xs font-medium text-gray-500 mb-2">Penetration Levels</p>
        <div className="flex flex-wrap gap-2">
          {COMPANY_PENETRATION_LEVELS.map(level => (
            <span 
              key={level.name}
              className={`px-2 py-1 rounded text-xs font-medium ${level.color}`}
            >
              {level.icon} {level.name}
            </span>
          ))}
        </div>
      </div>

      {/* Company list */}
      <div className="p-6">
        {scoredCompanies.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500 mb-2">No companies tracked yet</p>
            <p className="text-sm text-gray-400">
              Add contacts or leads with company names to start tracking
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Target companies */}
            {scoredCompanies.filter(c => c.isTarget).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Target size={16} className="text-blue-500" />
                  Target Companies
                </h3>
                <div className="space-y-3">
                  {scoredCompanies.filter(c => c.isTarget).map(company => (
                    <CompanyCard 
                      key={company.name} 
                      company={company}
                      onRemoveTarget={() => setTargetCompany(company.name, false)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other companies */}
            {scoredCompanies.filter(c => !c.isTarget).length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Other Companies
                </h3>
                <div className="space-y-2">
                  {scoredCompanies.filter(c => !c.isTarget).slice(0, 10).map(company => (
                    <CompanyCard 
                      key={company.name} 
                      company={company}
                      isCompact
                      onAddTarget={() => setTargetCompany(company.name, true)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddCompanyModal
          companies={filteredCompanies}
          targetCompanies={targetCompanies}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onToggle={(name) => setTargetCompany(name, !targetCompanies.includes(name))}
          onClose={() => {
            setShowAddModal(false);
            setSearchQuery('');
          }}
        />
      )}
    </div>
  );
};

const CompanyMiniCard = ({ company }) => {
  const level = company.level || getCompanyPenetrationLevel(company.score || 0);
  
  return (
    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${level.color}`}>
        {level.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{company.name}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${company.score || 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{company.score || 0}</span>
        </div>
      </div>
    </div>
  );
};

const CompanyCard = ({ company, isCompact = false, onRemoveTarget, onAddTarget }) => {
  const level = company.level || getCompanyPenetrationLevel(company.score || 0);
  
  if (isCompact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-3">
          <span className={`text-lg ${level.color.split(' ')[0]}`}>{level.icon}</span>
          <div>
            <p className="font-medium text-gray-900">{company.name}</p>
            <p className="text-xs text-gray-500">{level.name} • Score: {company.score || 0}</p>
          </div>
        </div>
        <button
          onClick={onAddTarget}
          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          + Target
        </button>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border-2 ${level.borderColor || 'border-gray-200'} bg-white`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${level.color}`}>
            {level.icon}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{company.name}</h4>
            <p className={`text-sm font-medium ${level.textColor || 'text-gray-600'}`}>
              {level.name}
            </p>
          </div>
        </div>
        {onRemoveTarget && (
          <button
            onClick={onRemoveTarget}
            className="p-1 hover:bg-gray-100 rounded"
            title="Remove from targets"
          >
            <X size={18} className="text-gray-400" />
          </button>
        )}
      </div>

      {/* Score bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500">Penetration Score</span>
          <span className="font-semibold text-gray-900">{company.score || 0}/100</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${level.barColor || 'bg-blue-500'}`}
            style={{ width: `${company.score || 0}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <Users size={16} className="mx-auto text-blue-500 mb-1" />
          <p className="text-lg font-bold text-gray-900">{company.contactCount || 0}</p>
          <p className="text-xs text-gray-500">Contacts</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <Star size={16} className="mx-auto text-yellow-500 mb-1" />
          <p className="text-lg font-bold text-gray-900">{company.seniorContacts || 0}</p>
          <p className="text-xs text-gray-500">Sr. Level</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <Zap size={16} className="mx-auto text-green-500 mb-1" />
          <p className="text-lg font-bold text-gray-900">{company.recentInteractions || 0}</p>
          <p className="text-xs text-gray-500">This Month</p>
        </div>
      </div>
    </div>
  );
};

const AddCompanyModal = ({ companies, targetCompanies, searchQuery, onSearch, onToggle, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Manage Target Companies</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto max-h-96 p-4">
          {companies.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No companies found. Add contacts or leads with company names.
            </p>
          ) : (
            <div className="space-y-2">
              {companies.map(company => {
                const isTarget = targetCompanies.includes(company.name);
                return (
                  <button
                    key={company.name}
                    onClick={() => onToggle(company.name)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isTarget 
                        ? 'bg-blue-50 border-2 border-blue-300' 
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 size={20} className={isTarget ? 'text-blue-500' : 'text-gray-400'} />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{company.name}</p>
                        <p className="text-xs text-gray-500">
                          {company.contacts} contacts • {company.leads} leads
                        </p>
                      </div>
                    </div>
                    {isTarget ? (
                      <Target size={20} className="text-blue-500" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyScorecard;
