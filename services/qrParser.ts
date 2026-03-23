import { ScanType, QRCodeData } from '../constants/types';

export function parseQRCode(rawValue: string): QRCodeData {
  // URL detection
  if (rawValue.match(/^https?:\/\//i)) {
    return {
      type: 'url',
      data: { url: rawValue },
      rawValue,
    };
  }

  // WiFi detection: WIFI:T:WPA;S:MyNetwork;P:MyPassword;;
  if (rawValue.startsWith('WIFI:')) {
    const wifiMatch = rawValue.match(/WIFI:T:(WPA|WEP|nopass);S:([^;]+);P:([^;]*);/);
    if (wifiMatch) {
      return {
        type: 'wifi',
        data: {
          security: wifiMatch[1] === 'nopass' ? 'None' : wifiMatch[1],
          ssid: wifiMatch[2],
          password: wifiMatch[3] || '',
        },
        rawValue,
      };
    }
  }

  // Email detection: mailto:email@example.com?subject=Hello&body=World
  if (rawValue.startsWith('mailto:')) {
    const emailMatch = rawValue.match(/^mailto:([^?]+)(?:\?subject=([^&]+))?(?:&body=(.+))?/);
    if (emailMatch) {
      return {
        type: 'email',
        data: {
          email: emailMatch[1],
          subject: emailMatch[2] || '',
          body: emailMatch[3] || '',
        },
        rawValue,
      };
    }
  }

  // Phone detection: tel:+1234567890
  if (rawValue.startsWith('tel:')) {
    return {
      type: 'phone',
      data: { phone: rawValue.replace('tel:', '') },
      rawValue,
    };
  }

  // SMS detection: sms:+1234567890?body=Hello
  if (rawValue.startsWith('sms:')) {
    const smsMatch = rawValue.match(/^sms:([^?]+)(?:\?body=(.+))?/);
    if (smsMatch) {
      return {
        type: 'sms',
        data: {
          phone: smsMatch[1],
          body: smsMatch[2] || '',
        },
        rawValue,
      };
    }
  }

  // vCard detection (simplified)
  if (rawValue.startsWith('BEGIN:VCARD')) {
    const nameMatch = rawValue.match(/FN:(.+)/);
    const phoneMatch = rawValue.match(/TEL:(.+)/);
    const emailMatch = rawValue.match(/EMAIL:(.+)/);
    const orgMatch = rawValue.match(/ORG:(.+)/);

    return {
      type: 'vcard',
      data: {
        firstName: nameMatch ? nameMatch[1].split(' ')[0] : '',
        lastName: nameMatch ? nameMatch[1].split(' ').slice(1).join(' ') : '',
        phone: phoneMatch ? phoneMatch[1] : '',
        email: emailMatch ? emailMatch[1] : '',
        company: orgMatch ? orgMatch[1] : '',
      },
      rawValue,
    };
  }

  // Location detection: geo:37.7749,-122.4194
  if (rawValue.startsWith('geo:')) {
    const geoMatch = rawValue.match(/^geo:([^,]+),([^,]+)/);
    if (geoMatch) {
      return {
        type: 'location',
        data: {
          latitude: parseFloat(geoMatch[1]),
          longitude: parseFloat(geoMatch[2]),
        },
        rawValue,
      };
    }
  }

  // Barcode detection (numeric-only, typical product codes)
  if (/^\d{8,14}$/.test(rawValue)) {
    return {
      type: 'barcode',
      data: { barcode: rawValue },
      rawValue,
    };
  }

  // Default to text
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
    
    case 'wifi':
      const security = data.security === 'None' ? 'nopass' : data.security;
      return `WIFI:T:${security};S:${data.ssid};P:${data.password};;`;
    
    case 'email':
      let email = `mailto:${data.email}`;
      const params = [];
      if (data.subject) params.push(`subject=${encodeURIComponent(data.subject)}`);
      if (data.body) params.push(`body=${encodeURIComponent(data.body)}`);
      if (params.length > 0) email += `?${params.join('&')}`;
      return email;
    
    case 'phone':
      return `tel:${data.phone}`;
    
    case 'sms':
      let sms = `sms:${data.phone}`;
      if (data.body) sms += `?body=${encodeURIComponent(data.body)}`;
      return sms;
    
    case 'vcard':
      const vcard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${data.firstName} ${data.lastName}`,
        `TEL:${data.phone}`,
        `EMAIL:${data.email}`,
        `ORG:${data.company}`,
        'END:VCARD',
      ];
      return vcard.join('\n');
    
    case 'location':
      return `geo:${data.latitude},${data.longitude}`;
    
    case 'barcode':
      return data.barcode;
    
    case 'text':
    default:
      return data.text;
  }
}
