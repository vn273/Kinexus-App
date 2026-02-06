import { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Building2, 
  MapPin, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { useContacts } from '../contexts/ContactContext';
import { useSettings } from '../contexts/SettingsContext';
import { getNetworkInsights } from '../services/networkInsightsService';
import PieChart from './PieChart';

// Color palette for charts
const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

const getColor = (index) => CHART_COLORS[index % CHART_COLORS.length];

const NetworkInsights = ({ onContactClick }) => {
  const { contacts } = useContacts();
  const { relationshipTypes, sectors } = useSettings();
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  const insights = useMemo(() => getNetworkInsights(contacts, { relationshipTypes, sectors }), [contacts, relationshipTypes, sectors]);
  
  if (contacts.length === 0) {
    return null;
  }
  
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'relationships', label: 'Relationships' },
    { id: 'sectors', label: 'Sectors' },
    { id: 'companies', label: 'Companies' }
  ];
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="text-purple-600" size={20} />
          <h3 className="font-semibold text-gray-900">Network Insights</h3>
        </div>
        {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <Users className="mx-auto text-blue-600 mb-1" size={20} />
                  <p className="text-2xl font-bold text-blue-700">{insights.stats.totalContacts}</p>
                  <p className="text-xs text-blue-600">Total Contacts</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <TrendingUp className="mx-auto text-green-600 mb-1" size={20} />
                  <p className="text-2xl font-bold text-green-700">{insights.stats.newThisMonth}</p>
                  <p className="text-xs text-green-600">New This Month</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <AlertCircle className="mx-auto text-orange-600 mb-1" size={20} />
                  <p className="text-2xl font-bold text-orange-700">{insights.interactionStats.contactsNeedingAttention}</p>
                  <p className="text-xs text-orange-600">Need Attention</p>
                </div>
              </div>
              
              {/* Interaction Stats */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Clock size={14} />
                  Interaction Stats
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600">
                    Avg. time since last contact: <span className="font-medium text-gray-900">{insights.interactionStats.avgTimeSinceContact}</span>
                  </p>
                  <p className="text-gray-600">
                    Never contacted: <span className="font-medium text-gray-900">{insights.interactionStats.totalNeverContacted}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Relationships Tab */}
          {activeTab === 'relationships' && (
            <div className="space-y-4">
              {/* List */}
              <div className="space-y-2">
                {insights.relationshipBreakdown.slice(0, 7).map((item, idx) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getColor(idx) }}
                      />
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{item.count}</span>
                      <span className="text-xs text-gray-500">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pie Chart at bottom */}
              {insights.relationshipBreakdown.length > 0 && (
                <div className="flex justify-center bg-gray-50 rounded-xl p-4">
                  <PieChart 
                    data={insights.relationshipBreakdown.slice(0, 7).map((item, idx) => ({
                      label: item.label,
                      value: item.count,
                      color: getColor(idx)
                    }))}
                    size={150}
                    showLegend={false}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Sectors Tab */}
          {activeTab === 'sectors' && (
            <div className="space-y-4">
              {/* List */}
              <div className="space-y-2">
                {insights.sectorBreakdown.slice(0, 8).map((item, idx) => (
                  <div key={item.sector}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getColor(idx) }}
                        />
                        <Briefcase size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{item.count}</span>
                        <span className="text-xs text-gray-500">({item.percentage}%)</span>
                      </div>
                    </div>
                    
                    {/* Sub-categories for Finance */}
                    {item.subCategories && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.subCategories.map(sub => (
                          <div key={sub.sector} className="flex items-center justify-between text-xs text-gray-500">
                            <span>• {sub.label}</span>
                            <span>{sub.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Pie Chart at bottom */}
              {insights.sectorBreakdown.length > 0 && (
                <div className="flex justify-center bg-gray-50 rounded-xl p-4">
                  <PieChart 
                    data={insights.sectorBreakdown.slice(0, 8).map((item, idx) => ({
                      label: item.label,
                      value: item.count,
                      color: getColor(idx)
                    }))}
                    size={150}
                    showLegend={false}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Companies Tab */}
          {activeTab === 'companies' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Building2 size={14} />
                  Top Companies
                </h4>
                <div className="space-y-2">
                  {insights.topCompanies.map((item, idx) => (
                    <div key={item.company} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4">{idx + 1}.</span>
                        <span className="text-sm text-gray-700">{item.company}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{item.count} contacts</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <MapPin size={14} />
                  Top Locations
                </h4>
                <div className="space-y-2">
                  {insights.topLocations.map((item, idx) => (
                    <div key={item.location} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4">{idx + 1}.</span>
                        <span className="text-sm text-gray-700">{item.location}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{item.count} contacts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkInsights;
