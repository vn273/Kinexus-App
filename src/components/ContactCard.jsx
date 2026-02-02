import { Building2, Mail, Phone, Linkedin, Calendar, MapPin, Briefcase, GraduationCap, Heart } from 'lucide-react';
import { getContactStatusColor, formatDate } from '../utils/dateHelpers';
import { getRelationshipTypeLabel, getSectorLabel } from '../constants/categories';

const ContactCard = ({ contact, onClick }) => {
  // Always green contacts stay green regardless of last contact date
  const statusColor = contact.alwaysGreen 
    ? 'green' 
    : getContactStatusColor(contact.lastContactDate, contact.contactRegularity);
  
  const statusColorClasses = {
    green: 'bg-green-100 border-green-400',
    yellow: 'bg-yellow-100 border-yellow-400',
    red: 'bg-red-100 border-red-400',
    gray: 'bg-gray-100 border-gray-400'
  };

  // Get display values
  const jobTitle = contact.jobTitle || contact.role;
  const sectorLabel = contact.sector ? getSectorLabel(contact.sector) : null;
  
  // Handle both old single value and new array format
  const relationshipLabels = (() => {
    if (contact.relationshipTypes && Array.isArray(contact.relationshipTypes)) {
      return contact.relationshipTypes.map(t => getRelationshipTypeLabel(t));
    } else if (contact.relationshipType) {
      return [getRelationshipTypeLabel(contact.relationshipType)];
    }
    return [];
  })();

  return (
    <div
      onClick={() => onClick(contact)}
      className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-shadow ${statusColorClasses[statusColor]}`}
    >
      {/* Header with name */}
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {contact.firstName} {contact.lastName}
        </h3>
        {contact.alwaysGreen && (
          <Heart size={16} className="text-pink-500 fill-pink-500" title="Close friend/family (always green)" />
        )}
      </div>

      {/* Job title and company */}
      {(contact.company || jobTitle) && (
        <div className="flex items-start gap-2 mb-2 text-sm text-gray-700">
          <Building2 size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            {jobTitle && <span className="font-medium">{jobTitle}</span>}
            {jobTitle && contact.company && <span> @ </span>}
            {contact.company && <span>{contact.company}</span>}
          </div>
        </div>
      )}

      {/* Sector badge */}
      {sectorLabel && (
        <div className="flex items-center gap-1.5 mb-2 text-sm text-gray-600">
          <Briefcase size={14} className="text-gray-500" />
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
            {sectorLabel}
          </span>
        </div>
      )}

      {/* Relationship type badges */}
      {relationshipLabels.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2 text-sm text-gray-600 flex-wrap">
          <GraduationCap size={14} className="text-gray-500 flex-shrink-0" />
          {relationshipLabels.map((label, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Location */}
      {contact.location && (
        <div className="flex items-center gap-1.5 mb-2 text-sm text-gray-600">
          <MapPin size={14} className="text-gray-500" />
          <span>{contact.location}</span>
        </div>
      )}

      {/* Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {contact.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded"
            >
              {tag}
            </span>
          ))}
          {contact.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
              +{contact.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Contact info */}
      <div className="space-y-1 text-xs text-gray-600">
        {contact.email && (
          <div className="flex items-center gap-1">
            <Mail size={12} />
            <span className="truncate">{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-1">
            <Phone size={12} />
            <span>{contact.phone}</span>
          </div>
        )}
        {contact.linkedInUrl && (
          <div className="flex items-center gap-1">
            <Linkedin size={12} />
            <span className="text-blue-600 truncate">LinkedIn</span>
          </div>
        )}
      </div>

      {/* Last contact date */}
      <div className="mt-3 pt-2 border-t border-gray-300">
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Calendar size={12} />
          <span>
            {contact.lastContactDate 
              ? `Last contact: ${formatDate(contact.lastContactDate)}`
              : 'Never contacted'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ContactCard;
