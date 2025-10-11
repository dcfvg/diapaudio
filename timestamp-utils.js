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

  const api = { parseTimestampFromName };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.DiapAudioUtils = globalScope.DiapAudioUtils || {};
    globalScope.DiapAudioUtils.parseTimestampFromName = parseTimestampFromName;
  }
})(typeof window !== "undefined" ? window : globalThis);
