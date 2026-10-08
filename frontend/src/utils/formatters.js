/**
 * Voyara Core Presentation & Text Formatting Utilities
 * Standardizes email display (always lowercase), natural name capitalization,
 * and clean property/location formatting across all customer, host, and admin views.
 */

const LOWERCASE_WORDS = new Set([
  'and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'by', 'with', 'from', 'as', 'via', 'into', 'near'
]);

const UPPERCASE_ACRONYMS = new Set([
  'ai', 'vip', 'ac', 'tv', 'wifi', 'wi-fi', 'usa', 'uk', 'inr', 'usd', 'eur', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'
]);

/**
 * 1. Email Address Format - ALWAYS LOWERCASE
 * Real standard email format without mixed-case letters.
 * @param {string} email
 * @returns {string}
 */
export const formatEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

/**
 * 2. User Name Display Format
 * Formats a person's name naturally so the first letter of each name is uppercase
 * and remaining letters are lowercase (e.g., 'ann' -> 'Ann', 'ANn' -> 'Ann', 'rahul kumar' -> 'Rahul Kumar', 'SUSAN' -> 'Susan').
 * @param {string} name
 * @returns {string}
 */
export const formatDisplayName = (name) => {
  if (!name || typeof name !== 'string') return name || '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\s+/)
    .map((word) => {
      // Handle hyphenated names like Mary-Jane
      if (word.includes('-')) {
        return word
          .split('-')
          .map((sub) => (sub ? sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase() : ''))
          .join('-');
      }
      // Handle apostrophes like O'Connor or D'Souza
      if (word.includes("'")) {
        return word
          .split("'")
          .map((sub) => (sub ? sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase() : ''))
          .join("'");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export const formatUserName = formatDisplayName;

/**
 * 3. Property Name Format
 * Natural clean capitalization for property names (e.g., 'misty hills retreat' -> 'Misty Hills Retreat').
 * @param {string} name
 * @returns {string}
 */
export const formatPropertyName = (name) => {
  if (!name || typeof name !== 'string') return name || '';
  const clean = name.trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
  if (!clean) return '';

  const words = clean.split(' ');
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (UPPERCASE_ACRONYMS.has(lower)) {
        if (lower === 'wifi' || lower === 'wi-fi') return 'WiFi';
        if (lower === 'ac') return 'AC';
        if (lower === 'tv') return 'TV';
        if (lower === 'ai') return 'AI';
        return word.toUpperCase();
      }
      if (index > 0 && index < words.length - 1 && LOWERCASE_WORDS.has(lower)) {
        return lower;
      }
      if (word.includes('-')) {
        return word
          .split('-')
          .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ''))
          .join('-');
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * 4. Location / City / State Format
 * Natural clean capitalization (e.g., 'MUNNAR' -> 'Munnar', 'munnar, kerala' -> 'Munnar, Kerala').
 * @param {string} location
 * @returns {string}
 */
export const formatLocationName = (location) => {
  if (!location || typeof location !== 'string') return location || '';
  const clean = location.trim();
  if (!clean) return '';

  return clean
    .split(',')
    .map((segment) => {
      const trimmedSeg = segment.trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
      if (!trimmedSeg) return '';
      return trimmedSeg
        .split(' ')
        .map((word) => {
          const lower = word.toLowerCase();
          if (UPPERCASE_ACRONYMS.has(lower)) {
            return word.toUpperCase();
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    })
    .filter(Boolean)
    .join(', ');
};

export const formatCity = formatLocationName;
export const formatState = formatLocationName;

/**
 * 5. Room Name / Type Format
 * E.g. 'family room' -> 'Family Room', 'DELUXE_SUITE' -> 'Deluxe Suite'.
 * @param {string} roomName
 * @returns {string}
 */
export const formatRoomName = (roomName) => {
  if (!roomName || typeof roomName !== 'string') return roomName || '';
  const clean = roomName.trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
  if (!clean) return '';

  return clean
    .split(' ')
    .map((word) => {
      const lower = word.toLowerCase();
      if (UPPERCASE_ACRONYMS.has(lower)) {
        if (lower === 'ac') return 'AC';
        if (lower === 'tv') return 'TV';
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export const formatRoomType = formatRoomName;
export const formatPropertyType = formatRoomName;

/**
 * 6. Amenity Label Format
 * E.g. 'free wifi' -> 'Free WiFi', 'SWIMMING_POOL' -> 'Swimming Pool'.
 * @param {string} amenity
 * @returns {string}
 */
export const formatAmenityName = (amenity) => {
  if (!amenity || typeof amenity !== 'string') return amenity || '';
  const clean = amenity.trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
  if (!clean) return '';

  return clean
    .split(' ')
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === 'wifi' || lower === 'wi-fi') return 'WiFi';
      if (lower === 'ac') return 'AC';
      if (lower === 'tv') return 'TV';
      if (UPPERCASE_ACRONYMS.has(lower)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * 7. Adventure Name / Type Format
 * E.g. 'trekking and camping' -> 'Trekking and Camping', 'WATER_SPORTS' -> 'Water Sports'.
 * @param {string} name
 * @returns {string}
 */
export const formatAdventureName = (name) => {
  if (!name || typeof name !== 'string') return name || '';
  return formatPropertyName(name);
};

export const formatAdventureType = formatRoomName;

/**
 * 8. User Role Label Format
 * @param {string} role
 * @returns {string}
 */
export const formatRoleLabel = (role) => {
  if (!role) return '';
  const r = String(role).toUpperCase().trim();
  if (r === 'ADMIN') return 'Voyara Control Center';
  if (r === 'PROVIDER' || r === 'HOST') return 'Stay Partner';
  if (r === 'CUSTOMER' || r === 'TRAVELER') return 'Traveler';
  return formatDisplayName(role);
};
