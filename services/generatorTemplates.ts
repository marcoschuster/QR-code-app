import type { TextInputProps } from 'react-native';
import { generateQRCode } from './qrParser';
import { normalizeQrLinkInput } from './qrCodeImage';

export type GeneratorTemplateId =
  | 'website'
  | 'plain-text'
  | 'phone'
  | 'sms'
  | 'email'
  | 'wifi'
  | 'contact'
  | 'location'
  | 'event'
  | 'product-code'
  | 'coupon'
  | 'paypal'
  | 'bitcoin'
  | 'whatsapp'
  | 'facetime'
  | 'facetime-audio'
  | 'youtube'
  | 'instagram'
  | 'linkedin'
  | 'tiktok'
  | 'telegram'
  | 'discord'
  | 'app-store'
  | 'play-store'
  | 'maps-search'
  | 'x-profile'
  | 'custom-data';

export interface GeneratorFieldOption {
  label: string;
  value: string;
}

export interface GeneratorField {
  key: string;
  label: string;
  placeholder: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  multiline?: boolean;
  defaultValue?: string;
  options?: GeneratorFieldOption[];
}

export interface GeneratorTemplate {
  id: GeneratorTemplateId;
  title: string;
  description: string;
  fields: GeneratorField[];
}

const WIFI_SECURITY_OPTIONS: GeneratorFieldOption[] = [
  { label: 'WPA / WPA2', value: 'WPA' },
  { label: 'WEP (Older)', value: 'WEP' },
  { label: 'None (Open)', value: 'None' },
];

export const GENERATOR_TEMPLATES: GeneratorTemplate[] = [
  {
    id: 'website',
    title: 'Website Link',
    description: 'Turn any website or landing page into a QR code.',
    fields: [
      {
        key: 'url',
        label: 'Website URL',
        placeholder: 'example.com or https://example.com',
        keyboardType: 'url',
        autoCapitalize: 'none',
      },
    ],
  },
  {
    id: 'plain-text',
    title: 'Plain Text',
    description: 'Share any free-form text, note, or message.',
    fields: [
      {
        key: 'text',
        label: 'Text',
        placeholder: 'Enter any text',
        multiline: true,
      },
    ],
  },
  {
    id: 'phone',
    title: 'Phone Number',
    description: 'Launch a call directly from the generated code.',
    fields: [
      {
        key: 'phone',
        label: 'Phone Number',
        placeholder: '+49 69 123456 or 069 123456',
        keyboardType: 'phone-pad',
      },
    ],
  },
  {
    id: 'sms',
    title: 'SMS Message',
    description: 'Prefill a text message and recipient number.',
    fields: [
      {
        key: 'phone',
        label: 'Phone Number',
        placeholder: '+49 69 123456 or 069 123456',
        keyboardType: 'phone-pad',
      },
      {
        key: 'body',
        label: 'Message',
        placeholder: 'Type the SMS text',
        multiline: true,
      },
    ],
  },
  {
    id: 'email',
    title: 'Email',
    description: 'Open a new email draft with subject and body.',
    fields: [
      {
        key: 'email',
        label: 'Email Address',
        placeholder: 'hello@example.com',
        keyboardType: 'email-address',
        autoCapitalize: 'none',
      },
      {
        key: 'subject',
        label: 'Subject',
        placeholder: 'Message subject',
      },
      {
        key: 'body',
        label: 'Body',
        placeholder: 'Email body',
        multiline: true,
      },
    ],
  },
  {
    id: 'wifi',
    title: 'Wi-Fi Network',
    description: 'Let people join a network without typing the password. WPA/WPA2 is the normal modern option, WEP is older and weaker, and None is for open networks without a password.',
    fields: [
      {
        key: 'ssid',
        label: 'Network Name',
        placeholder: 'Office WiFi',
      },
      {
        key: 'password',
        label: 'Password',
        placeholder: 'Wi-Fi password',
      },
      {
        key: 'security',
        label: 'Security',
        placeholder: 'Select security',
        defaultValue: 'WPA',
        options: WIFI_SECURITY_OPTIONS,
      },
    ],
  },
  {
    id: 'contact',
    title: 'Business Contact',
    description: 'Create a full contact card with company details.',
    fields: [
      { key: 'firstName', label: 'First Name', placeholder: 'John' },
      { key: 'lastName', label: 'Last Name', placeholder: 'Doe' },
      { key: 'company', label: 'Company', placeholder: 'Acme Inc.' },
      { key: 'jobTitle', label: 'Job Title', placeholder: 'Sales Director' },
      {
        key: 'phone',
        label: 'Phone',
        placeholder: '+49 69 123456 or 069 123456',
        keyboardType: 'phone-pad',
      },
      {
        key: 'email',
        label: 'Email',
        placeholder: 'john@example.com',
        keyboardType: 'email-address',
        autoCapitalize: 'none',
      },
      {
        key: 'website',
        label: 'Website',
        placeholder: 'example.com',
        keyboardType: 'url',
        autoCapitalize: 'none',
      },
      {
        key: 'address',
        label: 'Address',
        placeholder: 'Street, city, zip, country',
        multiline: true,
      },
    ],
  },
  {
    id: 'location',
    title: 'Location Pin',
    description: 'Open a specific map coordinate.',
    fields: [
      {
        key: 'latitude',
        label: 'Latitude',
        placeholder: '52.5200',
        keyboardType: 'numeric',
      },
      {
        key: 'longitude',
        label: 'Longitude',
        placeholder: '13.4050',
        keyboardType: 'numeric',
      },
    ],
  },
  {
    id: 'event',
    title: 'Calendar Event',
    description: 'Create an event invite in calendar-compatible format.',
    fields: [
      { key: 'title', label: 'Event Title', placeholder: 'Annual Meetup' },
      {
        key: 'start',
        label: 'Start',
        placeholder: 'YY/MM/DD 18:30 or today',
      },
      {
        key: 'end',
        label: 'End',
        placeholder: 'YY/MM/DD 21:00 or tomorrow',
      },
      { key: 'location', label: 'Location', placeholder: 'Berlin HQ' },
      {
        key: 'description',
        label: 'Description',
        placeholder: 'Agenda, notes, or event details',
        multiline: true,
      },
    ],
  },
  {
    id: 'product-code',
    title: 'Product Code',
    description: 'Store a numeric product or inventory code.',
    fields: [
      {
        key: 'barcode',
        label: 'Product Code',
        placeholder: '5901234123457',
        keyboardType: 'number-pad',
      },
    ],
  },
  {
    id: 'coupon',
    title: 'Coupon',
    description: 'Share a coupon or promo code with quick redemption details.',
    fields: [
      { key: 'title', label: 'Offer Title', placeholder: 'Spring Discount' },
      { key: 'code', label: 'Coupon Code', placeholder: 'SPRING20' },
      {
        key: 'details',
        label: 'Details',
        placeholder: 'Valid until May 31. Applies to all items.',
        multiline: true,
      },
    ],
  },
  {
    id: 'paypal',
    title: 'PayPal.Me',
    description: 'Open a PayPal payment link quickly.',
    fields: [
      { key: 'username', label: 'PayPal Username', placeholder: 'yourname' },
      {
        key: 'amount',
        label: 'Amount',
        placeholder: '25.00',
        keyboardType: 'decimal-pad',
      },
    ],
  },
  {
    id: 'bitcoin',
    title: 'Bitcoin Address',
    description: 'Generate a Bitcoin payment request.',
    fields: [
      { key: 'address', label: 'Wallet Address', placeholder: 'bc1q...' },
      {
        key: 'amount',
        label: 'Amount',
        placeholder: '0.005',
        keyboardType: 'decimal-pad',
      },
      { key: 'label', label: 'Label', placeholder: 'Invoice #42' },
    ],
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Chat',
    description: 'Open a WhatsApp conversation with an optional message.',
    fields: [
      {
        key: 'phone',
        label: 'Phone Number',
        placeholder: '+49 69 123456 or 069 123456',
        keyboardType: 'phone-pad',
      },
      {
        key: 'message',
        label: 'Message',
        placeholder: 'Hello there',
        multiline: true,
      },
    ],
  },
  {
    id: 'facetime',
    title: 'FaceTime Call',
    description: 'Open a FaceTime call for a phone number or email.',
    fields: [
      {
        key: 'target',
        label: 'Phone or Email',
        placeholder: '+49 123 456789 or user@example.com',
      },
    ],
  },
  {
    id: 'facetime-audio',
    title: 'FaceTime Audio',
    description: 'Open a FaceTime audio call.',
    fields: [
      {
        key: 'target',
        label: 'Phone or Email',
        placeholder: '+49 123 456789 or user@example.com',
      },
    ],
  },
  {
    id: 'youtube',
    title: 'YouTube Link',
    description: 'Share a channel, short link, or specific video.',
    fields: [
      {
        key: 'url',
        label: 'YouTube URL',
        placeholder: 'youtube.com/watch?v=...',
        keyboardType: 'url',
        autoCapitalize: 'none',
      },
    ],
  },
  {
    id: 'instagram',
    title: 'Instagram Profile',
    description: 'Open an Instagram account directly.',
    fields: [
      { key: 'handle', label: 'Instagram Handle', placeholder: '@yourbrand' },
    ],
  },
  {
    id: 'linkedin',
    title: 'LinkedIn Profile',
    description: 'Share a LinkedIn personal or company slug.',
    fields: [
      { key: 'handle', label: 'LinkedIn Slug', placeholder: 'john-doe-123456' },
    ],
  },
  {
    id: 'tiktok',
    title: 'TikTok Profile',
    description: 'Open a TikTok creator profile.',
    fields: [
      { key: 'handle', label: 'TikTok Handle', placeholder: '@creatorname' },
    ],
  },
  {
    id: 'telegram',
    title: 'Telegram',
    description: 'Open a Telegram username or public channel.',
    fields: [
      { key: 'username', label: 'Telegram Username', placeholder: '@channelname' },
    ],
  },
  {
    id: 'discord',
    title: 'Discord Invite',
    description: 'Share a Discord invite or server link.',
    fields: [
      {
        key: 'inviteUrl',
        label: 'Invite URL',
        placeholder: 'discord.gg/yourinvite',
        keyboardType: 'url',
        autoCapitalize: 'none',
      },
    ],
  },
  {
    id: 'app-store',
    title: 'App Store',
    description: 'Link directly to an iOS app listing.',
    fields: [
      {
        key: 'url',
        label: 'App Store URL',
        placeholder: 'apps.apple.com/app/...',
        keyboardType: 'url',
        autoCapitalize: 'none',
      },
    ],
  },
  {
    id: 'play-store',
    title: 'Play Store',
    description: 'Link directly to an Android app listing.',
    fields: [
      {
        key: 'url',
        label: 'Play Store URL',
        placeholder: 'play.google.com/store/apps/details?...',
        keyboardType: 'url',
        autoCapitalize: 'none',
      },
    ],
  },
  {
    id: 'maps-search',
    title: 'Map Search',
    description: 'Search for any place or address in Google Maps.',
    fields: [
      {
        key: 'query',
        label: 'Search Query',
        placeholder: 'Coffee shop near Alexanderplatz',
      },
    ],
  },
  {
    id: 'x-profile',
    title: 'X Profile',
    description: 'Open an X account directly.',
    fields: [
      { key: 'handle', label: 'X Handle', placeholder: '@username' },
    ],
  },
  {
    id: 'custom-data',
    title: 'Custom Data',
    description: 'Paste any raw content exactly as it should be encoded.',
    fields: [
      {
        key: 'content',
        label: 'Raw Content',
        placeholder: 'Paste any content',
        multiline: true,
      },
    ],
  },
];

export function getGeneratorTemplate(templateId: GeneratorTemplateId) {
  return GENERATOR_TEMPLATES.find((template) => template.id === templateId) ?? GENERATOR_TEMPLATES[0];
}

export function createInitialGeneratorValues(templateId: GeneratorTemplateId) {
  const template = getGeneratorTemplate(templateId);

  return template.fields.reduce((acc, field) => {
    acc[field.key] = field.defaultValue ?? '';
    return acc;
  }, {} as Record<string, string>);
}

export function buildGeneratorContent(
  templateId: GeneratorTemplateId,
  values: Record<string, string>
) {
  switch (templateId) {
    case 'website':
    case 'youtube':
    case 'app-store':
    case 'play-store':
      return generateQRCode('url', { url: normalizeQrLinkInput(required(values, 'url')) });
    case 'discord':
      return generateQRCode('url', {
        url: normalizeQrLinkInput(required(values, 'inviteUrl')),
      });
    case 'plain-text':
      return generateQRCode('text', { text: required(values, 'text') });
    case 'phone':
      return generateQRCode('phone', { phone: normalizePhoneNumber(required(values, 'phone')) });
    case 'sms':
      return generateQRCode('sms', {
        phone: normalizePhoneNumber(required(values, 'phone')),
        body: optional(values, 'body'),
      });
    case 'email':
      return generateQRCode('email', {
        email: required(values, 'email'),
        subject: optional(values, 'subject'),
        body: optional(values, 'body'),
      });
    case 'wifi':
      return generateQRCode('wifi', {
        security: optional(values, 'security') || 'WPA',
        ssid: required(values, 'ssid'),
        password: optional(values, 'security') === 'None' ? '' : required(values, 'password'),
      });
    case 'contact':
      return buildVCard(values);
    case 'location':
      return generateQRCode('location', {
        latitude: parseCoordinate(values, 'latitude'),
        longitude: parseCoordinate(values, 'longitude'),
      });
    case 'event':
      return buildEvent(values);
    case 'product-code': {
      const barcode = required(values, 'barcode').replace(/\s+/g, '');
      if (!/^\d{8,14}$/.test(barcode)) {
        throw new Error('Enter a numeric product code with 8 to 14 digits.');
      }
      return generateQRCode('barcode', { barcode });
    }
    case 'coupon':
      return [
        `COUPON:${required(values, 'title')}`,
        `CODE:${required(values, 'code')}`,
        `DETAILS:${required(values, 'details')}`,
      ].join('\n');
    case 'paypal': {
      const username = sanitizeHandle(required(values, 'username'));
      const amount = optional(values, 'amount');
      return amount
        ? normalizeQrLinkInput(`paypal.me/${username}/${amount}`)
        : normalizeQrLinkInput(`paypal.me/${username}`);
    }
    case 'bitcoin': {
      const address = required(values, 'address');
      const params = new URLSearchParams();
      const amount = optional(values, 'amount');
      const label = optional(values, 'label');
      if (amount) params.append('amount', amount);
      if (label) params.append('label', label);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return `bitcoin:${address}${suffix}`;
    }
    case 'whatsapp': {
      const phone = digitsOnly(normalizePhoneNumber(required(values, 'phone')));
      const message = optional(values, 'message');
      return message
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/${phone}`;
    }
    case 'facetime':
      return `facetime:${required(values, 'target')}`;
    case 'facetime-audio':
      return `facetime-audio:${required(values, 'target')}`;
    case 'instagram':
      return normalizeQrLinkInput(`instagram.com/${sanitizeHandle(required(values, 'handle'))}`);
    case 'linkedin':
      return normalizeQrLinkInput(`www.linkedin.com/in/${sanitizeHandle(required(values, 'handle'))}`);
    case 'tiktok': {
      const handle = sanitizeHandle(required(values, 'handle'));
      return normalizeQrLinkInput(`www.tiktok.com/@${handle}`);
    }
    case 'telegram':
      return normalizeQrLinkInput(`t.me/${sanitizeHandle(required(values, 'username'))}`);
    case 'maps-search':
      return `geo:0,0?q=${encodeURIComponent(required(values, 'query'))}`;
    case 'x-profile':
      return normalizeQrLinkInput(`x.com/${sanitizeHandle(required(values, 'handle'))}`);
    case 'custom-data':
      return required(values, 'content');
    default:
      return required(values, 'content');
  }
}

function required(values: Record<string, string>, key: string) {
  const value = values[key]?.trim();

  if (!value) {
    throw new Error('Please fill in all required fields for this code type.');
  }

  return value;
}

function optional(values: Record<string, string>, key: string) {
  return values[key]?.trim() || '';
}

function sanitizeHandle(handle: string) {
  return handle.trim().replace(/^@+/, '').replace(/^\/+|\/+$/g, '');
}

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, '');
}

function parseCoordinate(values: Record<string, string>, key: string) {
  const value = Number(required(values, key).replace(',', '.'));

  if (!Number.isFinite(value)) {
    throw new Error('Enter valid latitude and longitude values.');
  }

  return value;
}

function buildVCard(values: Record<string, string>) {
  const firstName = required(values, 'firstName');
  const lastName = optional(values, 'lastName');
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${fullName}`,
    `N:${lastName};${firstName};;;`,
  ];

  if (optional(values, 'company')) lines.push(`ORG:${optional(values, 'company')}`);
  if (optional(values, 'jobTitle')) lines.push(`TITLE:${optional(values, 'jobTitle')}`);
  if (optional(values, 'phone')) lines.push(`TEL:${normalizePhoneNumber(optional(values, 'phone'))}`);
  if (optional(values, 'email')) lines.push(`EMAIL:${optional(values, 'email')}`);
  if (optional(values, 'website')) lines.push(`URL:${normalizeQrLinkInput(optional(values, 'website'))}`);
  if (optional(values, 'address')) lines.push(`ADR:;;${optional(values, 'address')};;;;`);

  lines.push('END:VCARD');

  return lines.join('\n');
}

function buildEvent(values: Record<string, string>) {
  const title = required(values, 'title');
  const start = formatIcsDate(required(values, 'start'));
  const end = formatIcsDate(required(values, 'end'));
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
  ];

  if (optional(values, 'location')) lines.push(`LOCATION:${optional(values, 'location')}`);
  if (optional(values, 'description')) lines.push(`DESCRIPTION:${optional(values, 'description')}`);

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\n');
}

function formatIcsDate(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error('Enter a start and end date for the calendar event.');
  }

  const relativeMatch = trimmedValue.match(/^(today|tomorrow)(?:\s+(\d{1,2}:\d{2}))?$/i);
  if (relativeMatch) {
    const baseDate = new Date();
    const normalizedKeyword = relativeMatch[1].toLowerCase();

    if (normalizedKeyword === 'tomorrow') {
      baseDate.setDate(baseDate.getDate() + 1);
    }

    const timePart = relativeMatch[2] || '00:00';
    return buildIcsDate(baseDate.getFullYear(), baseDate.getMonth() + 1, baseDate.getDate(), timePart);
  }

  const normalizedValue = trimmedValue.replace(/-/g, '/').replace(/\./g, '/');
  const match = normalizedValue.match(
    /^(\d{2}|\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}:\d{2}))?$/i
  );

  if (!match) {
    throw new Error('Use YY/MM/DD 18:30, YY/MM/DD, today, or tomorrow for calendar events.');
  }

  const year = match[1].length === 2 ? 2000 + Number(match[1]) : Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timePart = match[4] || '00:00';

  return buildIcsDate(year, month, day, timePart);
}

function buildIcsDate(year: number, month: number, day: number, timePart: string) {
  const [hoursText = '0', minutesText = '0'] = timePart.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const candidate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    throw new Error('Enter a valid calendar date.');
  }

  return [
    String(candidate.getFullYear()).padStart(4, '0'),
    String(candidate.getMonth() + 1).padStart(2, '0'),
    String(candidate.getDate()).padStart(2, '0'),
    'T',
    String(candidate.getHours()).padStart(2, '0'),
    String(candidate.getMinutes()).padStart(2, '0'),
    '00',
  ].join('');
}

function normalizePhoneNumber(value: string) {
  const trimmedValue = value.trim();
  const normalizedValue = trimmedValue
    .replace(/[()\-\s/]+/g, '')
    .replace(/^00/, '+');

  if (!/^\+?\d+$/.test(normalizedValue)) {
    throw new Error('Enter a valid phone number using digits, spaces, (), -, and an optional leading +.');
  }

  const digits = digitsOnly(normalizedValue);

  if (digits.length < 7 || digits.length > 15) {
    throw new Error('Enter a complete phone number with 7 to 15 digits.');
  }

  if (normalizedValue.startsWith('+')) {
    return `+${digits}`;
  }

  if (normalizedValue.startsWith('0')) {
    return normalizedValue;
  }

  throw new Error('Use a full number with +country code, or a local number starting with 0.');
}
