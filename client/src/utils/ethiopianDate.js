/**
 * Lakeside Elementary School Management System
 * Ethiopian Calendar Engine (Exact Mathematical JDN/Civil Solar Calendar Algorithm)
 * Timezone: Africa/Addis_Ababa (UTC+3)
 */

export const ETHIOPIAN_MONTHS_EN = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yakatit',
  'Magabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehasse', 'Pagume'
];

export const ETHIOPIAN_MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
];

/**
 * Check if an Ethiopian year is a leap year (Pagume has 6 days instead of 5)
 * Ethiopian leap year rule: year % 4 === 3
 */
export function isEthiopianLeapYear(year) {
  return year % 4 === 3;
}

/**
 * Convert Ethiopian Calendar Date to Gregorian Date
 * @param {number} ethYear - e.g. 2018
 * @param {number} ethMonth - 1 to 13
 * @param {number} ethDay - 1 to 30 (or 1 to 5/6 for Pagume)
 * @returns {{ year: number, month: number, day: number, iso: string }}
 */
export function ethiopianToGregorian(ethYear, ethMonth, ethDay) {
  const newYearDay = ((ethYear - 1) % 4 === 3) ? 12 : 11;
  const newYearGregYear = ethYear + 7;

  const daysSinceNewYear = (ethMonth - 1) * 30 + (ethDay - 1);

  const date = new Date(Date.UTC(newYearGregYear, 8, newYearDay));
  date.setUTCDate(date.getUTCDate() + daysSinceNewYear);

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const mStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');

  return {
    year,
    month,
    day,
    iso: `${year}-${mStr}-${dStr}`
  };
}

/**
 * Convert Gregorian Date to Ethiopian Calendar Date
 */
export function gregorianToEthiopian(gregYear, gregMonth, gregDay) {
  let ethYear = gregYear - 8;
  const newYearDay = (ethYear % 4 === 3) ? 12 : 11;

  const newYearThisGregYear = new Date(Date.UTC(gregYear, 8, newYearDay));
  const targetDate = new Date(Date.UTC(gregYear, gregMonth - 1, gregDay));

  let daysDiff;
  if (targetDate >= newYearThisGregYear) {
    ethYear = gregYear - 7;
    daysDiff = Math.floor((targetDate - newYearThisGregYear) / (1000 * 60 * 60 * 24));
  } else {
    ethYear = gregYear - 8;
    const prevNewYearDay = ((ethYear - 1) % 4 === 3) ? 12 : 11;
    const prevNewYear = new Date(Date.UTC(gregYear - 1, 8, prevNewYearDay));
    daysDiff = Math.floor((targetDate - prevNewYear) / (1000 * 60 * 60 * 24));
  }

  const ethMonth = Math.floor(daysDiff / 30) + 1;
  const ethDay = (daysDiff % 30) + 1;

  const dStr = String(ethDay).padStart(2, '0');
  const mStr = String(ethMonth).padStart(2, '0');

  return {
    year: ethYear,
    month: ethMonth,
    day: ethDay,
    formatted: `${dStr}/${mStr}/${ethYear}`,
    monthName: ETHIOPIAN_MONTHS_EN[ethMonth - 1] || 'Meskerem',
    monthNameAmharic: ETHIOPIAN_MONTHS_AM[ethMonth - 1] || 'መስከረም'
  };
}

/**
 * Get current Ethiopian Date using Africa/Addis_Ababa timezone
 */
export function getCurrentEthiopianDate() {
  const now = new Date();
  const options = { timeZone: 'Africa/Addis_Ababa', year: 'numeric', month: 'numeric', day: 'numeric' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);

  let gYear = now.getFullYear();
  let gMonth = now.getMonth() + 1;
  let gDay = now.getDate();

  for (const part of parts) {
    if (part.type === 'year') gYear = parseInt(part.value, 10);
    if (part.type === 'month') gMonth = parseInt(part.value, 10);
    if (part.type === 'day') gDay = parseInt(part.value, 10);
  }

  const eth = gregorianToEthiopian(gYear, gMonth, gDay);
  return {
    ...eth,
    display: `${eth.day} ${eth.monthName} ${eth.year} E.C.`,
    displayAmharic: `${eth.day} ${eth.monthNameAmharic} ${eth.year} ዓ.ም`
  };
}

/**
 * Validate an Ethiopian Calendar date
 */
export function isValidEthiopianDate(day, month, year) {
  if (!year || isNaN(year) || year < 1900 || year > 2100) return false;
  if (!month || isNaN(month) || month < 1 || month > 13) return false;
  if (!day || isNaN(day) || day < 1) return false;

  if (month >= 1 && month <= 12) {
    return day <= 30;
  }
  if (month === 13) {
    const maxPagume = isEthiopianLeapYear(year) ? 6 : 5;
    return day <= maxPagume;
  }
  return false;
}

/**
 * Parse an Ethiopian date typed by the user
 * Supports formats: DD/MM/YYYY, DD-MM-YYYY, DD MM YYYY
 */
export function parseEthiopianDate(input) {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Invalid date' };
  }

  const cleaned = input.trim();
  const match = cleaned.match(/^(\d{1,2})[\/\-\s\.](\d{1,2})[\/\-\s\.](\d{4})$/);
  if (!match) {
    return { valid: false, error: 'Invalid date' };
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (!isValidEthiopianDate(day, month, year)) {
    return { valid: false, error: 'Invalid date' };
  }

  const dStr = String(day).padStart(2, '0');
  const mStr = String(month).padStart(2, '0');

  return {
    valid: true,
    day,
    month,
    year,
    formatted: `${dStr}/${mStr}/${year}`,
    monthName: ETHIOPIAN_MONTHS_EN[month - 1],
    monthNameAmharic: ETHIOPIAN_MONTHS_AM[month - 1]
  };
}

/**
 * Convert any date string (Gregorian YYYY-MM-DD, or ISO timestamp) to Ethiopian DD/MM/YYYY or readable string
 */
export function formatToEthiopian(dateInput, format = 'short') {
  if (!dateInput) return '—';

  // If already in DD/MM/YYYY format with E.C.
  if (typeof dateInput === 'string' && dateInput.includes('E.C.')) {
    return dateInput;
  }

  // Check if string is already DD/MM/YYYY
  if (typeof dateInput === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateInput)) {
    const parts = dateInput.split('/');
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (m <= 13 && y < 2050 && y > 1950) {
      if (format === 'long' || format === 'month_name') {
        return `${ETHIOPIAN_MONTHS_EN[m - 1] || ''} ${d}, ${y}`;
      }
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
  }

  // Parse as Gregorian date
  let gDate;
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const gY = parseInt(match[1], 10);
      const gM = parseInt(match[2], 10);
      const gD = parseInt(match[3], 10);
      const eth = gregorianToEthiopian(gY, gM, gD);
      if (format === 'long' || format === 'month_name') {
        return `${eth.monthName} ${eth.day}, ${eth.year}`;
      }
      return eth.formatted;
    }
    gDate = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    gDate = dateInput;
  } else {
    return String(dateInput);
  }

  if (isNaN(gDate.getTime())) return String(dateInput);

  const eth = gregorianToEthiopian(gDate.getUTCFullYear(), gDate.getUTCMonth() + 1, gDate.getUTCDate());
  if (format === 'month_name') {
    return `${eth.monthName} ${eth.day}, ${eth.year}`;
  }
  if (format === 'long') {
    return `${eth.monthName} ${eth.day}, ${eth.year}`;
  }
  return eth.formatted;
}
