/**
 * Timestamp parsing utilities - powered by fixTS v1.1.0
 * Simple re-export wrapper maintaining API compatibility
 * 
 * Migration from 938 lines of duplicated code to clean imports!
 * See: https://github.com/dcfvg/fixts for the source library
 * 
 * NEW in v1.1.0 (2025-11-08):
 * - ✅ Browser bundle fixed (no more process errors!)
 * - 🚀 Batch processing API (10x faster bulk operations)
 * - 🧠 Context-aware ambiguity resolution
 * - 🎨 Custom pattern support
 * - 📊 Unified metadata extraction API
 * - 📸 Extended image formats (PNG, WebP, HEIC, GIF)
 * - 🎵 Extended audio formats (FLAC, WMA, APE, Opus, Speex, etc.)
 */

// Re-export all fixTS browser functions
export {
  // Core timestamp parsing from filenames
  parseTimestamp as parseTimestampFromName,
  parseTimestampFromFilename,
  
  // File metadata extraction (EXIF, audio tags)
  parseTimestampFromEXIF,
  parseTimestampFromAudio,
  
  // Date utilities
  parseDateString,
  parseEXIFDateTime,
  createDate,
  
  // Formatting
  formatDate,
  generateNewName,
  
  // Detection and analysis
  getDetectionInfo,
  getBestTimestamp,
  
  // Ambiguity detection (now browser-safe!)
  detectAmbiguity,
  
  // Time shift utilities
  parseTimeShift,
  applyTimeShift,
  formatTimeShift,
  
  // NEW v1.1.0: Batch Processing API (High Performance) 🚀
  parseTimestampBatch,           // Process multiple files efficiently
  parseAndGroupByConfidence,     // Group by detection quality
  getBatchStats,                  // Get comprehensive statistics
  filterByTimestamp,              // Separate files with/without timestamps
  
  // NEW v1.1.0: Context-Aware Ambiguity Resolution 🧠
  analyzeContextualFormat,        // Analyze batch for DD-MM vs MM-DD
  resolveAmbiguitiesByContext,    // Auto-resolve based on context
  getContextualParsingOptions,    // Get recommended parsing options
  hasAmbiguousDates,              // Check if batch has ambiguous dates
  getFormatSummary,               // Human-readable format analysis
  
  // NEW v1.1.0: Custom Pattern Support 🎨
  registerPattern,                // Register custom regex patterns
  unregisterPattern,              // Remove custom patterns
  getRegisteredPatterns,          // List all registered patterns
  clearPatterns,                  // Remove all custom patterns
  hasPattern,                     // Check if pattern exists
  getPattern,                     // Get specific pattern
  applyCustomPatterns,            // Apply patterns to filenames
  exportPatterns,                 // Export pattern definitions
  importPatterns,                 // Import pattern definitions
  PatternValidationError,         // Custom error for invalid patterns
  
  // NEW v1.1.0: Unified Metadata Extraction 📊
  extractTimestamp,               // Extract from any source with fallback
  extractTimestampBatch,          // Batch metadata extraction
  compareTimestampSources,        // Detect discrepancies between sources
  getSourceStatistics,            // Analyze source distribution
  suggestBestSource,              // Get recommendation for best source
  SOURCE_TYPE,                    // Source type constants
  DEFAULT_PRIORITY,               // Default source priority order
} from 'fixts/browser';

// Default export for backwards compatibility
import * as timestampUtils from 'fixts/browser';
export default timestampUtils;
