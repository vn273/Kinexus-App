// Calculate days since last contact
export const daysSinceContact = (lastContactDate) => {
  if (!lastContactDate) return null;

  const now = new Date();
  const lastContact = lastContactDate instanceof Date 
    ? lastContactDate 
    : new Date(lastContactDate);
  
  const diffTime = Math.abs(now - lastContact);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Contact regularity options with their day thresholds
export const CONTACT_REGULARITY_DAYS = {
  '3-years': 1095,
  '1-year': 365,
  '6-months': 180,
  '3-months': 90,
  '1-month': 30,
  '2-weeks': 14,
  '1-week': 7,
  '3-days': 3,
  '1-day': 1
};

// Get color indicator based on days since last contact and contact regularity
export const getContactStatusColor = (lastContactDate, contactRegularity = '6-months') => {
  const days = daysSinceContact(lastContactDate);
  
  if (days === null) return 'gray'; // Never contacted
  
  // Get the threshold in days based on contact regularity
  const threshold = CONTACT_REGULARITY_DAYS[contactRegularity] || 180; // Default to 6 months
  
  if (days <= threshold) return 'green'; // Within expected contact frequency
  if (days <= threshold + 7) return 'yellow'; // Past threshold but within 1 week grace period
  return 'red'; // More than 1 week overdue
};

// Get status text
export const getContactStatusText = (lastContactDate) => {
  const days = daysSinceContact(lastContactDate);
  
  if (days === null) return 'Never contacted';
  if (days === 0) return 'Contacted today';
  if (days === 1) return 'Contacted yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

// Format date for display
export const formatDate = (date) => {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  
  // Check if date is invalid
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
