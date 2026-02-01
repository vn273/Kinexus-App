/**
 * Graph Layout Service
 * Calculates node positions for the network graph visualization
 */

// Closeness level descriptions
export const CLOSENESS_LEVELS = [
  { min: 9, max: 10, label: 'Family & Best Friends', description: 'Closest relationships' },
  { min: 7, max: 8, label: 'Close Friends & Colleagues', description: 'Regular close contact' },
  { min: 5, max: 6, label: 'Good Friends & Professional', description: 'Moderate closeness' },
  { min: 3, max: 4, label: 'Acquaintances', description: 'Occasional contact' },
  { min: 1, max: 2, label: 'Distant Connections', description: 'Cold contacts' }
];

// Strategic value level descriptions
export const STRATEGIC_VALUE_LEVELS = [
  { min: 9, max: 10, label: 'Critical Contacts', description: 'Mentors, decision-makers, key industry leaders' },
  { min: 7, max: 8, label: 'High Value', description: 'Can make intros, give advice, open doors' },
  { min: 5, max: 6, label: 'Moderate Value', description: 'Peers, informational contacts' },
  { min: 3, max: 4, label: 'Lower Value', description: 'Limited professional utility' },
  { min: 1, max: 2, label: 'Minimal Value', description: 'Social only' }
];

// Relationship type colors
export const RELATIONSHIP_COLORS = {
  family: '#ef4444', // red
  college_ucla: '#3b82f6', // blue
  college_other: '#6366f1', // indigo
  professional: '#10b981', // green
  professional_current: '#059669', // emerald
  professional_former: '#14b8a6', // teal
  personal_friends: '#f59e0b', // amber
  acquaintance: '#8b5cf6', // purple
  mentor: '#ec4899', // pink
  default: '#6b7280' // gray
};

/**
 * Get the color for a relationship type
 */
export const getRelationshipColor = (relationshipType) => {
  return RELATIONSHIP_COLORS[relationshipType] || RELATIONSHIP_COLORS.default;
};

/**
 * Calculate node size based on contact data
 * Larger nodes = more interactions or higher importance
 */
export const calculateNodeSize = (contact) => {
  const baseSize = 8;
  const closenessBonus = (contact.relationshipCloseness || 5) * 0.5;
  const strategicBonus = (contact.strategicValue || 3) * 0.3;
  return baseSize + closenessBonus + strategicBonus;
};

/**
 * Group contacts by circle (closeness or strategic value)
 */
export const groupByCircle = (contacts, viewType) => {
  const levels = viewType === 'closeness' ? CLOSENESS_LEVELS : STRATEGIC_VALUE_LEVELS;
  const circles = levels.map(() => []);
  
  contacts.forEach(contact => {
    const value = viewType === 'closeness' 
      ? (contact.relationshipCloseness || 5) 
      : (contact.strategicValue || 3);
    
    const circleIndex = levels.findIndex(level => value >= level.min && value <= level.max);
    if (circleIndex !== -1) {
      circles[circleIndex].push(contact);
    } else {
      // Default to outer circle
      circles[circles.length - 1].push(contact);
    }
  });
  
  return circles;
};

/**
 * Group contacts by relationship type within a circle
 * Uses first relationship type for grouping (or 'other' if none)
 */
export const groupByRelationshipType = (contacts) => {
  const groups = {};
  
  contacts.forEach(contact => {
    // Handle both array and single value format
    const types = contact.relationshipTypes || (contact.relationshipType ? [contact.relationshipType] : []);
    const type = types[0] || 'other'; // Use first type for grouping
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(contact);
  });
  
  // Sort groups by size (larger groups first)
  return Object.values(groups).sort((a, b) => b.length - a.length);
};

/**
 * Apply filter to contacts
 */
export const filterContacts = (contacts, filters) => {
  if (!filters || Object.keys(filters).length === 0) {
    return contacts;
  }
  
  return contacts.filter(contact => {
    if (filters.relationshipType) {
      // Handle both array and single value format
      const types = contact.relationshipTypes || (contact.relationshipType ? [contact.relationshipType] : []);
      if (!types.includes(filters.relationshipType)) {
        return false;
      }
    }
    if (filters.sector && contact.sector !== filters.sector) {
      return false;
    }
    if (filters.company && contact.company !== filters.company) {
      return false;
    }
    if (filters.location && contact.location !== filters.location) {
      return false;
    }
    if (filters.tag && (!contact.tags || !contact.tags.includes(filters.tag))) {
      return false;
    }
    return true;
  });
};

/**
 * Generate a seeded random number for consistent layouts
 */
const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/**
 * Check if two positions are too close (would overlap)
 */
const isTooClose = (pos1, pos2, minDistance = 60) => {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy) < minDistance;
};

/**
 * Calculate the complete graph layout with collision avoidance
 * @param {Array} contacts - Array of contact objects
 * @param {string} viewType - 'closeness' or 'strategic'
 * @param {Array} connections - Array of connection objects between contacts
 * @param {Object} filters - Filter criteria
 * @param {Object} options - Layout options
 */
export const calculateGraphLayout = (contacts, viewType, connections, filters = {}, options = {}) => {
  const {
    showIntroductions = true,
    showMutualConnections = true,
    centerRadius = 0,
    circleSpacing = 150,
    maxRadius = 600
  } = options;
  
  const layout = { 
    nodes: [], 
    edges: [],
    circles: [] // For rendering circle guides
  };
  
  // Apply filters
  const filteredContacts = filterContacts(contacts, filters);
  
  // User node at center
  layout.nodes.push({
    id: 'user',
    x: 0,
    y: 0,
    label: 'You',
    size: 20,
    color: '#1f2937',
    type: 'user',
    isCenter: true
  });
  
  // Collect all positioned nodes for collision detection
  const positionedNodes = [];
  
  // Group contacts by circle (based on viewType metric)
  const circles = groupByCircle(filteredContacts, viewType);
  const levels = viewType === 'closeness' ? CLOSENESS_LEVELS : STRATEGIC_VALUE_LEVELS;
  
  // For each circle, calculate positions with spreading
  circles.forEach((contactsInCircle, circleIndex) => {
    if (contactsInCircle.length === 0) return;
    
    const baseRadius = Math.min(
      (circleIndex + 1) * circleSpacing + centerRadius,
      maxRadius
    );
    
    // Add circle metadata for UI
    layout.circles.push({
      index: circleIndex,
      radius: baseRadius,
      label: levels[circleIndex].label,
      count: contactsInCircle.length
    });
    
    // Within circle, group by relationship type for better organization
    const grouped = groupByRelationshipType(contactsInCircle);
    const flatContacts = grouped.flat();
    
    // Use golden angle for better distribution (avoids clustering)
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees
    let baseAngle = -Math.PI / 2; // Start from top
    
    flatContacts.forEach((contact, idx) => {
      // Use contact ID to create consistent "random" offset
      const idHash = contact.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seed = idHash + idx;
      
      // Calculate base angle with golden angle distribution
      let angle = baseAngle + (idx * goldenAngle);
      
      // Add seeded random offset to angle (±15 degrees)
      const angleJitter = (seededRandom(seed) - 0.5) * (Math.PI / 6);
      angle += angleJitter;
      
      // Normalize angle to 0-2π
      angle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
      
      // Calculate radius with variation based on exact metric value
      const metricValue = viewType === 'closeness' 
        ? (contact.relationshipCloseness || 5) 
        : (contact.strategicValue || 3);
      
      // Within each circle band, position based on exact value
      const level = levels[circleIndex];
      const valueRange = level.max - level.min;
      const normalizedValue = valueRange > 0 ? (metricValue - level.min) / valueRange : 0.5;
      
      // Radius varies within the circle band (±30 pixels from base)
      const radiusVariation = (0.5 - normalizedValue) * 60;
      const radiusJitter = (seededRandom(seed + 1000) - 0.5) * 25;
      let radius = baseRadius + radiusVariation + radiusJitter;
      
      // Calculate initial position
      let x = radius * Math.cos(angle);
      let y = radius * Math.sin(angle);
      
      // Collision avoidance: push away from existing nodes
      const minDistance = 55;
      let iterations = 0;
      const maxIterations = 15;
      
      while (iterations < maxIterations) {
        let hasCollision = false;
        
        for (const existing of positionedNodes) {
          if (isTooClose({ x, y }, existing, minDistance)) {
            hasCollision = true;
            
            // Push away from collision
            const dx = x - existing.x;
            const dy = y - existing.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Move in the direction away from collision
            const pushX = (dx / dist) * (minDistance - dist + 5);
            const pushY = (dy / dist) * (minDistance - dist + 5);
            
            x += pushX * 0.7;
            y += pushY * 0.7;
            
            // Also slightly increase radius to spread outward
            radius += 3;
            break;
          }
        }
        
        if (!hasCollision) break;
        iterations++;
      }
      
      // Store final position
      positionedNodes.push({ x, y, id: contact.id });
      
      layout.nodes.push({
        id: contact.id,
        x,
        y,
        label: `${contact.firstName} ${contact.lastName}`,
        size: calculateNodeSize(contact),
        color: getRelationshipColor((contact.relationshipTypes?.[0]) || contact.relationshipType),
        type: 'contact',
        data: contact,
        circle: circleIndex
      });
    });
  });
  
  // Create a set of filtered contact IDs for edge filtering
  const filteredContactIds = new Set(filteredContacts.map(c => c.id));
  
  // Add edges: User to all contacts
  filteredContacts.forEach(contact => {
    const closeness = contact.relationshipCloseness || 5;
    layout.edges.push({
      source: 'user',
      target: contact.id,
      color: getRelationshipColor((contact.relationshipTypes?.[0]) || contact.relationshipType),
      width: Math.max(1, closeness / 3),
      type: 'user-contact'
    });
  });
  
  // Add edges between contacts (if connections exist)
  if (connections && connections.length > 0) {
    connections.forEach(conn => {
      // Only show connections between filtered contacts
      if (!filteredContactIds.has(conn.contact1Id) || !filteredContactIds.has(conn.contact2Id)) {
        return;
      }
      
      // Filter by connection type
      if (conn.connectionType === 'introduced' && !showIntroductions) {
        return;
      }
      if (conn.connectionType !== 'introduced' && !showMutualConnections) {
        return;
      }
      
      layout.edges.push({
        source: conn.contact1Id,
        target: conn.contact2Id,
        type: conn.connectionType,
        label: conn.connectionType === 'introduced' ? '→ introduced' : '',
        color: conn.connectionType === 'introduced' ? '#f59e0b' : '#d1d5db',
        width: 1,
        dashed: true,
        connectionData: conn
      });
    });
  }
  
  return layout;
};

/**
 * Get unique filter options from contacts
 */
export const getFilterOptions = (contacts) => {
  const options = {
    relationshipTypes: [],
    sectors: [],
    companies: [],
    locations: [],
    tags: []
  };
  
  const typesSet = new Set();
  const sectorsSet = new Set();
  const companiesSet = new Set();
  const locationsSet = new Set();
  const tagsSet = new Set();
  
  contacts.forEach(contact => {
    // Handle both array and single value format
    const types = contact.relationshipTypes || (contact.relationshipType ? [contact.relationshipType] : []);
    types.forEach(type => typesSet.add(type));
    if (contact.sector) sectorsSet.add(contact.sector);
    if (contact.company) companiesSet.add(contact.company);
    if (contact.location) locationsSet.add(contact.location);
    if (contact.tags) contact.tags.forEach(tag => tagsSet.add(tag));
  });
  
  options.relationshipTypes = [...typesSet].sort();
  options.sectors = [...sectorsSet].sort();
  options.companies = [...companiesSet].sort();
  options.locations = [...locationsSet].sort();
  options.tags = [...tagsSet].sort();
  
  return options;
};

/**
 * Find the shortest path between two contacts (for future features)
 */
export const findPath = (startId, endId, connections, contacts) => {
  // BFS to find shortest path
  const queue = [[startId]];
  const visited = new Set([startId]);
  
  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    
    if (current === endId) {
      return path;
    }
    
    // Find all connections from current
    const neighbors = connections
      .filter(conn => conn.contact1Id === current || conn.contact2Id === current)
      .map(conn => conn.contact1Id === current ? conn.contact2Id : conn.contact1Id)
      .filter(id => !visited.has(id));
    
    for (const neighbor of neighbors) {
      visited.add(neighbor);
      queue.push([...path, neighbor]);
    }
  }
  
  return null; // No path found
};
