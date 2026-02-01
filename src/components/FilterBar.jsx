import { useState, useMemo } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { SECTORS } from '../constants/categories';
import { getUniqueCompanies, getUniqueLocations } from '../services/searchService';

const FilterBar = ({ 
  contacts,
  selectedSector,
  onSectorChange,
  selectedCompany,
  onCompanyChange,
  selectedLocation,
  onLocationChange,
  selectedContactStatus,
  onContactStatusChange,
  onResetFilters
}) => {
  const [sectorOpen, setSectorOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [contactStatusOpen, setContactStatusOpen] = useState(false);

  // Contact status options
  const CONTACT_STATUS_OPTIONS = [
    { value: 'recent', label: '✅ Contacted Recently', description: 'Within contact frequency' },
    { value: 'soon', label: '⚠️ Contact Soon', description: 'Due or slightly overdue' },
    { value: 'overdue', label: '🔴 Overdue', description: 'Past contact frequency' },
  ];

  // Get unique values for dropdowns
  const companies = useMemo(() => getUniqueCompanies(contacts), [contacts]);
  const locations = useMemo(() => getUniqueLocations(contacts), [contacts]);

  // Check if any filters are active
  const hasActiveFilters = selectedSector || selectedCompany || selectedLocation || selectedContactStatus;

  const handleSectorSelect = (value) => {
    onSectorChange(value);
    setSectorOpen(false);
  };

  const handleCompanySelect = (value) => {
    onCompanyChange(value);
    setCompanyOpen(false);
  };

  const handleLocationSelect = (value) => {
    onLocationChange(value);
    setLocationOpen(false);
  };

  const handleContactStatusSelect = (value) => {
    onContactStatusChange?.(value);
    setContactStatusOpen(false);
  };

  // Close dropdowns when clicking outside
  const handleClickOutside = () => {
    setSectorOpen(false);
    setCompanyOpen(false);
    setLocationOpen(false);
    setContactStatusOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="flex items-center gap-2 text-gray-600">
        <Filter size={16} />
        <span className="text-sm font-medium">Filters:</span>
      </div>

      {/* Sector Filter */}
      <div className="relative">
        <button
          onClick={() => {
            setSectorOpen(!sectorOpen);
            setCompanyOpen(false);
            setLocationOpen(false);
          }}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md transition-colors ${
            selectedSector 
              ? 'bg-blue-50 border-blue-300 text-blue-700' 
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span>Sector: {selectedSector ? SECTORS.find(s => s.value === selectedSector)?.label || 'All Finance' : 'All'}</span>
          <ChevronDown size={14} className={`transition-transform ${sectorOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {sectorOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={handleClickOutside} />
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
              <button
                onClick={() => handleSectorSelect(null)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!selectedSector ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                All Sectors
              </button>
              <button
                onClick={() => handleSectorSelect('finance-all')}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 font-medium border-b ${selectedSector === 'finance-all' ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                💰 All Finance
              </button>
              {SECTORS.map(sector => (
                <button
                  key={sector.value}
                  onClick={() => handleSectorSelect(sector.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedSector === sector.value ? 'bg-blue-50 text-blue-700' : ''}`}
                >
                  {sector.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Company Filter */}
      <div className="relative">
        <button
          onClick={() => {
            setCompanyOpen(!companyOpen);
            setSectorOpen(false);
            setLocationOpen(false);
          }}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md transition-colors ${
            selectedCompany 
              ? 'bg-blue-50 border-blue-300 text-blue-700' 
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span>Company: {selectedCompany || 'All'}</span>
          <ChevronDown size={14} className={`transition-transform ${companyOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {companyOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={handleClickOutside} />
            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
              <button
                onClick={() => handleCompanySelect(null)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!selectedCompany ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                All Companies
              </button>
              {companies.map(company => (
                <button
                  key={company}
                  onClick={() => handleCompanySelect(company)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedCompany === company ? 'bg-blue-50 text-blue-700' : ''}`}
                >
                  {company}
                </button>
              ))}
              {companies.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">No companies found</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Location Filter */}
      <div className="relative">
        <button
          onClick={() => {
            setLocationOpen(!locationOpen);
            setSectorOpen(false);
            setCompanyOpen(false);
            setContactStatusOpen(false);
          }}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md transition-colors ${
            selectedLocation 
              ? 'bg-blue-50 border-blue-300 text-blue-700' 
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span>Location: {selectedLocation || 'All'}</span>
          <ChevronDown size={14} className={`transition-transform ${locationOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {locationOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={handleClickOutside} />
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
              <button
                onClick={() => handleLocationSelect(null)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!selectedLocation ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                All Locations
              </button>
              {locations.map(location => (
                <button
                  key={location}
                  onClick={() => handleLocationSelect(location)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedLocation === location ? 'bg-blue-50 text-blue-700' : ''}`}
                >
                  {location}
                </button>
              ))}
              {locations.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">No locations found</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Contact Status Filter */}
      <div className="relative">
        <button
          onClick={() => {
            setContactStatusOpen(!contactStatusOpen);
            setSectorOpen(false);
            setCompanyOpen(false);
            setLocationOpen(false);
          }}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md transition-colors ${
            selectedContactStatus 
              ? selectedContactStatus === 'recent' ? 'bg-green-50 border-green-300 text-green-700'
                : selectedContactStatus === 'soon' ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                : 'bg-red-50 border-red-300 text-red-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span>Status: {selectedContactStatus 
            ? CONTACT_STATUS_OPTIONS.find(o => o.value === selectedContactStatus)?.label.replace(/^[^\s]+\s/, '') 
            : 'All'}</span>
          <ChevronDown size={14} className={`transition-transform ${contactStatusOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {contactStatusOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={handleClickOutside} />
            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-20">
              <button
                onClick={() => handleContactStatusSelect(null)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!selectedContactStatus ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                All Statuses
              </button>
              {CONTACT_STATUS_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleContactStatusSelect(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedContactStatus === option.value ? 'bg-blue-50 text-blue-700' : ''}`}
                >
                  <div>{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Reset Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={onResetFilters}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
        >
          <X size={14} />
          Reset Filters
        </button>
      )}
    </div>
  );
};

export default FilterBar;
