# Timestamp Format Testing

The updated `parseTimestampFromName` function now supports these formats:

## ✅ Supported Formats

### Full Date-Time Formats

1. **YYYY-MM-DD HH:MM:SS** (various separators)
   - `2024-10-09 14:30:45.jpg` ✓
   - `2024_10_09_14_30_45.png` ✓
   - `20241009-143045.jpg` ✓
   - `20241009_143045.jpg` ✓

2. **DD-MM-YYYY HH:MM:SS**
   - `09-10-2024 14:30:45.jpg` ✓
   - `09_10_2024_14_30_45.png` ✓

### Time-Only Formats (at start of filename)

3. **HH.MM.SS** or **HH:MM:SS** or **HH-MM-SS**
   - `10.37.22_00089_M2_01.mp3` ✓
   - `10:37:22_recording.jpg` ✓
   - `10-37-22_image.png` ✓
   - `14_30_45_photo.jpg` ✓

## How It Works

### For Time-Only Formats:
- Extracts: `10.37.22` from `10.37.22_00089_M2_01.mp3`
- Interprets as: 10:37:22 (hours:minutes:seconds)
- Uses today's date as reference
- Validates that hours < 24, minutes < 60, seconds < 60

### For Full Date-Time Formats:
- Auto-detects YYYY-MM-DD vs DD-MM-YYYY based on first number
- If first number > 1000 → YYYY-MM-DD
- If first number ≤ 31 → DD-MM-YYYY
- Validates all components are in valid ranges

## Validation Rules

- Year: 1900-2100
- Month: 1-12
- Day: 1-31
- Hours: 0-23
- Minutes: 0-59
- Seconds: 0-59

## Examples That Now Work

```
✓ 10.37.22_00089_M2_01.mp3        → 10:37:22 (today)
✓ 14:30:45_recording.wav          → 14:30:45 (today)
✓ 2024-10-09 14:30:45.jpg         → 2024-10-09 14:30:45
✓ 20241009_143045.png             → 2024-10-09 14:30:45
✓ 09-10-2024 14:30:45.jpg         → 2024-10-09 14:30:45
✓ IMG_10-37-22_001.jpg            → 10:37:22 (today)
```

## Note on Time-Only Formats

When using time-only formats (like `10.37.22_00089_M2_01.mp3`), all images in the same session should use the same reference date. The app uses the current date, so timestamps will be relative to "today" at those specific times.

This works well for:
- Same-day recordings where date is implicit
- Time-sequenced captures within a single session
- Files exported with time-only naming conventions
