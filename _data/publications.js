const { readFileSync } = require('fs');
const path = require('path');
const bibtexParse = require('bibtex-parse');

// Minimal fixer for German umlauts after parsing:
// turns "a → ä, "o → ö, "u → ü (and uppercase), also "{a} → ä.
// It does NOT touch backslash-present LaTeX (\"a), so it’s safe for mixed data.
function fixGermanQuoteUmlauts(s) {
  if (s == null) return s;
  s = String(s);

  const map = {
    a: 'ä', A: 'Ä',
    o: 'ö', O: 'Ö',
    u: 'ü', U: 'Ü'
    // If needed, extend:
    // e: 'ë', E: 'Ë', i: 'ï', I: 'Ï', y: 'ÿ', Y: 'Ÿ'
  };

  // Handle braced form: "{u} → ü (allow optional whitespace)
  s = s.replace(
    /(^|[^\\])"\s*\{([AaOoUu])\}/g,
    (_, pre, ch) => pre + map[ch]
  );

  // Handle unbraced form: "u → ü
  s = s.replace(
    /(^|[^\\])"([AaOoUu])/g,
    (_, pre, ch) => pre + map[ch]
  );

  return s;
}

// If you already have latexToUnicode defined elsewhere, keep that.
// Otherwise, you can drop it in here. It will handle real LaTeX macros (\\"u, \ss, …).
function latexToUnicode(input) {
  if (input == null) return input;
  let s = String(input);

  const specialMap = {
    '\\ss': 'ß', '\\SS': 'ẞ',
    '\\ae': 'æ', '\\AE': 'Æ',
    '\\oe': 'œ', '\\OE': 'Œ',
    '\\aa': 'å', '\\AA': 'Å',
    '\\o':  'ø', '\\O':  'Ø',
    '\\l':  'ł', '\\L':  'Ł'
  };

  const accentMap = {
    '"': '\u0308', "'": '\u0301', '`': '\u0300', '^': '\u0302', '~': '\u0303',
    'c': '\u0327', 'v': '\u030C', 'H': '\u030B', 'r': '\u030A', 'k': '\u0328',
    '=': '\u0304', '.': '\u0307', 'u': '\u0306', 'b': '\u0331', 'd': '\u0323'
  };
  const dotless = { i: '\u0131', j: '\u0237' };

  // Map special macros first
  s = s.replace(/\\[A-Za-z]+/g, m => specialMap[m] || m);

  const applyAccent = (_, acc, ij, ch) => {
    const base = ij ? dotless[ij] : ch;
    const combined = base + (accentMap[acc] || '');
    return combined.normalize('NFC');
  };

  // {\\"u}, {\c c}, {\"{O}}, {\~\i}
  s = s.replace(/\{\\(["'`^~cvHrk=\.ubd])\s*(?:\\([ij])|\{?([A-Za-z])\}?)\}/g, applyAccent);
  // \\"{u}, \c{c}
  s = s.replace(/\\(["'`^~cvHrk=\.ubd])\s*\{(?:\\([ij])|\{?([A-Za-z])\}?)\}/g, applyAccent);
  // \\"u, \c c
  s = s.replace(/\\(["'`^~cvHrk=\.ubd])\s*(?:\\([ij])|([A-Za-z]))/g, applyAccent);

  // Remove case-protection braces after conversion (optional for field strings)
  s = s.replace(/[{}]/g, '');
  return s;
}

function getField(entry, ...names) {
  for (const name of names) {
    if (entry[name]) return entry[name];
    if (entry[name.toUpperCase()]) return entry[name.toUpperCase()];
    if (entry[name.toLowerCase()]) return entry[name.toLowerCase()];
  }
  return '';
}

// Helper: apply the umlaut fixer first (handles "u case), then LaTeX → Unicode
function normalizeTextField(s) {
  return latexToUnicode(fixGermanQuoteUmlauts(s));
}

module.exports = function () {
  const bibPath = path.join(__dirname, 'publications.bib');
  const bibContent = readFileSync(bibPath, 'utf-8');

  // bibtex-parse v2 API: some versions export `entries()`, others `parse()`.
  const parsed = typeof bibtexParse.entries === 'function'
    ? bibtexParse.entries(bibContent)
    : (typeof bibtexParse.parse === 'function'
        ? bibtexParse.parse(bibContent)
        : (() => { throw new Error('Unsupported bibtex-parse API'); })());

  return parsed.map((entry) => ({
    id: getField(entry, 'key'),
    type: getField(entry, 'type'),
    title: normalizeTextField(getField(entry, 'title')),
    authors: normalizeTextField(getField(entry, 'author')),
    year: getField(entry, 'year'),
    venue: normalizeTextField(getField(entry, 'booktitle', 'journal')),
    doi: getField(entry, 'doi'),   // leave identifiers untouched
    url: getField(entry, 'url'),   // do NOT normalize URLs
    abstract: normalizeTextField(getField(entry, 'abstract')),
    pdf: getField(entry, 'pdf'),
  }));
};