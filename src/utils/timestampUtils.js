/**
 * Timestamp parsing utilities - powered by fixTS.
 *
 * Keep imports explicit. The fixts browser entry currently exposes a contextual
 * resolver that imports a Node-only ambiguity detector internally, so importing
 * those contextual helpers through the package entry breaks production builds.
 */
import {
  DEFAULT_PRIORITY,
  PatternValidationError,
  SOURCE_TYPE,
  applyCustomPatterns,
  applyTimeShift,
  clearPatterns,
  compareTimestampSources,
  createDate,
  detectAmbiguity,
  exportPatterns,
  extractTimestamp,
  extractTimestampBatch,
  filterByTimestamp,
  formatDate,
  formatTimeShift,
  generateNewName,
  getBatchStats,
  getBestTimestamp,
  getDetectionInfo,
  getPattern,
  getRegisteredPatterns,
  getSourceStatistics,
  hasPattern,
  importPatterns,
  parseAndGroupByConfidence,
  parseDateString,
  parseEXIFDateTime,
  parseTimeShift,
  parseTimestamp as parseTimestampFromName,
  parseTimestampBatch,
  parseTimestampFromAudio,
  parseTimestampFromEXIF,
  parseTimestampFromFilename,
  registerPattern,
  suggestBestSource,
  unregisterPattern,
} from "fixts/browser";

const DATE_ORDER_PATTERN = /(\d{1,2})[-_/](\d{1,2})[-_/](\d{2,4})/;

function analyzeDateOrderEvidence(filenames) {
  const stats = {
    total: filenames.length,
    ambiguous: 0,
    dmyProof: 0,
    mdyProof: 0,
  };

  for (const filename of filenames) {
    if (detectAmbiguity(filename)) {
      stats.ambiguous += 1;
    }

    const match = String(filename).match(DATE_ORDER_PATTERN);
    if (!match) {
      continue;
    }

    const first = Number.parseInt(match[1], 10);
    const second = Number.parseInt(match[2], 10);
    if (first > 12 && second <= 12) {
      stats.dmyProof += 1;
    } else if (second > 12 && first <= 12) {
      stats.mdyProof += 1;
    }
  }

  return stats;
}

export function hasAmbiguousDates(filenames) {
  return filenames.some((filename) => Boolean(detectAmbiguity(filename)));
}

export function analyzeContextualFormat(filenames) {
  const stats = analyzeDateOrderEvidence(filenames);
  const likelyFormat = stats.mdyProof > stats.dmyProof ? "mdy" : "dmy";
  const proofCount = Math.max(stats.dmyProof, stats.mdyProof);
  const confidence =
    proofCount > 0 ? Math.min(0.95, 0.65 + proofCount / Math.max(4, filenames.length)) : 0.5;
  const evidence = [
    `${stats.ambiguous} ambiguous date${stats.ambiguous === 1 ? "" : "s"}`,
    `${stats.dmyProof} DMY proof date${stats.dmyProof === 1 ? "" : "s"}`,
    `${stats.mdyProof} MDY proof date${stats.mdyProof === 1 ? "" : "s"}`,
  ];

  return {
    likelyFormat,
    recommendation: likelyFormat,
    confidence,
    evidence,
    stats,
  };
}

export function resolveAmbiguitiesByContext(filenames) {
  const analysis = analyzeContextualFormat(filenames);
  return {
    format: analysis.likelyFormat,
    confidence: analysis.confidence,
    autoResolved: analysis.confidence >= 0.8,
    analysis,
  };
}

export function getContextualParsingOptions(filenames) {
  const resolution = resolveAmbiguitiesByContext(filenames);
  return {
    dateFormat: resolution.format,
    confidence: resolution.confidence,
    autoResolved: resolution.autoResolved,
    evidence: resolution.analysis.evidence,
  };
}

export function getFormatSummary(analysisOrFilenames) {
  const analysis = Array.isArray(analysisOrFilenames)
    ? analyzeContextualFormat(analysisOrFilenames)
    : analysisOrFilenames;
  return {
    totalFiles: analysis.stats.total,
    ambiguousDates: analysis.stats.ambiguous,
    recommendation: analysis.likelyFormat,
    confidence: analysis.confidence,
    evidence: analysis.evidence,
    needsUserInput: analysis.confidence < 0.7 && analysis.stats.ambiguous > 0,
  };
}

export {
  DEFAULT_PRIORITY,
  PatternValidationError,
  SOURCE_TYPE,
  applyCustomPatterns,
  applyTimeShift,
  clearPatterns,
  compareTimestampSources,
  createDate,
  detectAmbiguity,
  exportPatterns,
  extractTimestamp,
  extractTimestampBatch,
  filterByTimestamp,
  formatDate,
  formatTimeShift,
  generateNewName,
  getBatchStats,
  getBestTimestamp,
  getDetectionInfo,
  getPattern,
  getRegisteredPatterns,
  getSourceStatistics,
  hasPattern,
  importPatterns,
  parseAndGroupByConfidence,
  parseDateString,
  parseEXIFDateTime,
  parseTimeShift,
  parseTimestampBatch,
  parseTimestampFromAudio,
  parseTimestampFromEXIF,
  parseTimestampFromFilename,
  parseTimestampFromName,
  registerPattern,
  suggestBestSource,
  unregisterPattern,
};

export default {
  DEFAULT_PRIORITY,
  PatternValidationError,
  SOURCE_TYPE,
  analyzeContextualFormat,
  applyCustomPatterns,
  applyTimeShift,
  clearPatterns,
  compareTimestampSources,
  createDate,
  detectAmbiguity,
  exportPatterns,
  extractTimestamp,
  extractTimestampBatch,
  filterByTimestamp,
  formatDate,
  formatTimeShift,
  generateNewName,
  getBatchStats,
  getBestTimestamp,
  getContextualParsingOptions,
  getDetectionInfo,
  getFormatSummary,
  getPattern,
  getRegisteredPatterns,
  getSourceStatistics,
  hasAmbiguousDates,
  hasPattern,
  importPatterns,
  parseAndGroupByConfidence,
  parseDateString,
  parseEXIFDateTime,
  parseTimeShift,
  parseTimestampBatch,
  parseTimestampFromAudio,
  parseTimestampFromEXIF,
  parseTimestampFromFilename,
  parseTimestampFromName,
  registerPattern,
  resolveAmbiguitiesByContext,
  suggestBestSource,
  unregisterPattern,
};
