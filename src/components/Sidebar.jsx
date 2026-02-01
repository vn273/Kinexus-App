import { Users, Building, GraduationCap, Briefcase, Heart, Home, Award } from 'lucide-react';
import { useContacts } from '../contexts/ContactContext';
import { RELATIONSHIP_TYPES } from '../constants/categories';
import { getRelationshipTypeCounts } from '../services/searchService';

// Icons for each relationship type
const RELATIONSHIP_ICONS = {
  'high-school': GraduationCap,
  'college-ucla': GraduationCap,
  'professional-worked': Briefcase,
  'professional-networking': Users,
  'personal-friends': Heart,
  'family': Home,
  'mentors-advisors': Award,
};

const Sidebar = ({ selectedRelationshipTypes = [], onRelationshipTypeToggle }) => {
  const { contacts } = useContacts();

  // Get counts for each relationship type
  const counts = getRelationshipTypeCounts(contacts);

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Relationship Types</h2>
      
      <div className="space-y-1">
        {RELATIONSHIP_TYPES.map((type) => {
          const count = counts[type.value] || 0;
          const isSelected = selectedRelationshipTypes.includes(type.value);
          const Icon = RELATIONSHIP_ICONS[type.value] || Users;
          
          return (
            <button
              key={type.value}
              onClick={() => onRelationshipTypeToggle(type.value)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon size={16} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
                <span className="truncate">{type.label}</span>
              </div>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                isSelected
                  ? 'bg-blue-200'
                  : 'bg-gray-200'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
        
        {/* Unassigned contacts */}
        {counts['unassigned'] > 0 && (
          <button
            onClick={() => onRelationshipTypeToggle('unassigned')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedRelationshipTypes.includes('unassigned')
                ? 'bg-gray-200 text-gray-800'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-400" />
              <span>Unassigned</span>
            </div>
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-200">
              {counts['unassigned']}
            </span>
          </button>
        )}
      </div>

      {/* Show all button */}
      {selectedRelationshipTypes.length > 0 && (
        <button
          onClick={() => onRelationshipTypeToggle(null)}
          className="w-full mt-4 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          Clear Selection
        </button>
      )}

      {/* Total count */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Total Contacts: <span className="font-semibold">{contacts.length}</span>
        </div>
        {selectedRelationshipTypes.length > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {selectedRelationshipTypes.length} type{selectedRelationshipTypes.length > 1 ? 's' : ''} selected
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
