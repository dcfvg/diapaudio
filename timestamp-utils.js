(function (globalScope) {
  function parseTimestampFromName(name) {
    if (!name || typeof name !== "string") {
      return null;
    }

    const basename = name.split("/").pop() || name;
    const clean = basename.replace(/\.[^.]+$/, "");

    const regexes = [
      /(\d{4})[-_]?(\d{2})[-_]?(\d{2})[ _-](\d{2})[.\-_:](\d{2})[.\-_:](\d{2})/,
      /(\d{4})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/,
      /(\d{2})[-_]?(\d{2})[-_]?(\d{4})[ _-](\d{2})[.\-_:](\d{2})[.\-_:](\d{2})/,
      /^(\d{2})[.\-_:](\d{2})[.\-_:](\d{2})/,
    ];

    for (const regex of regexes) {
      const match = clean.match(regex);
      if (match) {
        if (match.length === 4) {
          const [, hoursStr, minutesStr, secondsStr] = match;
          const hours = Number(hoursStr);
          const minutes = Number(minutesStr);
          const seconds = Number(secondsStr);
          if (
            Number.isInteger(hours) &&
            Number.isInteger(minutes) &&
            Number.isInteger(seconds) &&
            hours >= 0 &&
            hours < 24 &&
            minutes >= 0 &&
            minutes < 60 &&
            seconds >= 0 &&
            seconds < 60
          ) {
            const now = new Date();
            const ts = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              hours,
              minutes,
              seconds
            );
            if (!Number.isNaN(ts.getTime())) {
              return ts;
            }
          }
        } else if (match.length === 7) {
          let [, p1Str, p2Str, p3Str, hoursStr, minutesStr, secondsStr] = match;
          const p1 = Number(p1Str);
          const p2 = Number(p2Str);
          const p3 = Number(p3Str);
          const hours = Number(hoursStr);
          const minutes = Number(minutesStr);
          const seconds = Number(secondsStr);

          let year;
          let month;
          let day;

          if (p1 > 1000) {
            year = p1;
            month = p2;
            day = p3;
          } else {
            day = p1;
            month = p2;
            year = p3;
          }

          if (
            Number.isInteger(year) &&
            Number.isInteger(month) &&
            Number.isInteger(day) &&
            Number.isInteger(hours) &&
            Number.isInteger(minutes) &&
            Number.isInteger(seconds) &&
            year >= 1900 &&
            year <= 2100 &&
            month >= 1 &&
            month <= 12 &&
            day >= 1 &&
            day <= 31 &&
            hours >= 0 &&
            hours < 24 &&
            minutes >= 0 &&
            minutes < 60 &&
            seconds >= 0 &&
            seconds < 60
          ) {
            const ts = new Date(
              year,
              month - 1,
              day,
              hours,
              minutes,
              seconds
            );
            if (!Number.isNaN(ts.getTime())) {
              return ts;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract EXIF timestamp from image file
   * Reads EXIF DateTimeOriginal, DateTime, or DateTimeDigitized tags
   * @param {File} file - Image file to read EXIF from
   * @returns {Promise<Date|null>} - Promise resolving to Date or null
   */
  async function parseTimestampFromEXIF(file) {
    if (!file || !(file instanceof File)) {
      return null;
    }

    // Only process image files
    if (!file.type.startsWith('image/')) {
      return null;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const dataView = new DataView(arrayBuffer);

      // Check for JPEG marker
      if (dataView.getUint16(0, false) !== 0xFFD8) {
        return null; // Not a JPEG
      }

      // Find EXIF segment
      let offset = 2;
      while (offset < dataView.byteLength) {
        if (dataView.getUint8(offset) !== 0xFF) break;
        
        const marker = dataView.getUint8(offset + 1);
        if (marker === 0xE1) { // APP1 marker (EXIF)
          const exifData = parseEXIFSegment(dataView, offset + 4);
          if (exifData) {
            return exifData;
          }
        }
        
        offset += 2 + dataView.getUint16(offset + 2, false);
      }
    } catch (error) {
      console.warn('Error reading EXIF data:', error);
    }

    return null;
  }

  /**
   * Parse EXIF segment to extract timestamp
   * Priority: DateTimeOriginal (0x9003) > DateTimeDigitized (0x9004) > DateTime (0x0132)
   * @param {DataView} dataView - DataView of image file
   * @param {number} offset - Offset to EXIF data
   * @returns {Date|null} - Extracted timestamp or null
   */
  function parseEXIFSegment(dataView, offset) {
    try {
      // Check EXIF header
      if (dataView.getUint32(offset, false) !== 0x45786966) { // "Exif"
        return null;
      }
      
      offset += 6; // Skip "Exif\0\0"
      
      // Check byte order
      const byteOrder = dataView.getUint16(offset, false);
      const littleEndian = byteOrder === 0x4949; // "II"
      
      // Skip to IFD offset
      const ifdOffset = dataView.getUint32(offset + 4, littleEndian);
      const ifdStart = offset + ifdOffset;
      
      // Collect all datetime values with their priority
      const datetimes = {
        dateTimeOriginal: null,    // 0x9003 - Priority 1 (capture time)
        dateTimeDigitized: null,   // 0x9004 - Priority 2
        dateTime: null             // 0x0132 - Priority 3 (file modification)
      };
      
      // Read IFD0 entries
      const numEntries = dataView.getUint16(ifdStart, littleEndian);
      
      for (let i = 0; i < numEntries; i++) {
        const entryOffset = ifdStart + 2 + (i * 12);
        const tag = dataView.getUint16(entryOffset, littleEndian);
        
        // Check for SubIFD (Exif IFD tag 0x8769) - most important, check first
        if (tag === 0x8769) {
          const subIfdOffset = dataView.getUint32(entryOffset + 8, littleEndian);
          const subDates = parseIFDForDates(dataView, offset + subIfdOffset, littleEndian, offset);
          // Merge SubIFD results with priority (SubIFD takes precedence)
          if (subDates.dateTimeOriginal) datetimes.dateTimeOriginal = subDates.dateTimeOriginal;
          if (subDates.dateTimeDigitized) datetimes.dateTimeDigitized = subDates.dateTimeDigitized;
          if (subDates.dateTime && !datetimes.dateTime) datetimes.dateTime = subDates.dateTime;
        }
        
        // Tags in IFD0: 0x9003 = DateTimeOriginal, 0x0132 = DateTime, 0x9004 = DateTimeDigitized
        if (tag === 0x9003 && !datetimes.dateTimeOriginal) {
          const valueOffset = dataView.getUint32(entryOffset + 8, littleEndian);
          const dateTimeStr = readASCIIString(dataView, offset + valueOffset, 19);
          datetimes.dateTimeOriginal = parseEXIFDateTime(dateTimeStr);
        } else if (tag === 0x9004 && !datetimes.dateTimeDigitized) {
          const valueOffset = dataView.getUint32(entryOffset + 8, littleEndian);
          const dateTimeStr = readASCIIString(dataView, offset + valueOffset, 19);
          datetimes.dateTimeDigitized = parseEXIFDateTime(dateTimeStr);
        } else if (tag === 0x0132 && !datetimes.dateTime) {
          const valueOffset = dataView.getUint32(entryOffset + 8, littleEndian);
          const dateTimeStr = readASCIIString(dataView, offset + valueOffset, 19);
          datetimes.dateTime = parseEXIFDateTime(dateTimeStr);
        }
      }
      
      // Return in priority order: DateTimeOriginal > DateTimeDigitized > DateTime
      if (datetimes.dateTimeOriginal) {
        return datetimes.dateTimeOriginal;
      }
      if (datetimes.dateTimeDigitized) {
        return datetimes.dateTimeDigitized;
      }
      if (datetimes.dateTime) {
        return datetimes.dateTime;
      }
    } catch (error) {
      console.warn('Error parsing EXIF segment:', error);
    }
    
    return null;
  }

  /**
   * Parse a single IFD (Image File Directory) and extract datetime tags
   * @returns {Object} - Object with dateTimeOriginal, dateTimeDigitized, dateTime properties
   */
  function parseIFDForDates(dataView, ifdStart, littleEndian, baseOffset) {
    const result = {
      dateTimeOriginal: null,
      dateTimeDigitized: null,
      dateTime: null
    };
    
    try {
      const numEntries = dataView.getUint16(ifdStart, littleEndian);
      
      for (let i = 0; i < numEntries; i++) {
        const entryOffset = ifdStart + 2 + (i * 12);
        const tag = dataView.getUint16(entryOffset, littleEndian);
        
        if (tag === 0x9003) {
          const valueOffset = dataView.getUint32(entryOffset + 8, littleEndian);
          const dateTimeStr = readASCIIString(dataView, baseOffset + valueOffset, 19);
          result.dateTimeOriginal = parseEXIFDateTime(dateTimeStr);
        } else if (tag === 0x9004) {
          const valueOffset = dataView.getUint32(entryOffset + 8, littleEndian);
          const dateTimeStr = readASCIIString(dataView, baseOffset + valueOffset, 19);
          result.dateTimeDigitized = parseEXIFDateTime(dateTimeStr);
        } else if (tag === 0x0132) {
          const valueOffset = dataView.getUint32(entryOffset + 8, littleEndian);
          const dateTimeStr = readASCIIString(dataView, baseOffset + valueOffset, 19);
          result.dateTime = parseEXIFDateTime(dateTimeStr);
        }
      }
    } catch (error) {
      console.warn('Error parsing IFD for dates:', error);
    }
    
    return result;
  }

  /**
   * Read ASCII string from DataView
   */
  function readASCIIString(dataView, offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) {
      const charCode = dataView.getUint8(offset + i);
      if (charCode === 0) break;
      str += String.fromCharCode(charCode);
    }
    return str;
  }

  /**
   * Parse EXIF datetime string (format: "YYYY:MM:DD HH:MM:SS")
   * @param {string} dateTimeStr - EXIF datetime string
   * @returns {Date|null} - Parsed date or null
   */
  function parseEXIFDateTime(dateTimeStr) {
    if (!dateTimeStr || typeof dateTimeStr !== 'string') {
      return null;
    }

    // EXIF format: "YYYY:MM:DD HH:MM:SS"
    const match = dateTimeStr.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) {
      return null;
    }

    const [, yearStr, monthStr, dayStr, hoursStr, minutesStr, secondsStr] = match;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    const seconds = Number(secondsStr);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      !Number.isInteger(seconds) ||
      year < 1900 || year > 2100 ||
      month < 1 || month > 12 ||
      day < 1 || day > 31 ||
      hours < 0 || hours >= 24 ||
      minutes < 0 || minutes >= 60 ||
      seconds < 0 || seconds >= 60
    ) {
      return null;
    }

    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    return !Number.isNaN(date.getTime()) ? date : null;
  }

  const api = {
    parseTimestampFromName,
    parseTimestampFromEXIF,
    parseEXIFDateTime
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.DiapAudioUtils = globalScope.DiapAudioUtils || {};
    globalScope.DiapAudioUtils.parseTimestampFromName = parseTimestampFromName;
    globalScope.DiapAudioUtils.parseTimestampFromEXIF = parseTimestampFromEXIF;
    globalScope.DiapAudioUtils.parseEXIFDateTime = parseEXIFDateTime;
  }
})(typeof window !== "undefined" ? window : globalThis);
