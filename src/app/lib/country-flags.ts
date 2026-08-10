/**
 * Country name -> ISO 3166-1 alpha-2 code mapping + flag image URLs
 * ==================================================================
 * Uses flagcdn.com for real flag images instead of emoji text.
 * Provides:
 *   - COUNTRY_OPTIONS  — dropdown list for athlete application / admin form
 *   - getCountryISO / getCountryFlagUrl / getCountryFlag / getCountryAbbr
 *
 * Coverage: ~90%+ of UN member states and commonly selected regions.
 * Omitted: microstates and very small / sparsely populated territories
 * (e.g. Vatican, Nauru, Tuvalu, Palau, Monaco, San Marino, Liechtenstein,
 * Andorra, Marshall Islands, Micronesia, Kiribati, and similar).
 */

/** Canonical dropdown entries: display name + ISO code for flags */
const COUNTRY_ENTRIES: ReadonlyArray<{ name: string; iso: string }> = [
  // Americas
  { name: "Antigua and Barbuda", iso: "AG" },
  { name: "Argentina", iso: "AR" },
  { name: "Bahamas", iso: "BS" },
  { name: "Barbados", iso: "BB" },
  { name: "Belize", iso: "BZ" },
  { name: "Bolivia", iso: "BO" },
  { name: "Brazil", iso: "BR" },
  { name: "Canada", iso: "CA" },
  { name: "Chile", iso: "CL" },
  { name: "Colombia", iso: "CO" },
  { name: "Costa Rica", iso: "CR" },
  { name: "Cuba", iso: "CU" },
  { name: "Dominica", iso: "DM" },
  { name: "Dominican Republic", iso: "DO" },
  { name: "Ecuador", iso: "EC" },
  { name: "El Salvador", iso: "SV" },
  { name: "Grenada", iso: "GD" },
  { name: "Guatemala", iso: "GT" },
  { name: "Guyana", iso: "GY" },
  { name: "Haiti", iso: "HT" },
  { name: "Honduras", iso: "HN" },
  { name: "Jamaica", iso: "JM" },
  { name: "Mexico", iso: "MX" },
  { name: "Nicaragua", iso: "NI" },
  { name: "Panama", iso: "PA" },
  { name: "Paraguay", iso: "PY" },
  { name: "Peru", iso: "PE" },
  { name: "Puerto Rico", iso: "PR" },
  { name: "Saint Kitts and Nevis", iso: "KN" },
  { name: "Saint Lucia", iso: "LC" },
  { name: "Saint Vincent and the Grenadines", iso: "VC" },
  { name: "Suriname", iso: "SR" },
  { name: "Trinidad and Tobago", iso: "TT" },
  { name: "USA", iso: "US" },
  { name: "Uruguay", iso: "UY" },
  { name: "Venezuela", iso: "VE" },

  // Europe
  { name: "Albania", iso: "AL" },
  { name: "Armenia", iso: "AM" },
  { name: "Austria", iso: "AT" },
  { name: "Azerbaijan", iso: "AZ" },
  { name: "Belarus", iso: "BY" },
  { name: "Belgium", iso: "BE" },
  { name: "Bosnia and Herzegovina", iso: "BA" },
  { name: "Bulgaria", iso: "BG" },
  { name: "Croatia", iso: "HR" },
  { name: "Cyprus", iso: "CY" },
  { name: "Czech Republic", iso: "CZ" },
  { name: "Denmark", iso: "DK" },
  { name: "Estonia", iso: "EE" },
  { name: "Finland", iso: "FI" },
  { name: "France", iso: "FR" },
  { name: "Georgia", iso: "GE" },
  { name: "Germany", iso: "DE" },
  { name: "Greece", iso: "GR" },
  { name: "Hungary", iso: "HU" },
  { name: "Iceland", iso: "IS" },
  { name: "Ireland", iso: "IE" },
  { name: "Italy", iso: "IT" },
  { name: "Kosovo", iso: "XK" },
  { name: "Latvia", iso: "LV" },
  { name: "Lithuania", iso: "LT" },
  { name: "Luxembourg", iso: "LU" },
  { name: "Malta", iso: "MT" },
  { name: "Moldova", iso: "MD" },
  { name: "Montenegro", iso: "ME" },
  { name: "Netherlands", iso: "NL" },
  { name: "North Macedonia", iso: "MK" },
  { name: "Norway", iso: "NO" },
  { name: "Poland", iso: "PL" },
  { name: "Portugal", iso: "PT" },
  { name: "Romania", iso: "RO" },
  { name: "Russia", iso: "RU" },
  { name: "Serbia", iso: "RS" },
  { name: "Slovakia", iso: "SK" },
  { name: "Slovenia", iso: "SI" },
  { name: "Spain", iso: "ES" },
  { name: "Sweden", iso: "SE" },
  { name: "Switzerland", iso: "CH" },
  { name: "Turkey", iso: "TR" },
  { name: "UK", iso: "GB" },
  { name: "Ukraine", iso: "UA" },

  // Middle East & Central Asia
  { name: "Afghanistan", iso: "AF" },
  { name: "Bahrain", iso: "BH" },
  { name: "Iran", iso: "IR" },
  { name: "Iraq", iso: "IQ" },
  { name: "Israel", iso: "IL" },
  { name: "Jordan", iso: "JO" },
  { name: "Kazakhstan", iso: "KZ" },
  { name: "Kuwait", iso: "KW" },
  { name: "Kyrgyzstan", iso: "KG" },
  { name: "Lebanon", iso: "LB" },
  { name: "Oman", iso: "OM" },
  { name: "Palestine", iso: "PS" },
  { name: "Qatar", iso: "QA" },
  { name: "Saudi Arabia", iso: "SA" },
  { name: "Syria", iso: "SY" },
  { name: "Tajikistan", iso: "TJ" },
  { name: "Turkmenistan", iso: "TM" },
  { name: "UAE", iso: "AE" },
  { name: "Uzbekistan", iso: "UZ" },
  { name: "Yemen", iso: "YE" },

  // Asia & Pacific
  { name: "Australia", iso: "AU" },
  { name: "Bangladesh", iso: "BD" },
  { name: "Bhutan", iso: "BT" },
  { name: "Brunei", iso: "BN" },
  { name: "Cambodia", iso: "KH" },
  { name: "China", iso: "CN" },
  { name: "Fiji", iso: "FJ" },
  { name: "Hong Kong", iso: "HK" },
  { name: "India", iso: "IN" },
  { name: "Indonesia", iso: "ID" },
  { name: "Japan", iso: "JP" },
  { name: "Laos", iso: "LA" },
  { name: "Macau", iso: "MO" },
  { name: "Malaysia", iso: "MY" },
  { name: "Maldives", iso: "MV" },
  { name: "Mongolia", iso: "MN" },
  { name: "Myanmar", iso: "MM" },
  { name: "Nepal", iso: "NP" },
  { name: "New Zealand", iso: "NZ" },
  { name: "North Korea", iso: "KP" },
  { name: "Pakistan", iso: "PK" },
  { name: "Papua New Guinea", iso: "PG" },
  { name: "Philippines", iso: "PH" },
  { name: "Samoa", iso: "WS" },
  { name: "Singapore", iso: "SG" },
  { name: "Solomon Islands", iso: "SB" },
  { name: "South Korea", iso: "KR" },
  { name: "Sri Lanka", iso: "LK" },
  { name: "Taiwan", iso: "TW" },
  { name: "Thailand", iso: "TH" },
  { name: "Timor-Leste", iso: "TL" },
  { name: "Tonga", iso: "TO" },
  { name: "Vanuatu", iso: "VU" },
  { name: "Vietnam", iso: "VN" },

  // Africa
  { name: "Algeria", iso: "DZ" },
  { name: "Angola", iso: "AO" },
  { name: "Benin", iso: "BJ" },
  { name: "Botswana", iso: "BW" },
  { name: "Burkina Faso", iso: "BF" },
  { name: "Burundi", iso: "BI" },
  { name: "Cabo Verde", iso: "CV" },
  { name: "Cameroon", iso: "CM" },
  { name: "Central African Republic", iso: "CF" },
  { name: "Chad", iso: "TD" },
  { name: "Comoros", iso: "KM" },
  { name: "Congo", iso: "CG" },
  { name: "Democratic Republic of Congo", iso: "CD" },
  { name: "Djibouti", iso: "DJ" },
  { name: "Egypt", iso: "EG" },
  { name: "Equatorial Guinea", iso: "GQ" },
  { name: "Eritrea", iso: "ER" },
  { name: "Eswatini", iso: "SZ" },
  { name: "Ethiopia", iso: "ET" },
  { name: "Gabon", iso: "GA" },
  { name: "Gambia", iso: "GM" },
  { name: "Ghana", iso: "GH" },
  { name: "Guinea", iso: "GN" },
  { name: "Guinea-Bissau", iso: "GW" },
  { name: "Ivory Coast", iso: "CI" },
  { name: "Kenya", iso: "KE" },
  { name: "Lesotho", iso: "LS" },
  { name: "Liberia", iso: "LR" },
  { name: "Libya", iso: "LY" },
  { name: "Madagascar", iso: "MG" },
  { name: "Malawi", iso: "MW" },
  { name: "Mali", iso: "ML" },
  { name: "Mauritania", iso: "MR" },
  { name: "Mauritius", iso: "MU" },
  { name: "Morocco", iso: "MA" },
  { name: "Mozambique", iso: "MZ" },
  { name: "Namibia", iso: "NA" },
  { name: "Niger", iso: "NE" },
  { name: "Nigeria", iso: "NG" },
  { name: "Rwanda", iso: "RW" },
  { name: "Sao Tome and Principe", iso: "ST" },
  { name: "Senegal", iso: "SN" },
  { name: "Seychelles", iso: "SC" },
  { name: "Sierra Leone", iso: "SL" },
  { name: "Somalia", iso: "SO" },
  { name: "South Africa", iso: "ZA" },
  { name: "South Sudan", iso: "SS" },
  { name: "Sudan", iso: "SD" },
  { name: "Tanzania", iso: "TZ" },
  { name: "Togo", iso: "TG" },
  { name: "Tunisia", iso: "TN" },
  { name: "Uganda", iso: "UG" },
  { name: "Zambia", iso: "ZM" },
  { name: "Zimbabwe", iso: "ZW" },
];

/** Extra aliases that map to the same ISO (not shown as separate dropdown rows) */
const ALIASES: Record<string, string> = {
  // USA
  "united states": "US",
  "united states of america": "US",
  "us": "US",
  "america": "US",
  // UK
  "united kingdom": "GB",
  "great britain": "GB",
  "england": "GB",
  "scotland": "GB",
  "wales": "GB",
  "britain": "GB",
  // Common alternate names
  "holland": "NL",
  "czechia": "CZ",
  "korea": "KR",
  "republic of korea": "KR",
  "dprk": "KP",
  "ivory coast": "CI",
  "cote d'ivoire": "CI",
  "côte d'ivoire": "CI",
  "uae": "AE",
  "united arab emirates": "AE",
  "russia": "RU",
  "russian federation": "RU",
  "viet nam": "VN",
  "burma": "MM",
  "east timor": "TL",
  "timor leste": "TL",
  "dr congo": "CD",
  "drc": "CD",
  "congo-kinshasa": "CD",
  "congo-brazzaville": "CG",
  "republic of congo": "CG",
  "swaziland": "SZ",
  "cape verde": "CV",
  "fyrom": "MK",
  "macedonia": "MK",
  "bosnia": "BA",
  "palestine, state of": "PS",
  "state of palestine": "PS",
  "hong kong sar": "HK",
  "macao": "MO",
  "macao sar": "MO",
  "taiwan, province of china": "TW",
  "republic of china": "TW",
  "bolivia, plurinational state of": "BO",
  "venezuela, bolivarian republic of": "VE",
  "iran, islamic republic of": "IR",
  "syria, arab republic": "SY",
  "lao people's democratic republic": "LA",
  "brunei darussalam": "BN",
  "tanzania, united republic of": "TZ",
  "moldova, republic of": "MD",
  "other": "", // no flag
};

/** Build ISO map from entries + aliases (lowercase keys) */
const COUNTRY_TO_ISO: Record<string, string> = (() => {
  const map: Record<string, string> = { ...ALIASES };
  for (const { name, iso } of COUNTRY_ENTRIES) {
    map[name.trim().toLowerCase()] = iso;
  }
  return map;
})();

/**
 * Sorted country names for athlete application + admin forms.
 * Ends with "Other" for edge cases.
 */
export const COUNTRY_OPTIONS: string[] = [
  ...[...COUNTRY_ENTRIES]
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
  "Other",
];

/**
 * Resolve a country name string to its ISO 3166-1 alpha-2 code.
 * Returns null if no match found (including "Other").
 */
export function getCountryISO(country: string | undefined | null): string | null {
  if (!country) return null;
  const normalized = country.trim().toLowerCase();
  if (!normalized || normalized === "other") return null;

  // Direct lookup
  const iso = COUNTRY_TO_ISO[normalized];
  if (iso) return iso;

  // Already a 2-letter ISO code
  if (/^[a-z]{2}$/i.test(normalized)) return normalized.toUpperCase();

  // Exact word-boundary style partial: prefer longer name matches first
  const entries = Object.entries(COUNTRY_TO_ISO)
    .filter(([, code]) => !!code)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [name, code] of entries) {
    if (normalized === name) return code;
    // Avoid short false positives (e.g. "us" inside "russia")
    if (name.length >= 4 && (normalized.includes(name) || name.includes(normalized))) {
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
  // Kosovo and non-standard codes may not have regional-indicator emoji
  if (iso.length !== 2 || !/^[A-Z]{2}$/.test(iso)) return "";
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
