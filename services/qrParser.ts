import { ScanType, QRCodeData } from '../constants/types';

export function parseQRCode(rawValue: string): QRCodeData {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return {
      type: 'text',
      data: { text: rawValue },
      rawValue,
    };
  }

  const wifiData = parseWifiPayload(trimmedValue);
  if (wifiData) {
    return { type: 'wifi', data: wifiData, rawValue };
  }

  const emailData = parseMailtoPayload(trimmedValue);
  if (emailData) {
    return { type: 'email', data: emailData, rawValue };
  }

  const smsData = parseSmsPayload(trimmedValue);
  if (smsData) {
    return { type: 'sms', data: smsData, rawValue };
  }

  const whatsappData = parseWhatsAppPayload(trimmedValue);
  if (whatsappData) {
    return { type: 'whatsapp', data: whatsappData, rawValue };
  }

  const phoneData = parsePhonePayload(trimmedValue);
  if (phoneData) {
    return { type: 'phone', data: phoneData, rawValue };
  }

  const vcardData = parseVCardPayload(trimmedValue);
  if (vcardData) {
    return { type: 'vcard', data: vcardData, rawValue };
  }

  const calendarData = parseCalendarPayload(trimmedValue);
  if (calendarData) {
    return { type: 'calendar', data: calendarData, rawValue };
  }

  const couponData = parseCouponPayload(trimmedValue);
  if (couponData) {
    return { type: 'coupon', data: couponData, rawValue };
  }

  const locationData = parseLocationPayload(trimmedValue);
  if (locationData) {
    return { type: 'location', data: locationData, rawValue };
  }

  const urlData = parseUrlPayload(trimmedValue);
  if (urlData) {
    return urlData;
  }

  if (/^\d{8,14}$/.test(trimmedValue)) {
    return {
      type: 'barcode',
      data: { barcode: trimmedValue },
      rawValue,
    };
  }

  return {
    type: 'text',
    data: { text: rawValue },
    rawValue,
  };
}

export function generateQRCode(type: ScanType, data: Record<string, any>): string {
  switch (type) {
    case 'url':
      return data.url;

    case 'wifi': {
      const security = String(data.security || 'WPA').toUpperCase();
      const normalizedSecurity = security === 'NONE' ? 'nopass' : security;
      return `WIFI:T:${normalizedSecurity};S:${data.ssid};P:${data.password};;`;
    }

    case 'email': {
      let email = `mailto:${data.email}`;
      const params = [];
      if (data.subject) params.push(`subject=${encodeURIComponent(data.subject)}`);
      if (data.body) params.push(`body=${encodeURIComponent(data.body)}`);
      if (params.length > 0) email += `?${params.join('&')}`;
      return email;
    }

    case 'phone':
      return `tel:${data.phone}`;

    case 'sms': {
      let sms = `sms:${data.phone}`;
      if (data.body) sms += `?body=${encodeURIComponent(data.body)}`;
      return sms;
    }

    case 'vcard': {
      const vcard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${data.firstName} ${data.lastName}`.trim(),
        `TEL:${data.phone}`,
        `EMAIL:${data.email}`,
        `ORG:${data.company}`,
        'END:VCARD',
      ];
      return vcard.join('\n');
    }

    case 'location':
      return `geo:${data.latitude},${data.longitude}`;

    case 'barcode':
      return data.barcode;

    case 'calendar':
      return data.text || '';

    case 'text':
    default:
      return data.text;
  }
}

function parseWifiPayload(rawValue: string) {
  if (!/^WIFI:/i.test(rawValue)) {
    return null;
  }

  const payload = rawValue.slice(5);
  const security = getStructuredValue(payload, 'T');
  const ssid = getStructuredValue(payload, 'S');
  const password = getStructuredValue(payload, 'P');

  if (!ssid) {
    return null;
  }

  return {
    security: normalizeWifiSecurity(security),
    ssid: unescapeStructuredValue(ssid),
    password: unescapeStructuredValue(password || ''),
  };
}

function parseMailtoPayload(rawValue: string) {
  if (!/^mailto:/i.test(rawValue)) {
    return null;
  }

  const recipientAndQuery = rawValue.replace(/^mailto:/i, '');
  const [recipientPart = '', queryPart = ''] = recipientAndQuery.split('?');
  const params = new URLSearchParams(queryPart);

  return {
    email: decodeQrComponent(recipientPart),
    subject: decodeQrComponent(params.get('subject') || ''),
    body: decodeQrComponent(params.get('body') || ''),
  };
}

function parsePhonePayload(rawValue: string) {
  if (/^tel:/i.test(rawValue)) {
    return {
      phone: rawValue.replace(/^tel:/i, '').trim(),
    };
  }

  if (/^\d{10,11}$/.test(rawValue)) {
    return {
      phone: rawValue,
    };
  }

  if (looksLikePhoneNumber(rawValue)) {
    return {
      phone: rawValue,
    };
  }

  return null;
}

function parseSmsPayload(rawValue: string) {
  if (/^smsto:/i.test(rawValue)) {
    const payload = rawValue.replace(/^smsto:/i, '');
    const [phone = '', body = ''] = payload.split(/:(.*)/s);

    return {
      phone: decodeQrComponent(phone),
      body: decodeQrComponent(body),
    };
  }

  if (!/^sms:/i.test(rawValue)) {
    return null;
  }

  const payload = rawValue.replace(/^sms:/i, '');
  const [phonePart = '', queryPart = ''] = payload.split('?');
  const params = new URLSearchParams(queryPart);

  return {
    phone: decodeQrComponent(phonePart),
    body: decodeQrComponent(params.get('body') || ''),
  };
}

function parseVCardPayload(rawValue: string) {
  if (!/^BEGIN:VCARD/i.test(rawValue)) {
    return null;
  }

  const lines = splitStructuredLines(rawValue);
  const fullName = getLineValue(lines, 'FN') || '';
  const firstName = fullName.split(' ')[0] || '';
  const lastName = fullName.split(' ').slice(1).join(' ');

  return {
    firstName,
    lastName,
    phone: getLineValue(lines, 'TEL') || '',
    email: getLineValue(lines, 'EMAIL') || '',
    company: getLineValue(lines, 'ORG') || '',
    jobTitle: getLineValue(lines, 'TITLE') || '',
    website: getLineValue(lines, 'URL') || '',
    address: formatVCardAddress(getLineValue(lines, 'ADR') || ''),
  };
}

function parseCouponPayload(rawValue: string) {
  const normalizedRawValue = normalizeStructuredRawValue(rawValue);
  const lines = splitStructuredLines(normalizedRawValue);

  const title = getLineValue(lines, 'COUPON');
  const code = getLineValue(lines, 'CODE');
  const details = getLineValue(lines, 'DETAILS');

  if (!title && !code) {
    return null;
  }

  return {
    title: title || 'Coupon',
    code,
    details,
  };
}

function parseCalendarPayload(rawValue: string) {
  const normalizedRawValue = normalizeStructuredRawValue(rawValue);
  const upperValue = normalizedRawValue.toUpperCase();

  if (
    !upperValue.includes('BEGIN:VCALENDAR') &&
    !upperValue.includes('BEGIN:VEVENT') &&
    !upperValue.includes('SUMMARY:')
  ) {
    return null;
  }

  const lines = splitStructuredLines(normalizedRawValue);
  const title = getLineValue(lines, 'SUMMARY') || 'Calendar Event';
  const startRaw = getLineValue(lines, 'DTSTART') || '';
  const endRaw = getLineValue(lines, 'DTEND') || '';
  const location = getLineValue(lines, 'LOCATION') || '';
  const description = getLineValue(lines, 'DESCRIPTION') || '';

  if (!startRaw && !endRaw && title === 'Calendar Event') {
    return null;
  }

  return {
    title,
    startRaw,
    endRaw,
    start: formatCalendarDisplay(startRaw),
    end: formatCalendarDisplay(endRaw),
    location,
    description,
  };
}

function parseLocationPayload(rawValue: string) {
  if (!/^geo:/i.test(rawValue)) {
    return null;
  }

  const payload = rawValue.replace(/^geo:/i, '');
  const [coordinatesPart = '', queryPart = ''] = payload.split('?');
  const [latitudeText = '', longitudeText = ''] = coordinatesPart.split(',');
  const params = new URLSearchParams(queryPart);
  const query = decodeQrComponent(params.get('q') || '');
  const latitude = parseCoordinate(latitudeText);
  const longitude = parseCoordinate(longitudeText);

  if (query) {
    return {
      query,
      ...(latitude === 0 && longitude === 0
        ? {}
        : {
            latitude,
            longitude,
          }),
    };
  }

  if (latitude !== null && longitude !== null) {
    return {
      latitude,
      longitude,
    };
  }

  return null;
}

function parseWhatsAppPayload(rawValue: string) {
  if (/^https?:\/\/wa\.me\//i.test(rawValue) || /^https?:\/\/(?:www\.)?api\.whatsapp\.com\/send/i.test(rawValue)) {
    try {
      const parsedUrl = new URL(rawValue);
      const pathPhone = parsedUrl.pathname.replace(/^\/+/, '').trim();
      const phone = digitsOnly(decodeQrComponent(pathPhone || parsedUrl.searchParams.get('phone') || ''));
      const message = decodeQrComponent(parsedUrl.searchParams.get('text') || parsedUrl.searchParams.get('message') || '');

      if (!phone && !message) {
        return null;
      }

      return {
        phone,
        message,
        url: rawValue,
      };
    } catch {
      return null;
    }
  }

  if (!/^whatsapp:/i.test(rawValue)) {
    return null;
  }

  const payload = rawValue.replace(/^whatsapp:/i, '');
  const params = new URLSearchParams(payload.replace(/^\?/, ''));
  const phone = digitsOnly(decodeQrComponent(params.get('phone') || ''));
  const message = decodeQrComponent(params.get('text') || params.get('message') || '');

  if (!phone && !message) {
    return null;
  }

  return {
    phone,
    message,
    url: rawValue,
  };
}

function parseUrlPayload(rawValue: string): QRCodeData | null {
  if (!/^https?:\/\//i.test(rawValue)) {
    return null;
  }

  try {
    const parsedUrl = new URL(rawValue);
    const storeType = parseStoreUrl(parsedUrl);

    if (storeType) {
      return {
        type: storeType,
        data: { url: rawValue },
        rawValue,
      };
    }

    const mapsLocation = parseMapsUrl(parsedUrl);

    if (mapsLocation) {
      return {
        type: 'location',
        data: {
          ...mapsLocation,
          url: rawValue,
        },
        rawValue,
      };
    }

    return {
      type: 'url',
      data: { url: rawValue },
      rawValue,
    };
  } catch {
    return {
      type: 'text',
      data: { text: rawValue },
      rawValue,
    };
  }
}

function parseMapsUrl(parsedUrl: URL) {
  const hostname = parsedUrl.hostname.toLowerCase();

  if (
    !hostname.includes('google.') &&
    !hostname.includes('maps.apple.com') &&
    hostname !== 'maps.app.goo.gl' &&
    hostname !== 'goo.gl'
  ) {
    return null;
  }

  if (hostname === 'maps.app.goo.gl' || hostname === 'goo.gl') {
    return {
      url: parsedUrl.toString(),
      query: 'Google Maps Link',
    };
  }

  const query = decodeQrComponent(
    parsedUrl.searchParams.get('query') ||
      parsedUrl.searchParams.get('q') ||
      ''
  );
  const ll = parsedUrl.searchParams.get('ll') || parsedUrl.searchParams.get('sll') || '';

  if (query) {
    return { query };
  }

  if (!ll) {
    return null;
  }

  const [latitudeText = '', longitudeText = ''] = ll.split(',');
  const latitude = parseCoordinate(latitudeText);
  const longitude = parseCoordinate(longitudeText);

  if (latitude !== null && longitude !== null) {
    return {
      latitude,
      longitude,
    };
  }

  return null;
}

function parseStoreUrl(parsedUrl: URL) {
  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname = parsedUrl.pathname.toLowerCase();

  if (hostname.includes('play.google.com') && pathname.startsWith('/store/apps/details')) {
    return 'play-store' as const;
  }

  if (hostname.includes('apps.apple.com') && pathname.startsWith('/')) {
    return 'app-store' as const;
  }

  return null;
}

function getStructuredValue(payload: string, key: string) {
  const match = payload.match(new RegExp(`(?:^|;)${key}:((?:\\\\.|[^;])*)`, 'i'));
  return match?.[1] || '';
}

function getLineValue(lines: string[], label: string) {
  const lowerLabel = label.toLowerCase();
  const line = lines.find(
    (entry) =>
      entry.toLowerCase().startsWith(`${lowerLabel}:`) ||
      entry.toLowerCase().startsWith(`${lowerLabel};`)
  );

  if (!line) {
    return '';
  }

  const separatorIndex = line.indexOf(':');

  if (separatorIndex === -1) {
    return '';
  }

  return decodeQrComponent(line.slice(separatorIndex + 1));
}

function splitStructuredLines(rawValue: string) {
  return normalizeStructuredRawValue(rawValue)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeStructuredRawValue(rawValue: string) {
  if (rawValue.includes('\n') || rawValue.includes('\r')) {
    return rawValue;
  }

  if (rawValue.includes('\\n')) {
    return rawValue.replace(/\\n/g, '\n');
  }

  return rawValue;
}

function normalizeWifiSecurity(value: string) {
  const normalized = value.toUpperCase();

  if (!normalized || normalized === 'NOPASS' || normalized === 'NONE') {
    return 'None';
  }

  if (normalized === 'WEP') {
    return 'WEP';
  }

  return 'WPA';
}

function unescapeStructuredValue(value: string) {
  return value
    .replace(/\\;/g, ';')
    .replace(/\\:/g, ':')
    .replace(/\\\\/g, '\\');
}

function decodeQrComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, '');
}

function formatVCardAddress(value: string) {
  return value
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(', ');
}

function looksLikePhoneNumber(rawValue: string) {
  const digits = rawValue.replace(/[^\d]/g, '');
  return (
    digits.length >= 7 &&
    digits.length <= 15 &&
    /^[+\d().\-\s]+$/.test(rawValue) &&
    /[+\-().\s]/.test(rawValue)
  );
}

function parseCoordinate(value: string) {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCalendarDisplay(value: string) {
  const compact = value.replace(/[^\d]/g, '');

  if (compact.length < 8) {
    return value;
  }

  const year = compact.slice(0, 4);
  const month = compact.slice(4, 6);
  const day = compact.slice(6, 8);

  if (compact.length >= 12) {
    const hours = compact.slice(8, 10);
    const minutes = compact.slice(10, 12);
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  return `${year}-${month}-${day}`;
}
