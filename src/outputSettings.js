export const DEFAULT_OUTPUT_SETTINGS = {
  deliveryMethod: 'clipboard',
  contentFormat: 'plain-text',
  fileNameBase: 'ballot_results',
  csvDelimiter: 'comma',
  mailtoTo: '',
  mailtoSubject: 'Ballot results',
  mailtoBodyPrefix: ''
};

export const OUTPUT_DELIVERY_METHODS = new Set(['clipboard', 'download', 'mailto']);
export const OUTPUT_CONTENT_FORMATS = new Set(['plain-text', 'json', 'csv']);
export const OUTPUT_CSV_DELIMITER_OPTIONS = new Set(['comma', 'semicolon', 'tab']);

export function normalizeOutputSettings(rawSettings = {}, fallbackSettings = {}) {
  const fallback = {
    ...DEFAULT_OUTPUT_SETTINGS,
    ...(fallbackSettings || {})
  };

  const normalizeKey = (value) => String(value || '').trim().toLowerCase();
  const deliveryKey = normalizeKey(rawSettings?.deliveryMethod || fallback.deliveryMethod || DEFAULT_OUTPUT_SETTINGS.deliveryMethod);
  const formatKey = normalizeKey(rawSettings?.contentFormat || fallback.contentFormat || DEFAULT_OUTPUT_SETTINGS.contentFormat);
  const delimiterKey = normalizeKey(rawSettings?.csvDelimiter || fallback.csvDelimiter || DEFAULT_OUTPUT_SETTINGS.csvDelimiter);

  return {
    deliveryMethod: OUTPUT_DELIVERY_METHODS.has(deliveryKey) ? deliveryKey : DEFAULT_OUTPUT_SETTINGS.deliveryMethod,
    contentFormat: OUTPUT_CONTENT_FORMATS.has(formatKey) ? formatKey : DEFAULT_OUTPUT_SETTINGS.contentFormat,
    fileNameBase: String(rawSettings?.fileNameBase ?? fallback.fileNameBase ?? DEFAULT_OUTPUT_SETTINGS.fileNameBase).trim() || DEFAULT_OUTPUT_SETTINGS.fileNameBase,
    csvDelimiter: OUTPUT_CSV_DELIMITER_OPTIONS.has(delimiterKey) ? delimiterKey : DEFAULT_OUTPUT_SETTINGS.csvDelimiter,
    mailtoTo: String(rawSettings?.mailtoTo ?? fallback.mailtoTo ?? DEFAULT_OUTPUT_SETTINGS.mailtoTo).trim(),
    mailtoSubject: String(rawSettings?.mailtoSubject ?? fallback.mailtoSubject ?? DEFAULT_OUTPUT_SETTINGS.mailtoSubject).trim() || DEFAULT_OUTPUT_SETTINGS.mailtoSubject,
    mailtoBodyPrefix: String(rawSettings?.mailtoBodyPrefix ?? fallback.mailtoBodyPrefix ?? DEFAULT_OUTPUT_SETTINGS.mailtoBodyPrefix)
  };
}

export function toCsvDelimiter(delimiterKey) {
  if (delimiterKey === 'semicolon') return ';';
  if (delimiterKey === 'tab') return '\t';
  return ',';
}

export function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (!/[",\n\r]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function formatOutputPayload({ voterName, contestTitle, rankings, contentFormat, csvDelimiter }) {
  const rankingList = Array.isArray(rankings) ? rankings : [];
  if (contentFormat === 'json') {
    return JSON.stringify({
      voterName: String(voterName || ''),
      contestTitle: String(contestTitle || ''),
      rankings: rankingList.map((entry, index) => ({
        rank: index + 1,
        value: String(entry || '')
      }))
    }, null, 2);
  }

  if (contentFormat === 'csv') {
    const delimiter = toCsvDelimiter(csvDelimiter);
    const rows = [
      ['rank', 'value'],
      ...rankingList.map((entry, index) => [String(index + 1), String(entry || '')])
    ];
    return rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(delimiter)).join('\n');
  }

  const lines = [`VOTER: ${voterName}`, `CONTEST: ${contestTitle}`, ''];
  rankingList.forEach((entry, index) => lines.push(`${index + 1}. ${entry}`));
  return lines.join('\n');
}

export function slugifyFileName(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'ballot_results';
}

export function buildOutputFileName(contestTitle, outputSettings) {
  const baseName = outputSettings.fileNameBase || contestTitle || 'ballot_results';
  const extension = outputSettings.contentFormat === 'json'
    ? 'json'
    : outputSettings.contentFormat === 'csv'
      ? 'csv'
      : 'txt';
  return `${slugifyFileName(baseName)}.${extension}`;
}
