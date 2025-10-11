const assert = require("assert");

const { parseTimestampFromName } = require("../timestamp-utils");

function expectNull(value, description) {
  assert.strictEqual(
    value,
    null,
    `${description} expected to be null but received ${value}`
  );
}

function expectDate(value, expected, description) {
  assert.ok(value instanceof Date, `${description} did not return a Date`);
  assert.strictEqual(
    value.getTime(),
    expected.getTime(),
    `${description} expected ${expected.toISOString()} but received ${value.toISOString()}`
  );
}

function expectTimeParts(value, expected, description) {
  assert.ok(value instanceof Date, `${description} did not return a Date`);
  assert.strictEqual(
    value.getHours(),
    expected.hours,
    `${description} hour expected ${expected.hours} but received ${value.getHours()}`
  );
  assert.strictEqual(
    value.getMinutes(),
    expected.minutes,
    `${description} minute expected ${expected.minutes} but received ${value.getMinutes()}`
  );
  assert.strictEqual(
    value.getSeconds(),
    expected.seconds,
    `${description} second expected ${expected.seconds} but received ${value.getSeconds()}`
  );
}

const fullDateCases = [
  [
    "2025-10-08 08.41.10_00066_M1.WAV",
    new Date(2025, 9, 8, 8, 41, 10),
    "YYYY-MM-DD with dots",
  ],
  [
    "20251008_084110_audio.wav",
    new Date(2025, 9, 8, 8, 41, 10),
    "YYYYMMDD_HHMMSS",
  ],
  [
    "10-11-2025 18:22:01.jpg",
    new Date(2025, 10, 10, 18, 22, 1),
    "DD-MM-YYYY with colon",
  ],
];

fullDateCases.forEach(([filename, expected, description]) => {
  const result = parseTimestampFromName(filename);
  expectDate(result, expected, description);
});

const timeOnlyCase = parseTimestampFromName("08-52-33_extra.mp4");
expectTimeParts(
  timeOnlyCase,
  { hours: 8, minutes: 52, seconds: 33 },
  "Time-only filename"
);

const invalidCases = [
  ["", "empty string"],
  ["no-timestamp-here.jpg", "no timestamp"],
  ["2025-13-01 10.00.00.png", "invalid month"],
  ["2025-12-40 10.00.00.png", "invalid day"],
  ["2025-12-01 25.00.00.png", "invalid hour"],
];

invalidCases.forEach(([filename, description]) => {
  const result = parseTimestampFromName(filename);
  expectNull(result, description);
});

console.log("All parseTimestampFromName tests passed.");
