/**
 * Country name -> ISO 3166-1 alpha-2 code mapping + flag image URLs
 * ==================================================================
 * Uses flagcdn.com for real SVG flag images instead of emoji text.
 * Provides utility functions for resolving country names to ISO codes,
 * flag CDN URLs, and short abbreviations.
 */

const COUNTRY_TO_ISO: Record<string, string> = {
  // North America
  "usa": "US", "united states": "US", "united states of america": "US", "us": "US", "america": "US",
  "canada": "CA", "mexico": "MX",
  // Central America & Caribbean
  "puerto rico": "PR", "cuba": "CU", "jamaica": "JM", "dominican republic": "DO",
  "costa rica": "CR", "panama": "PA", "guatemala": "GT", "honduras": "HN",
  "el salvador": "SV", "nicaragua": "NI", "belize": "BZ", "haiti": "HT",
  "trinidad and tobago": "TT", "barbados": "BB", "bahamas": "BS",
  // South America
  "brazil": "BR", "argentina": "AR", "colombia": "CO", "chile": "CL",
  "peru": "PE", "venezuela": "VE", "ecuador": "EC", "uruguay": "UY",
  "paraguay": "PY", "bolivia": "BO", "guyana": "GY", "suriname": "SR",
  // Europe
  "united kingdom": "GB", "uk": "GB", "england": "GB", "great britain": "GB",
  "france": "FR", "germany": "DE", "spain": "ES", "italy": "IT",
  "portugal": "PT", "netherlands": "NL", "holland": "NL",
  "belgium": "BE", "switzerland": "CH", "austria": "AT",
  "sweden": "SE", "norway": "NO", "denmark": "DK", "finland": "FI",
  "ireland": "IE", "scotland": "GB", "wales": "GB",
  "poland": "PL", "czech republic": "CZ", "czechia": "CZ",
  "romania": "RO", "hungary": "HU", "greece": "GR",
  "croatia": "HR", "serbia": "RS", "bulgaria": "BG",
  "ukraine": "UA", "russia": "RU", "turkey": "TR",
  "iceland": "IS", "luxembourg": "LU", "malta": "MT",
  "slovenia": "SI", "slovakia": "SK", "estonia": "EE",
  "latvia": "LV", "lithuania": "LT", "cyprus": "CY",
  "albania": "AL", "north macedonia": "MK", "montenegro": "ME",
  "bosnia and herzegovina": "BA", "kosovo": "XK", "moldova": "MD",
  // Asia
  "japan": "JP", "south korea": "KR", "korea": "KR", "china": "CN",
  "india": "IN", "thailand": "TH", "philippines": "PH",
  "vietnam": "VN", "indonesia": "ID", "malaysia": "MY",
  "singapore": "SG", "taiwan": "TW", "hong kong": "HK",
  "pakistan": "PK", "bangladesh": "BD", "sri lanka": "LK",
  "nepal": "NP", "myanmar": "MM", "cambodia": "KH",
  "laos": "LA", "mongolia": "MN", "kazakhstan": "KZ",
  "uzbekistan": "UZ",
  // Middle East
  "israel": "IL", "saudi arabia": "SA", "uae": "AE",
  "united arab emirates": "AE", "qatar": "QA", "kuwait": "KW",
  "bahrain": "BH", "oman": "OM", "jordan": "JO",
  "lebanon": "LB", "iraq": "IQ", "iran": "IR",
  // Africa
  "south africa": "ZA", "nigeria": "NG", "kenya": "KE",
  "egypt": "EG", "morocco": "MA", "ghana": "GH",
  "ethiopia": "ET", "tanzania": "TZ", "uganda": "UG",
  "cameroon": "CM", "senegal": "SN", "ivory coast": "CI",
  "algeria": "DZ", "tunisia": "TN", "rwanda": "RW",
  "mozambique": "MZ", "zimbabwe": "ZW", "angola": "AO",
  "democratic republic of congo": "CD", "congo": "CG",
  // Oceania
  "australia": "AU", "new zealand": "NZ", "fiji": "FJ",
  "papua new guinea": "PG", "samoa": "WS", "tonga": "TO",
};

/**
 * Resolve a country name string to its ISO 3166-1 alpha-2 code.
 * Returns null if no match found.
 */
export function getCountryISO(country: string | undefined | null): string | null {
  if (!country) return null;
  const normalized = country.trim().toLowerCase();

  // Direct lookup
  const iso = COUNTRY_TO_ISO[normalized];
  if (iso) return iso;

  // Check if it's already a 2-letter ISO code
  if (normalized.length === 2) return normalized.toUpperCase();

  // Partial match
  for (const [name, code] of Object.entries(COUNTRY_TO_ISO)) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return code;
    }
  }

  return null;
}

/**
 * Get a flag image URL from flagcdn.com for a country name.
 * Returns null if country not found.
 *
 * @param country  Country name or ISO code
 * @param width    Desired width in pixels (flagcdn supports 20,40,80,160,256)
 */
export function getCountryFlagUrl(country: string | undefined | null, width: number = 40): string | null {
  const iso = getCountryISO(country);
  if (!iso) return null;
  return `https://flagcdn.com/w${width}/${iso.toLowerCase()}.png`;
}

/**
 * Legacy emoji-based flag (kept for inline text usage).
 */
export function getCountryFlag(country: string | undefined | null): string {
  const iso = getCountryISO(country);
  if (!iso) return "";
  const codePoints = [...iso.toUpperCase()].map(
    (c) => 0x1f1e6 + c.charCodeAt(0) - 65,
  );
  return String.fromCodePoint(...codePoints);
}

/**
 * Get a short country abbreviation (e.g. "US", "CA", "RU")
 */
export function getCountryAbbr(country: string | undefined | null): string {
  if (!country) return "";
  const iso = getCountryISO(country);
  if (iso) return iso;
  return country.substring(0, 3).toUpperCase();
}
