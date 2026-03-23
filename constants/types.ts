export type ScanType = 'url' | 'wifi' | 'email' | 'phone' | 'sms' | 'text' | 'vcard' | 'barcode' | 'location';

export interface HistoryItem {
  id: string;
  kind: 'scanned' | 'generated';
  type: ScanType;
  rawValue: string;
  parsedData: Record<string, any>;
  timestamp: number;
  thumbnailBase64?: string;
  safety: {
    checked: boolean;
    safe: boolean | null;
    threatType?: string;
    checkedAt?: number;
  };
}

export interface SafetyResult {
  safe: boolean;
  threatType?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface QRCodeData {
  type: ScanType;
  data: Record<string, any>;
  rawValue: string;
}

export interface ThemeColors {
  background: string;
  surface: string;
  accent: string;
  danger: string;
  success: string;
  warning: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  border: string;
  shadow: string;
}

export type AppearanceMode = 'light' | 'dark' | 'system';

export interface SettingsState {
  appearance: AppearanceMode;
  autoOpenUrls: boolean;
  saveToHistory: boolean;
  vibrateOnScan: boolean;
  beepOnScan: boolean;
  urlThreatScanning: boolean;
  defaultErrorCorrection: 'L' | 'M' | 'Q' | 'H';
  defaultOutputFormat: 'QR' | 'EAN-13' | 'Code 128';
}
