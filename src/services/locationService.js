/**
 * Location Service - City autocomplete using free Nominatim API (OpenStreetMap)
 */

// Cache for location searches to reduce API calls
const locationCache = new Map();

// Debounce timer
let debounceTimer = null;

/**
 * Search for cities using Nominatim API
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of location suggestions
 */
export const searchLocations = async (query) => {
  if (!query || query.length < 2) {
    return [];
  }

  // Check cache first
  const cacheKey = query.toLowerCase();
  if (locationCache.has(cacheKey)) {
    return locationCache.get(cacheKey);
  }

  try {
    // Use Nominatim API (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `addressdetails=1&` +
      `limit=8&` +
      `featuretype=city`
    );

    if (!response.ok) {
      throw new Error('Location search failed');
    }

    const data = await response.json();
    
    // Format results
    const results = data
      .filter(item => {
        // Filter to cities, towns, villages
        const type = item.type;
        return ['city', 'town', 'village', 'municipality', 'administrative'].includes(type);
      })
      .map(item => {
        const address = item.address || {};
        const parts = [];
        
        // City name
        const cityName = address.city || address.town || address.village || 
                        address.municipality || item.name;
        if (cityName) parts.push(cityName);
        
        // State/Region
        const state = address.state || address.region || address.county;
        if (state && state !== cityName) parts.push(state);
        
        // Country
        const country = address.country;
        if (country) parts.push(country);
        
        return {
          display: parts.join(', '),
          city: cityName,
          state: state || '',
          country: country || '',
          lat: item.lat,
          lon: item.lon
        };
      })
      // Remove duplicates
      .filter((item, index, self) => 
        index === self.findIndex(t => t.display === item.display)
      );

    // Cache results
    locationCache.set(cacheKey, results);
    
    return results;
  } catch (error) {
    console.error('Error searching locations:', error);
    return [];
  }
};

/**
 * Debounced location search
 * @param {string} query - Search query
 * @param {function} callback - Callback with results
 * @param {number} delay - Debounce delay in ms
 */
export const debouncedSearchLocations = (query, callback, delay = 300) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (!query || query.length < 2) {
    callback([]);
    return;
  }

  debounceTimer = setTimeout(async () => {
    const results = await searchLocations(query);
    callback(results);
  }, delay);
};

/**
 * Common cities for quick selection (fallback when offline)
 */
export const COMMON_CITIES = [
  'New York, NY, USA',
  'Los Angeles, CA, USA',
  'San Francisco, CA, USA',
  'Chicago, IL, USA',
  'Boston, MA, USA',
  'Seattle, WA, USA',
  'Austin, TX, USA',
  'Denver, CO, USA',
  'Miami, FL, USA',
  'Washington, DC, USA',
  'Atlanta, GA, USA',
  'Dallas, TX, USA',
  'Houston, TX, USA',
  'Philadelphia, PA, USA',
  'Phoenix, AZ, USA',
  'San Diego, CA, USA',
  'Portland, OR, USA',
  'Minneapolis, MN, USA',
  'Detroit, MI, USA',
  'Charlotte, NC, USA',
  'Nashville, TN, USA',
  'Raleigh, NC, USA',
  'Salt Lake City, UT, USA',
  'San Jose, CA, USA',
  'London, England, United Kingdom',
  'Toronto, Ontario, Canada',
  'Vancouver, British Columbia, Canada',
  'Singapore, Singapore',
  'Hong Kong, Hong Kong',
  'Sydney, New South Wales, Australia',
  'Mumbai, Maharashtra, India',
  'Bangalore, Karnataka, India',
  'Dubai, United Arab Emirates',
  'Paris, Île-de-France, France',
  'Berlin, Germany',
  'Tokyo, Japan',
  'Shanghai, China',
  'Beijing, China'
];

/**
 * Filter common cities by query (for offline/fallback)
 */
export const filterCommonCities = (query) => {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  return COMMON_CITIES
    .filter(city => city.toLowerCase().includes(lowerQuery))
    .slice(0, 8);
};

/**
 * Smart location search - tries API first, falls back to common cities
 */
export const smartSearchLocations = async (query) => {
  if (!query || query.length < 2) return [];
  
  try {
    const apiResults = await searchLocations(query);
    if (apiResults.length > 0) {
      return apiResults.map(r => r.display);
    }
  } catch (error) {
    console.error('API search failed, using fallback:', error);
  }
  
  // Fallback to common cities
  return filterCommonCities(query);
};
