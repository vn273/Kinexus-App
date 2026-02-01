// Parse CSV file for networking tracker import
export const parseNetworkingCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const leads = [];
  
  // Expected columns (case-insensitive matching)
  const columnMap = {
    firm: findColumn(headers, ['firm', 'company']),
    name: findColumn(headers, ['name', 'full name']),
    title: findColumn(headers, ['title', 'position', 'role']),
    divisionGroup: findColumn(headers, ['division/group', 'division', 'group', 'department']),
    commonalities: findColumn(headers, ['commonalities', 'shared connections', 'tags']),
    location: findColumn(headers, ['location', 'city', 'loc']),
    dateContacted: findColumn(headers, ['date contacted', 'contact date', 'date']),
    followUpDate: findColumn(headers, ['follow-up date', 'followup date', 'follow up']),
    reachedOut: findColumn(headers, ['reached out', 'sent']),
    response: findColumn(headers, ['response', 'responded']),
    callScheduled: findColumn(headers, ['call scheduled', 'call', 'meeting']),
    email: findColumn(headers, ['email', 'e-mail']),
    linkedIn: findColumn(headers, ['linkedin', 'linked in', 'linkedin url']),
    notes: findColumn(headers, ['notes', 'note', 'comments'])
  };
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    
    try {
      // Split name into first and last
      const nameParts = splitName(getValue(values, columnMap.name));
      
      // Skip rows with no name
      if (!nameParts.firstName && !nameParts.lastName) {
        continue;
      }
      
      // Parse dates
      const dateContacted = parseDate(getValue(values, columnMap.dateContacted));
      const followUpDate = parseDate(getValue(values, columnMap.followUpDate));
      
      // Parse checkboxes
      const reachedOut = parseCheckbox(getValue(values, columnMap.reachedOut));
      const response = parseCheckbox(getValue(values, columnMap.response));
      const callScheduled = parseCheckbox(getValue(values, columnMap.callScheduled));
      
      const lead = {
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        firm: getValue(values, columnMap.firm),
        title: getValue(values, columnMap.title),
        divisionGroup: getValue(values, columnMap.divisionGroup),
        commonalities: getValue(values, columnMap.commonalities),
        location: getValue(values, columnMap.location),
        email: getValue(values, columnMap.email),
        linkedInUrl: getValue(values, columnMap.linkedIn),
        dateContacted,
        followUpDate,
        reachedOut,
        response,
        callScheduled,
        notes: getValue(values, columnMap.notes),
        linkedContactId: null
      };
      
      leads.push(lead);
    } catch (error) {
      console.warn(`Skipping row ${i + 1}:`, error.message);
    }
  }
  
  return leads;
};

// Helper: Find column index by multiple possible names
function findColumn(headers, possibleNames) {
  for (let name of possibleNames) {
    const index = headers.findIndex(h => 
      h.toLowerCase().includes(name.toLowerCase())
    );
    if (index !== -1) return index;
  }
  return -1;
}

// Helper: Get value from array safely
function getValue(values, index) {
  if (index === -1 || index >= values.length) return '';
  return values[index].trim().replace(/^"|"$/g, '');
}

// Helper: Parse CSV line handling commas in quotes
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

// Split full name into first and last name
export const splitName = (fullName) => {
  if (!fullName || fullName.trim() === '') {
    return { firstName: '', lastName: '' };
  }
  
  const name = fullName.trim();
  
  // Handle "LastName, FirstName" format
  if (name.includes(',')) {
    const parts = name.split(',').map(p => p.trim());
    return {
      lastName: parts[0] || '',
      firstName: parts[1] || ''
    };
  }
  
  // Handle "FirstName LastName" format
  const parts = name.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
};

// Parse date from various formats
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    // Try parsing as ISO date first
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try parsing MM/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0]) - 1;
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to parse date:', dateStr);
    return null;
  }
}

// Parse checkbox values (Y/N, Yes/No, ✓/✗, true/false, 1/0)
function parseCheckbox(value) {
  if (!value) return false;
  
  const str = value.toString().trim().toLowerCase();
  
  return (
    str === 'y' ||
    str === 'yes' ||
    str === 'true' ||
    str === '1' ||
    str === '✓' ||
    str === 'x' ||
    str === 'checked'
  );
}

// Export leads to CSV
export const exportLeadsToCSV = (leads) => {
  const headers = [
    'Firm',
    'Name',
    'Title',
    'Division/Group',
    'Commonalities',
    'Location',
    'Date Contacted',
    'Follow-Up Date',
    'Reached Out',
    'Response',
    'Call Scheduled',
    'Email',
    'LinkedIn',
    'Status',
    'Notes'
  ];
  
  const csvRows = [headers.join(',')];
  
  leads.forEach(lead => {
    const fullName = `${lead.firstName} ${lead.lastName}`.trim();
    const dateContacted = lead.dateContacted 
      ? new Date(lead.dateContacted).toLocaleDateString('en-US')
      : '';
    const followUpDate = lead.followUpDate
      ? new Date(lead.followUpDate).toLocaleDateString('en-US')
      : '';
    
    const row = [
      lead.firm || '',
      fullName,
      lead.title || '',
      lead.divisionGroup || '',
      lead.commonalities || '',
      lead.location || '',
      dateContacted,
      followUpDate,
      lead.reachedOut ? 'Y' : 'N',
      lead.response ? 'Y' : 'N',
      lead.callScheduled ? 'Y' : 'N',
      lead.email || '',
      lead.linkedInUrl || '',
      lead.status || '',
      (lead.notes || '').replace(/,/g, ';')
    ].map(value => `"${value}"`);
    
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
};

// Download CSV file
export const downloadLeadsCSV = (csvContent, filename = 'networking_leads.csv') => {
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
