import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Download, Eye, EyeOff, Filter, X } from 'lucide-react';
import { RELATIONSHIP_TYPES, SECTORS, getRelationshipTypeLabel, getSectorLabel as getCategorySectorLabel } from '../constants/categories';
import { CLOSENESS_LEVELS, STRATEGIC_VALUE_LEVELS, getFilterOptions } from '../services/graphLayoutService';
import { useSettings } from '../contexts/SettingsContext';

const GraphControls = ({
  contacts,
  viewType,
  onViewTypeChange,
  filters,
  onFiltersChange,
  showIntroductions,
  onShowIntroductionsChange,
  showMutualConnections,
  onShowMutualConnectionsChange,
  onResetView,
  onExportPNG
}) => {
  const { relationshipTypes: customRelationshipTypes, sectors: customSectors } = useSettings();
  
  const [expandedSections, setExpandedSections] = useState({
    viewMode: true,
    filters: true,
    connections: true
  });
  
  const [activeFilterType, setActiveFilterType] = useState(null);
  
  // Get available filter options from contacts
  const filterOptions = useMemo(() => getFilterOptions(contacts), [contacts]);
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const handleFilterSelect = (filterType, value) => {
    if (value === null) {
      // Clear this filter
      const newFilters = { ...filters };
      delete newFilters[filterType];
      onFiltersChange(newFilters);
    } else {
      onFiltersChange({ ...filters, [filterType]: value });
    }
    setActiveFilterType(null);
  };
  
  const clearAllFilters = () => {
    onFiltersChange({});
    setActiveFilterType(null);
  };
  
  const activeFiltersCount = Object.keys(filters).length;
  
  // Get label for relationship type (handles custom types too)
  const getRelationshipLabel = (value) => getRelationshipTypeLabel(value, customRelationshipTypes);
  
  // Get label for sector (handles custom sectors too)
  const getSectorLabel = (value) => getCategorySectorLabel(value, customSectors);

  return (
    <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Graph Controls</h2>
      </div>
      
      {/* View Mode Section */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('viewMode')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <span className="font-medium text-gray-700">View Mode</span>
          {expandedSections.viewMode ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        
        {expandedSections.viewMode && (
          <div className="px-4 pb-4 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="viewType"
                value="closeness"
                checked={viewType === 'closeness'}
                onChange={() => onViewTypeChange('closeness')}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Closeness</span>
                <p className="text-xs text-gray-500">Distance = relationship closeness</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="viewType"
                value="strategic"
                checked={viewType === 'strategic'}
                onChange={() => onViewTypeChange('strategic')}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Strategic Value</span>
                <p className="text-xs text-gray-500">Distance = professional value</p>
              </div>
            </label>
            
            {/* Level Legend */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">
                {viewType === 'closeness' ? 'Closeness Levels' : 'Value Levels'}
              </p>
              <div className="space-y-1">
                {(viewType === 'closeness' ? CLOSENESS_LEVELS : STRATEGIC_VALUE_LEVELS).map((level, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: `rgba(59, 130, 246, ${1 - idx * 0.2})` 
                      }}
                    />
                    <span className="text-gray-600">{level.min}-{level.max}: {level.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Filters Section */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('filters')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          {expandedSections.filters ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        
        {expandedSections.filters && (
          <div className="px-4 pb-4">
            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(filters).map(([key, value]) => (
                    <span 
                      key={key}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                    >
                      {key === 'relationshipType' ? getRelationshipLabel(value) : 
                       key === 'sector' ? getSectorLabel(value) : value}
                      <button
                        onClick={() => handleFilterSelect(key, null)}
                        className="hover:text-blue-900"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  onClick={clearAllFilters}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear all filters
                </button>
              </div>
            )}
            
            {/* Filter Options */}
            <div className="space-y-2">
              {/* Relationship Type Filter */}
              <div>
                <button
                  onClick={() => setActiveFilterType(activeFilterType === 'relationshipType' ? null : 'relationshipType')}
                  className="w-full px-3 py-2 text-sm text-left border border-gray-200 rounded-md hover:bg-gray-50 flex items-center justify-between"
                >
                  <span>Relationship Type</span>
                  <ChevronRight size={14} className={activeFilterType === 'relationshipType' ? 'rotate-90' : ''} />
                </button>
                {activeFilterType === 'relationshipType' && (
                  <div className="mt-1 border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                    {filterOptions.relationshipTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => handleFilterSelect('relationshipType', type)}
                        className={`w-full px-3 py-2 text-xs text-left hover:bg-blue-50 ${
                          filters.relationshipType === type ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        {getRelationshipLabel(type)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Sector Filter */}
              <div>
                <button
                  onClick={() => setActiveFilterType(activeFilterType === 'sector' ? null : 'sector')}
                  className="w-full px-3 py-2 text-sm text-left border border-gray-200 rounded-md hover:bg-gray-50 flex items-center justify-between"
                >
                  <span>Sector</span>
                  <ChevronRight size={14} className={activeFilterType === 'sector' ? 'rotate-90' : ''} />
                </button>
                {activeFilterType === 'sector' && (
                  <div className="mt-1 border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                    {filterOptions.sectors.map(sector => (
                      <button
                        key={sector}
                        onClick={() => handleFilterSelect('sector', sector)}
                        className={`w-full px-3 py-2 text-xs text-left hover:bg-blue-50 ${
                          filters.sector === sector ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        {getSectorLabel(sector)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Company Filter */}
              <div>
                <button
                  onClick={() => setActiveFilterType(activeFilterType === 'company' ? null : 'company')}
                  className="w-full px-3 py-2 text-sm text-left border border-gray-200 rounded-md hover:bg-gray-50 flex items-center justify-between"
                >
                  <span>Company</span>
                  <ChevronRight size={14} className={activeFilterType === 'company' ? 'rotate-90' : ''} />
                </button>
                {activeFilterType === 'company' && (
                  <div className="mt-1 border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                    {filterOptions.companies.map(company => (
                      <button
                        key={company}
                        onClick={() => handleFilterSelect('company', company)}
                        className={`w-full px-3 py-2 text-xs text-left hover:bg-blue-50 ${
                          filters.company === company ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        {company}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Location Filter */}
              <div>
                <button
                  onClick={() => setActiveFilterType(activeFilterType === 'location' ? null : 'location')}
                  className="w-full px-3 py-2 text-sm text-left border border-gray-200 rounded-md hover:bg-gray-50 flex items-center justify-between"
                >
                  <span>Location</span>
                  <ChevronRight size={14} className={activeFilterType === 'location' ? 'rotate-90' : ''} />
                </button>
                {activeFilterType === 'location' && (
                  <div className="mt-1 border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                    {filterOptions.locations.map(location => (
                      <button
                        key={location}
                        onClick={() => handleFilterSelect('location', location)}
                        className={`w-full px-3 py-2 text-xs text-left hover:bg-blue-50 ${
                          filters.location === location ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        {location}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Tags Filter */}
              {filterOptions.tags.length > 0 && (
                <div>
                  <button
                    onClick={() => setActiveFilterType(activeFilterType === 'tag' ? null : 'tag')}
                    className="w-full px-3 py-2 text-sm text-left border border-gray-200 rounded-md hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Tags</span>
                    <ChevronRight size={14} className={activeFilterType === 'tag' ? 'rotate-90' : ''} />
                  </button>
                  {activeFilterType === 'tag' && (
                    <div className="mt-1 border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                      {filterOptions.tags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => handleFilterSelect('tag', tag)}
                          className={`w-full px-3 py-2 text-xs text-left hover:bg-blue-50 ${
                            filters.tag === tag ? 'bg-blue-50 text-blue-700' : ''
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Show Connections Section */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('connections')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <span className="font-medium text-gray-700">Show Connections</span>
          {expandedSections.connections ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        
        {expandedSections.connections && (
          <div className="px-4 pb-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showIntroductions}
                onChange={(e) => onShowIntroductionsChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div className="flex items-center gap-2">
                {showIntroductions ? <Eye size={16} className="text-gray-400" /> : <EyeOff size={16} className="text-gray-400" />}
                <span className="text-sm text-gray-700">Show introductions</span>
              </div>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showMutualConnections}
                onChange={(e) => onShowMutualConnectionsChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div className="flex items-center gap-2">
                {showMutualConnections ? <Eye size={16} className="text-gray-400" /> : <EyeOff size={16} className="text-gray-400" />}
                <span className="text-sm text-gray-700">Show mutual connections</span>
              </div>
            </label>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="p-4 space-y-2">
        <button
          onClick={onResetView}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={16} />
          Reset View
        </button>
        
        <button
          onClick={onExportPNG}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          <Download size={16} />
          Export as PNG
        </button>
      </div>
      
      {/* Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500">
          Showing {Object.keys(filters).length > 0 ? 'filtered' : 'all'} contacts
        </p>
        <p className="text-sm font-medium text-gray-700">
          {contacts.length} contacts in network
        </p>
      </div>
    </div>
  );
};

export default GraphControls;
