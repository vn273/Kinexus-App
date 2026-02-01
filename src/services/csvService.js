import { RELATIONSHIP_TYPES } from '../constants/categories';

// Helper to parse CSV values handling quoted strings with commas
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

// Map relationship type string to value (case-insensitive)
const mapRelationshipType = (typeString) => {
  if (!typeString) return null;
  const normalized = typeString.toLowerCase().trim();
  
  // Check for exact match first
  const exactMatch = RELATIONSHIP_TYPES.find(t => 
    t.value.toLowerCase() === normalized || 
    t.label.toLowerCase() === normalized
  );
  if (exactMatch) return exactMatch.value;
  
  // Check for partial matches
  const partialMatch = RELATIONSHIP_TYPES.find(t => 
    t.label.toLowerCase().includes(normalized) || 
    normalized.includes(t.label.toLowerCase())
  );
  return partialMatch?.value || null;
};

// Parse contact CSV with flexible column mapping
export const parseLinkedInCSV = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim().toLowerCase());
  const contacts = [];

  // Column name mappings (lowercase)
  const columnMappings = {
    firstName: ['first name', 'firstname', 'first', 'given name'],
    lastName: ['last name', 'lastname', 'last', 'family name', 'surname'],
    fullName: ['name', 'full name', 'fullname', 'contact name'],
    company: ['company', 'organization', 'firm', 'employer', 'company name'],
    role: ['position', 'title', 'job title', 'role', 'job', 'occupation'],
    email: ['email', 'email address', 'e-mail', 'mail'],
    phone: ['phone', 'phone number', 'telephone', 'mobile', 'cell'],
    linkedInUrl: ['linkedin url', 'linkedin', 'url', 'profile url', 'linkedin profile'],
    relationshipType: ['relationship type', 'relationshiptype', 'relationship', 'type', 'category'],
    location: ['location', 'city', 'address'],
    notes: ['notes', 'note', 'comments', 'connected on'],
    sector: ['sector', 'industry']
  };

  // Find column indices
  const findColumnIndex = (mappingKeys) => {
    for (const key of mappingKeys) {
      const index = headers.indexOf(key);
      if (index !== -1) return index;
    }
    return -1;
  };

  const columnIndices = {};
  for (const [field, mappings] of Object.entries(columnMappings)) {
    columnIndices[field] = findColumnIndex(mappings);
  }

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = parseCSVLine(lines[i]).map(v => v.replace(/"/g, '').trim());
    
    const getValue = (field) => {
      const index = columnIndices[field];
      return index >= 0 && values[index] ? values[index] : '';
    };

    // Handle name - either split or combined
    let firstName = getValue('firstName');
    let lastName = getValue('lastName');
    
    if (!firstName && !lastName) {
      const fullName = getValue('fullName');
      if (fullName) {
        const nameParts = fullName.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
    }

    // Skip if no name at all
    if (!firstName && !lastName) continue;

    // Map relationship type
    const relationshipTypeStr = getValue('relationshipType');
    const relationshipType = mapRelationshipType(relationshipTypeStr);

    const mappedContact = {
      firstName,
      lastName,
      company: getValue('company'),
      role: getValue('role'),
      email: getValue('email'),
      phone: getValue('phone'),
      linkedInUrl: getValue('linkedInUrl'),
      location: getValue('location'),
      relationshipTypes: relationshipType ? [relationshipType] : [], // Store as array
      sector: getValue('sector') || null,
      categories: ['Professional'],
      tags: [],
      notes: getValue('notes'),
      strategicValue: 3,
      lastContactDate: null
    };

    contacts.push(mappedContact);
  }

  return contacts;
};

// Export contacts to CSV
export const exportToCSV = (contacts) => {
  const headers = [
    'First Name',
    'Last Name',
    'Company',
    'Role',
    'Email',
    'Phone',
    'LinkedIn URL',
    'Categories',
    'Tags',
    'Strategic Value',
    'Last Contact Date',
    'Notes'
  ];

  const csvRows = [headers.join(',')];

  contacts.forEach(contact => {
    const row = [
      contact.firstName,
      contact.lastName,
      contact.company || '',
      contact.role || '',
      contact.email || '',
      contact.phone || '',
      contact.linkedInUrl || '',
      (contact.categories || []).join(';'),
      (contact.tags || []).join(';'),
      contact.strategicValue || 3,
      contact.lastContactDate || '',
      (contact.notes || '').replace(/,/g, ';') // Replace commas in notes
    ].map(value => `"${value}"`);

    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

// Download CSV file
export const downloadCSV = (csvContent, filename = 'contacts.csv') => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
