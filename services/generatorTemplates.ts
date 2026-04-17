import type { TextInputProps } from 'react-native';
import { generateQRCode, parseQRCode } from './qrParser';
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
  | 'custom-data'
  | 'ean-13'
  | 'ean-8'
  | 'upc-a'
  | 'code-128'
  | 'code-39'
  | 'itf-14'
  | 'code-93'
  | 'pharmacode'
  | 'msi-plesey'
  | 'codabar';

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

export interface GeneratorQuickStartSuggestion {
  templateId: GeneratorTemplateId;
  values: Record<string, string>;
  title: string;
  subtitle: string;
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
    description: 'Open a place or address in Maps. You can paste plain text like an address, or a full Google Maps or Apple Maps URL.',
    fields: [
      {
        key: 'query',
        label: 'Location or Maps URL',
        placeholder: 'Coffee shop near Alexanderplatz or https://maps.google.com/...',
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
  {
    id: 'ean-13',
    title: 'EAN-13',
    description: 'Generate a 13-digit European Article Number barcode for retail products.',
    fields: [
      {
        key: 'barcode',
        label: 'Barcode (12 digits)',
        placeholder: '590123412345',
        keyboardType: 'number-pad',
      },
    ],
  },
  {
    id: 'ean-8',
    title: 'EAN-8',
    description: 'Generate an 8-digit EAN barcode for small retail products.',
    fields: [
      {
        key: 'barcode',
        label: 'Barcode (7 digits)',
        placeholder: '5901234',
        keyboardType: 'number-pad',
      },
    ],
  },
  {
    id: 'upc-a',
    title: 'UPC-A',
    description: 'Generate a 12-digit Universal Product Code barcode for retail items.',
    fields: [
      {
        key: 'barcode',
        label: 'Barcode (11 digits)',
        placeholder: '12345678901',
        keyboardType: 'number-pad',
      },
    ],
  },
  {
    id: 'code-128',
    title: 'Code 128',
    description: 'Generate a Code 128 barcode for alphanumeric data with high density.',
    fields: [
      {
        key: 'data',
        label: 'Data',
        placeholder: 'ABC123',
      },
    ],
  },
  {
    id: 'code-39',
    title: 'Code 39',
    description: 'Generate a Code 39 barcode for alphanumeric data (letters A-Z, digits 0-9).',
    fields: [
      {
        key: 'data',
        label: 'Data',
        placeholder: 'ABC123',
      },
    ],
  },
  {
    id: 'itf-14',
    title: 'ITF-14',
    description: 'Generate a 14-digit Interleaved 2 of 5 barcode for shipping containers.',
    fields: [
      {
        key: 'barcode',
        label: 'Barcode (13 digits)',
        placeholder: '1234567890123',
        keyboardType: 'number-pad',
      },
    ],
  },
  {
    id: 'code-93',
    title: 'Code 93',
    description: 'Generate a Code 93 barcode for alphanumeric data with higher density than Code 39.',
    fields: [
      {
        key: 'data',
        label: 'Data',
        placeholder: 'ABC123',
      },
    ],
  },
  {
    id: 'pharmacode',
    title: 'Pharmacode',
    description: 'Generate a Pharmacode barcode for pharmaceutical packaging (3-131070).',
    fields: [
      {
        key: 'barcode',
        label: 'Barcode (3-131070)',
        placeholder: '12345',
        keyboardType: 'number-pad',
      },
    ],
  },
  {
    id: 'msi-plesey',
    title: 'MSI Plessey',
    description: 'Generate an MSI Plessey barcode for numeric data.',
    fields: [
      {
        key: 'barcode',
        label: 'Barcode',
        placeholder: '123456',
        keyboardType: 'number-pad',
      },
    ],
  },
  {
    id: 'codabar',
    title: 'Codabar',
    description: 'Generate a Codabar barcode for alphanumeric data (A, B, C, D, 0-9, -, $, :, /, ., +).',
    fields: [
      {
        key: 'data',
        label: 'Data',
        placeholder: 'A12345B',
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

export function getGeneratorTemplateSummary(
  templateId: GeneratorTemplateId,
  values: Record<string, string>
) {
  switch (templateId) {
    case 'website':
    case 'youtube':
    case 'app-store':
    case 'play-store':
    case 'discord':
      return truncateSummary(values.url || values.inviteUrl || '', 52);
    case 'plain-text':
    case 'custom-data':
      return truncateSummary(values.text || values.content || '', 52);
    case 'phone':
    case 'sms':
    case 'whatsapp':
      return truncateSummary(values.phone || '', 52);
    case 'email':
      return truncateSummary(values.email || '', 52);
    case 'wifi':
      return truncateSummary(values.ssid || 'Wi-Fi network', 52);
    case 'contact': {
      const fullName = [values.firstName, values.lastName].filter(Boolean).join(' ').trim();
      return truncateSummary(fullName || values.company || 'Business contact', 52);
    }
    case 'location':
      return truncateSummary(
        [values.latitude, values.longitude].filter(Boolean).join(', ') || 'Coordinates',
        52
      );
    case 'maps-search':
      return truncateSummary(values.query || '', 52);
    case 'event':
      return truncateSummary(values.title || 'Calendar event', 52);
    case 'coupon':
      return truncateSummary(values.title || values.code || 'Coupon', 52);
    case 'bitcoin':
      return truncateSummary(values.label || values.address || 'Bitcoin request', 52);
    case 'paypal':
      return truncateSummary(values.username || 'PayPal payment', 52);
    case 'instagram':
    case 'linkedin':
    case 'tiktok':
    case 'x-profile':
      return truncateSummary(values.handle || '', 52);
    case 'telegram':
      return truncateSummary(values.username || '', 52);
    case 'facetime':
    case 'facetime-audio':
      return truncateSummary(values.target || '', 52);
    case 'product-code':
    case 'ean-13':
    case 'ean-8':
    case 'upc-a':
    case 'itf-14':
    case 'pharmacode':
    case 'msi-plesey':
      return truncateSummary(values.barcode || '', 52);
    case 'code-128':
    case 'code-39':
    case 'code-93':
    case 'codabar':
      return truncateSummary(values.data || '', 52);
    default: {
      const firstValue = Object.values(values).find((value) => value.trim().length > 0) || '';
      return truncateSummary(firstValue, 52);
    }
  }
}

export function suggestGeneratorSetupFromRawContent(rawContent: string): GeneratorQuickStartSuggestion | null {
  const trimmedContent = rawContent.trim();

  if (!trimmedContent) {
    return null;
  }

  const faceTimeSuggestion = suggestFaceTimeSetup(trimmedContent);
  if (faceTimeSuggestion) {
    return faceTimeSuggestion;
  }

  const bitcoinSuggestion = suggestBitcoinSetup(trimmedContent);
  if (bitcoinSuggestion) {
    return bitcoinSuggestion;
  }

  const parsed = parseQRCode(trimmedContent);

  switch (parsed.type) {
    case 'wifi':
      return {
        templateId: 'wifi',
        values: {
          ssid: parsed.data.ssid || '',
          password: parsed.data.password || '',
          security: parsed.data.security || 'WPA',
        },
        title: 'Clipboard detected a Wi-Fi network',
        subtitle: truncateSummary(parsed.data.ssid || 'Tap to prefill network details', 60),
      };
    case 'email':
      return {
        templateId: 'email',
        values: {
          email: parsed.data.email || '',
          subject: parsed.data.subject || '',
          body: parsed.data.body || '',
        },
        title: 'Clipboard detected an email draft',
        subtitle: truncateSummary(parsed.data.email || 'Tap to prefill the email form', 60),
      };
    case 'sms':
      return {
        templateId: 'sms',
        values: {
          phone: parsed.data.phone || '',
          body: parsed.data.body || '',
        },
        title: 'Clipboard detected an SMS message',
        subtitle: truncateSummary(parsed.data.phone || 'Tap to prefill the SMS form', 60),
      };
    case 'whatsapp':
      return {
        templateId: 'whatsapp',
        values: {
          phone: parsed.data.phone || '',
          message: parsed.data.message || '',
        },
        title: 'Clipboard detected a WhatsApp chat',
        subtitle: truncateSummary(parsed.data.phone || parsed.data.message || 'Tap to prefill the chat', 60),
      };
    case 'phone':
      return {
        templateId: 'phone',
        values: {
          phone: parsed.data.phone || '',
        },
        title: 'Clipboard detected a phone number',
        subtitle: truncateSummary(parsed.data.phone || 'Tap to prefill the call code', 60),
      };
    case 'vcard':
      return {
        templateId: 'contact',
        values: {
          firstName: parsed.data.firstName || '',
          lastName: parsed.data.lastName || '',
          company: parsed.data.company || '',
          jobTitle: parsed.data.jobTitle || '',
          phone: parsed.data.phone || '',
          email: parsed.data.email || '',
          website: parsed.data.website || '',
          address: parsed.data.address || '',
        },
        title: 'Clipboard detected a contact card',
        subtitle: truncateSummary(
          [parsed.data.firstName, parsed.data.lastName].filter(Boolean).join(' ').trim() ||
            parsed.data.company ||
            'Tap to prefill the contact form',
          60
        ),
      };
    case 'calendar':
      return {
        templateId: 'event',
        values: {
          title: parsed.data.title || '',
          start: parsed.data.start || '',
          end: parsed.data.end || '',
          location: parsed.data.location || '',
          description: parsed.data.description || '',
        },
        title: 'Clipboard detected a calendar event',
        subtitle: truncateSummary(parsed.data.title || 'Tap to prefill the event', 60),
      };
    case 'coupon':
      return {
        templateId: 'coupon',
        values: {
          title: parsed.data.title || '',
          code: parsed.data.code || '',
          details: parsed.data.details || '',
        },
        title: 'Clipboard detected a coupon',
        subtitle: truncateSummary(parsed.data.code || parsed.data.title || 'Tap to prefill the coupon', 60),
      };
    case 'location':
      if (parsed.data.query || parsed.data.url) {
        return {
          templateId: 'maps-search',
          values: {
            query: parsed.data.url || parsed.data.query || '',
          },
          title: 'Clipboard detected a map destination',
          subtitle: truncateSummary(parsed.data.query || parsed.data.url || 'Tap to prefill the map search', 60),
        };
      }

      return {
        templateId: 'location',
        values: {
          latitude: parsed.data.latitude !== undefined ? String(parsed.data.latitude) : '',
          longitude: parsed.data.longitude !== undefined ? String(parsed.data.longitude) : '',
        },
        title: 'Clipboard detected coordinates',
        subtitle: truncateSummary(
          [parsed.data.latitude, parsed.data.longitude].filter((value) => value !== undefined).join(', '),
          60
        ),
      };
    case 'play-store':
      return {
        templateId: 'play-store',
        values: { url: parsed.data.url || parsed.rawValue },
        title: 'Clipboard detected a Play Store link',
        subtitle: truncateSummary(parsed.data.url || parsed.rawValue, 60),
      };
    case 'app-store':
      return {
        templateId: 'app-store',
        values: { url: parsed.data.url || parsed.rawValue },
        title: 'Clipboard detected an App Store link',
        subtitle: truncateSummary(parsed.data.url || parsed.rawValue, 60),
      };
    case 'barcode':
      return {
        templateId: 'product-code',
        values: { barcode: parsed.data.barcode || parsed.rawValue },
        title: 'Clipboard detected a product code',
        subtitle: truncateSummary(parsed.data.barcode || parsed.rawValue, 60),
      };
    case 'text':
      return {
        templateId: 'plain-text',
        values: { text: parsed.rawValue },
        title: 'Clipboard detected plain text',
        subtitle: truncateSummary(parsed.rawValue, 60),
      };
    case 'url':
      return suggestUrlSetup(parsed.data.url || parsed.rawValue);
    default:
      return null;
  }
}

export function buildGeneratorContent(
  templateId: GeneratorTemplateId,
  values: Record<string, string>
) {
  switch (templateId) {
    case 'website':
      return generateQRCode('url', { url: normalizeGeneralUrl(required(values, 'url')) });
    case 'youtube':
      return generateQRCode('url', { url: normalizeYoutubeUrl(required(values, 'url')) });
    case 'app-store':
      return generateQRCode('url', { url: normalizeAppStoreUrl(required(values, 'url')) });
    case 'play-store':
      return generateQRCode('url', { url: normalizePlayStoreUrl(required(values, 'url')) });
    case 'discord':
      return generateQRCode('url', {
        url: normalizeDiscordInviteUrl(required(values, 'inviteUrl')),
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
        email: normalizeEmailAddress(required(values, 'email')),
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
      const username = normalizePayPalUsername(required(values, 'username'));
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
      return `facetime:${normalizeFaceTimeTarget(required(values, 'target'))}`;
    case 'facetime-audio':
      return `facetime-audio:${normalizeFaceTimeTarget(required(values, 'target'))}`;
    case 'instagram':
      return normalizeQrLinkInput(`instagram.com/${normalizeSocialHandle(required(values, 'handle'), 'Instagram')}`);
    case 'linkedin':
      return normalizeQrLinkInput(`www.linkedin.com/in/${normalizeLinkedInSlug(required(values, 'handle'))}`);
    case 'tiktok': {
      const handle = normalizeSocialHandle(required(values, 'handle'), 'TikTok');
      return normalizeQrLinkInput(`www.tiktok.com/@${handle}`);
    }
    case 'telegram':
      return normalizeQrLinkInput(`t.me/${normalizeTelegramUsername(required(values, 'username'))}`);
    case 'maps-search':
      return buildMapsSearchUrl(required(values, 'query'));
    case 'x-profile':
      return normalizeQrLinkInput(`x.com/${normalizeXHandle(required(values, 'handle'))}`);
    case 'custom-data':
      return required(values, 'content');
    case 'ean-13': {
      const barcode = required(values, 'barcode').replace(/\s+/g, '');
      if (!/^\d{12}$/.test(barcode)) {
        throw new Error('Enter a 12-digit EAN-13 barcode (checksum will be calculated).');
      }
      return generateQRCode('barcode', { barcode: calculateEAN13Checksum(barcode) });
    }
    case 'ean-8': {
      const barcode = required(values, 'barcode').replace(/\s+/g, '');
      if (!/^\d{7}$/.test(barcode)) {
        throw new Error('Enter a 7-digit EAN-8 barcode (checksum will be calculated).');
      }
      return generateQRCode('barcode', { barcode: calculateEAN8Checksum(barcode) });
    }
    case 'upc-a': {
      const barcode = required(values, 'barcode').replace(/\s+/g, '');
      if (!/^\d{11}$/.test(barcode)) {
        throw new Error('Enter an 11-digit UPC-A barcode (checksum will be calculated).');
      }
      return generateQRCode('barcode', { barcode: calculateUPAChecksum(barcode) });
    }
    case 'code-128': {
      const data = required(values, 'data').trim();
      if (!/^[A-Z0-9\s\-\.\$\/\+\%]+$/.test(data)) {
        throw new Error('Code 128 supports uppercase letters, digits, and special characters.');
      }
      return generateQRCode('barcode', { barcode: data, barcodeType: 'CODE_128' });
    }
    case 'code-39': {
      const data = required(values, 'data').trim().toUpperCase();
      if (!/^[A-Z0-9\-\.\ \$\/\+\%]+$/.test(data)) {
        throw new Error('Code 39 supports uppercase letters, digits, and special characters.');
      }
      return generateQRCode('barcode', { barcode: data, barcodeType: 'CODE_39' });
    }
    case 'itf-14': {
      const barcode = required(values, 'barcode').replace(/\s+/g, '');
      if (!/^\d{13}$/.test(barcode)) {
        throw new Error('Enter a 13-digit ITF-14 barcode (checksum will be calculated).');
      }
      return generateQRCode('barcode', { barcode: calculateITF14Checksum(barcode) });
    }
    case 'code-93': {
      const data = required(values, 'data').trim().toUpperCase();
      if (!/^[A-Z0-9\-\.\$\/\+\%\s]+$/.test(data)) {
        throw new Error('Code 93 supports uppercase letters, digits, and special characters.');
      }
      return generateQRCode('barcode', { barcode: data, barcodeType: 'CODE_93' });
    }
    case 'pharmacode': {
      const barcode = Number(required(values, 'barcode').replace(/\s+/g, ''));
      if (isNaN(barcode) || barcode < 3 || barcode > 131070) {
        throw new Error('Pharmacode must be a number between 3 and 131070.');
      }
      return generateQRCode('barcode', { barcode: barcode.toString(), barcodeType: 'PHARMA' });
    }
    case 'msi-plesey': {
      const barcode = required(values, 'barcode').replace(/\s+/g, '');
      if (!/^\d+$/.test(barcode)) {
        throw new Error('MSI Plessey supports only numeric data.');
      }
      return generateQRCode('barcode', { barcode, barcodeType: 'MSI' });
    }
    case 'codabar': {
      const data = required(values, 'data').trim().toUpperCase();
      if (!/^[A-D][0-9\-\$\:\/\.\+]*[A-D]$/.test(data)) {
        throw new Error('Codabar must start and end with A, B, C, or D, and contain only digits and special characters.');
      }
      return generateQRCode('barcode', { barcode: data, barcodeType: 'CODABAR' });
    }
    default:
      return required(values, 'content');
  }
}

function calculateEAN13Checksum(barcode: string): string {
  const digits = barcode.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return barcode + checksum;
}

function truncateSummary(value: string, maxLength: number) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 'Ready to reuse';
  }

  if (trimmedValue.length <= maxLength) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, maxLength - 1)}…`;
}

function suggestUrlSetup(urlValue: string): GeneratorQuickStartSuggestion {
  try {
    const parsedUrl = new URL(urlValue);
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

    if (hostname === 'paypal.me' || hostname === 'www.paypal.me') {
      return {
        templateId: 'paypal',
        values: {
          username: pathSegments[0] || '',
          amount: pathSegments[1] || '',
        },
        title: 'Clipboard detected a PayPal payment link',
        subtitle: truncateSummary(urlValue, 60),
      };
    }

    if (hostname === 'youtu.be' || hostname.endsWith('youtube.com')) {
      return {
        templateId: 'youtube',
        values: { url: urlValue },
        title: 'Clipboard detected a YouTube link',
        subtitle: truncateSummary(urlValue, 60),
      };
    }

    if (hostname === 'discord.gg' || hostname.endsWith('discord.com')) {
      return {
        templateId: 'discord',
        values: { inviteUrl: urlValue },
        title: 'Clipboard detected a Discord invite',
        subtitle: truncateSummary(urlValue, 60),
      };
    }

    if (hostname.endsWith('instagram.com') && pathSegments[0]) {
      return {
        templateId: 'instagram',
        values: { handle: pathSegments[0] },
        title: 'Clipboard detected an Instagram profile',
        subtitle: truncateSummary(`@${pathSegments[0].replace(/^@/, '')}`, 60),
      };
    }

    if (hostname.endsWith('linkedin.com') && (pathSegments[0] === 'in' || pathSegments[0] === 'company') && pathSegments[1]) {
      return {
        templateId: 'linkedin',
        values: { handle: pathSegments[1] },
        title: 'Clipboard detected a LinkedIn profile',
        subtitle: truncateSummary(pathSegments[1], 60),
      };
    }

    if (hostname.endsWith('tiktok.com') && pathSegments[0]?.startsWith('@')) {
      return {
        templateId: 'tiktok',
        values: { handle: pathSegments[0] },
        title: 'Clipboard detected a TikTok profile',
        subtitle: truncateSummary(pathSegments[0], 60),
      };
    }

    if ((hostname === 't.me' || hostname.endsWith('telegram.me')) && pathSegments[0]) {
      return {
        templateId: 'telegram',
        values: { username: pathSegments[0] },
        title: 'Clipboard detected a Telegram profile',
        subtitle: truncateSummary(pathSegments[0], 60),
      };
    }

    if ((hostname === 'x.com' || hostname === 'twitter.com' || hostname === 'www.twitter.com') && pathSegments[0]) {
      return {
        templateId: 'x-profile',
        values: { handle: pathSegments[0] },
        title: 'Clipboard detected an X profile',
        subtitle: truncateSummary(pathSegments[0], 60),
      };
    }

    return {
      templateId: 'website',
      values: { url: urlValue },
      title: 'Clipboard detected a website link',
      subtitle: truncateSummary(urlValue, 60),
    };
  } catch {
    return {
      templateId: 'website',
      values: { url: urlValue },
      title: 'Clipboard detected a website link',
      subtitle: truncateSummary(urlValue, 60),
    };
  }
}

function suggestFaceTimeSetup(rawContent: string): GeneratorQuickStartSuggestion | null {
  if (/^facetime-audio:/i.test(rawContent)) {
    return {
      templateId: 'facetime-audio',
      values: {
        target: rawContent.replace(/^facetime-audio:/i, '').trim(),
      },
      title: 'Clipboard detected a FaceTime Audio link',
      subtitle: truncateSummary(rawContent, 60),
    };
  }

  if (/^facetime:/i.test(rawContent)) {
    return {
      templateId: 'facetime',
      values: {
        target: rawContent.replace(/^facetime:/i, '').trim(),
      },
      title: 'Clipboard detected a FaceTime link',
      subtitle: truncateSummary(rawContent, 60),
    };
  }

  return null;
}

function suggestBitcoinSetup(rawContent: string): GeneratorQuickStartSuggestion | null {
  if (!/^bitcoin:/i.test(rawContent)) {
    return null;
  }

  const payload = rawContent.replace(/^bitcoin:/i, '').trim();
  const [address = '', queryString = ''] = payload.split('?');
  const params = new URLSearchParams(queryString);

  return {
    templateId: 'bitcoin',
    values: {
      address,
      amount: params.get('amount') || '',
      label: params.get('label') || '',
    },
    title: 'Clipboard detected a Bitcoin payment request',
    subtitle: truncateSummary(address || rawContent, 60),
  };
}

function calculateEAN8Checksum(barcode: string): string {
  const digits = barcode.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return barcode + checksum;
}

function calculateUPAChecksum(barcode: string): string {
  const digits = barcode.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return barcode + checksum;
}

function calculateITF14Checksum(barcode: string): string {
  const digits = barcode.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return barcode + checksum;
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

function normalizeGeneralUrl(value: string) {
  return normalizeQrLinkInput(value);
}

function normalizeYoutubeUrl(value: string) {
  const url = normalizeExpectedUrl(value, ['youtube.com', 'youtu.be'], 'Enter a valid YouTube link.');
  return url;
}

function normalizeDiscordInviteUrl(value: string) {
  const url = normalizeExpectedUrl(
    value,
    ['discord.gg', 'discord.com', 'www.discord.com'],
    'Enter a valid Discord invite link.'
  );
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname.toLowerCase();

  if (hostname === 'discord.gg') {
    return url;
  }

  if (!parsedUrl.pathname.toLowerCase().startsWith('/invite/')) {
    throw new Error('Use a Discord invite link from discord.gg or discord.com/invite/....');
  }

  return url;
}

function normalizePlayStoreUrl(value: string) {
  const url = normalizeExpectedUrl(
    value,
    ['play.google.com'],
    'Enter an official Google Play Store link.'
  );
  const parsedUrl = new URL(url);

  if (parsedUrl.pathname.toLowerCase() !== '/store/apps/details' || !parsedUrl.searchParams.get('id')) {
    throw new Error('Use a Google Play Store app link with an app id.');
  }

  return url;
}

function normalizeAppStoreUrl(value: string) {
  const url = normalizeExpectedUrl(
    value,
    ['apps.apple.com'],
    'Enter an official Apple App Store link.'
  );
  const parsedUrl = new URL(url);

  if (!/\/app\//i.test(parsedUrl.pathname)) {
    throw new Error('Use a valid App Store app link.');
  }

  return url;
}

function normalizeExpectedUrl(value: string, allowedDomains: string[], invalidMessage: string) {
  const url = normalizeQrLinkInput(value);
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname.toLowerCase();

  if (!allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
    throw new Error(invalidMessage);
  }

  return url;
}

function normalizeEmailAddress(value: string) {
  const email = value.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.');
  }

  return email;
}

function normalizeFaceTimeTarget(value: string) {
  const trimmedValue = value.trim();

  if (trimmedValue.includes('@')) {
    return normalizeEmailAddress(trimmedValue);
  }

  return normalizePhoneNumber(trimmedValue);
}

function normalizePayPalUsername(value: string) {
  const username = sanitizeHandle(value);

  if (looksLikeUrl(username) || username.includes('@') || !/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
    throw new Error('Enter a valid PayPal.Me username, not a full link or email address.');
  }

  return username;
}

function normalizeSocialHandle(value: string, label: string) {
  const handle = sanitizeHandle(value);

  if (looksLikeUrl(handle) || handle.includes('@') || looksLikeEmail(handle) || looksLikeRawPhone(handle)) {
    throw new Error(`Enter a valid ${label} handle, not a link, email address, or phone number.`);
  }

  if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle)) {
    throw new Error(`Enter a valid ${label} handle using letters, numbers, dots, or underscores.`);
  }

  return handle;
}

function normalizeLinkedInSlug(value: string) {
  const slug = sanitizeHandle(value);

  if (looksLikeUrl(slug) || looksLikeEmail(slug) || looksLikeRawPhone(slug)) {
    throw new Error('Enter a LinkedIn profile slug, not a full link, email address, or phone number.');
  }

  if (!/^[a-zA-Z0-9-]{3,100}$/.test(slug)) {
    throw new Error('Enter a valid LinkedIn slug using letters, numbers, and hyphens.');
  }

  return slug;
}

function normalizeTelegramUsername(value: string) {
  const username = sanitizeHandle(value);

  if (looksLikeUrl(username) || username.includes('@') || looksLikeEmail(username) || looksLikeRawPhone(username)) {
    throw new Error('Enter a Telegram username, not a full link, email address, or phone number.');
  }

  if (!/^[a-zA-Z0-9_]{5,32}$/.test(username)) {
    throw new Error('Enter a valid Telegram username using letters, numbers, or underscores.');
  }

  return username;
}

function normalizeXHandle(value: string) {
  const handle = sanitizeHandle(value);

  if (looksLikeUrl(handle) || handle.includes('@') || looksLikeEmail(handle) || looksLikeRawPhone(handle)) {
    throw new Error('Enter an X handle, not a full link, email address, or phone number.');
  }

  if (!/^[a-zA-Z0-9_]{1,15}$/.test(handle)) {
    throw new Error('Enter a valid X handle using letters, numbers, or underscores.');
  }

  return handle;
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
  if (optional(values, 'email')) lines.push(`EMAIL:${normalizeEmailAddress(optional(values, 'email'))}`);
  if (optional(values, 'website')) lines.push(`URL:${normalizeGeneralUrl(optional(values, 'website'))}`);
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

function buildMapsSearchUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error('Enter a location, address, or maps URL.');
  }

  if (looksLikeUrl(trimmedValue)) {
    const normalizedUrlCandidate = normalizeQrLinkInput(trimmedValue);
    const parsedUrl = new URL(normalizedUrlCandidate);

    if (!isOfficialMapsHostname(parsedUrl.hostname)) {
      throw new Error('Use an official Google Maps or Apple Maps link, or plain location text.');
    }

    const extractedLocation = extractLocationFromMapsUrl(parsedUrl);

    if (extractedLocation.kind === 'short-link') {
      return normalizedUrlCandidate;
    }

    if (extractedLocation.kind === 'query') {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(extractedLocation.query)}`;
    }

    if (extractedLocation.kind === 'coordinates') {
      return `https://www.google.com/maps/search/?api=1&query=${extractedLocation.latitude},${extractedLocation.longitude}`;
    }

    return normalizedUrlCandidate;
  }

  if (trimmedValue.length > 40) {
    throw new Error('Plain text map searches must be 40 characters or fewer.');
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmedValue)}`;
}

function extractLocationFromMapsUrl(url: URL):
  | { kind: 'query'; query: string }
  | { kind: 'coordinates'; latitude: string; longitude: string }
  | { kind: 'short-link' }
  | { kind: 'unknown' } {
  const hostname = url.hostname.toLowerCase();
  const pathname = decodeURIComponent(url.pathname);

  if (hostname === 'maps.app.goo.gl' || hostname === 'goo.gl') {
    return { kind: 'short-link' };
  }

  const queryParam = firstNonEmpty(
    url.searchParams.get('query'),
    url.searchParams.get('q'),
    url.searchParams.get('destination'),
    url.searchParams.get('daddr'),
    url.searchParams.get('address')
  );

  if (queryParam) {
    return { kind: 'query', query: queryParam };
  }

  const coordinateParam = firstNonEmpty(
    url.searchParams.get('ll'),
    url.searchParams.get('sll'),
    url.searchParams.get('center')
  );

  if (coordinateParam) {
    const coordinates = parseCoordinatePair(coordinateParam);
    if (coordinates) {
      return { kind: 'coordinates', ...coordinates };
    }
  }

  const atMatch = pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    return {
      kind: 'coordinates',
      latitude: atMatch[1],
      longitude: atMatch[2],
    };
  }

  const placeMatch = pathname.match(/\/place\/([^/]+)/i);
  if (placeMatch) {
    return {
      kind: 'query',
      query: placeMatch[1].replace(/\+/g, ' '),
    };
  }

  return { kind: 'unknown' };
}

function isOfficialMapsHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();

  return (
    normalizedHostname === 'maps.app.goo.gl' ||
    normalizedHostname === 'goo.gl' ||
    normalizedHostname === 'maps.apple.com' ||
    normalizedHostname.includes('google.')
  );
}

function looksLikeUrl(value: string) {
  const trimmedValue = value.trim();

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmedValue) || /^www\./i.test(trimmedValue)) {
    return true;
  }

  if (/\s/.test(trimmedValue)) {
    return false;
  }

  return /^[^\s/]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(trimmedValue);
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function looksLikeRawPhone(value: string) {
  const compactValue = value.replace(/[()\-\s/+]/g, '');
  return /^\d{6,}$/.test(compactValue);
}

function firstNonEmpty(...values: Array<string | null>) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() || '';
}

function parseCoordinatePair(value: string) {
  const [latitude, longitude] = value.split(',').map((segment) => segment.trim());

  if (!latitude || !longitude) {
    return null;
  }

  if (!/^-?\d+(?:\.\d+)?$/.test(latitude) || !/^-?\d+(?:\.\d+)?$/.test(longitude)) {
    return null;
  }

  return { latitude, longitude };
}
