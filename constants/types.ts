export type ScanType =
  | 'url'
  | 'wifi'
  | 'email'
  | 'phone'
  | 'sms'
  | 'whatsapp'
  | 'text'
  | 'vcard'
  | 'barcode'
  | 'coupon'
  | 'location'
  | 'calendar'
  | 'app-store'
  | 'play-store';
export type ThreatCheckSource = 'google-safe-browsing' | 'heuristic';

export interface ScanSafetyState {
  checked: boolean;
  safe: boolean | null;
  threatType?: string;
  checkedAt?: number;
  confidence?: 'high' | 'medium' | 'low';
  source?: ThreatCheckSource;
  inProgress?: boolean;
  error?: string;
}

export interface HistoryItem {
  id: string;
  name?: string;
  isFavorite?: boolean;
  kind: 'scanned' | 'generated';
  type: ScanType;
  rawValue: string;
  parsedData: Record<string, any>;
  timestamp: number;
  thumbnailBase64?: string;
  safety: ScanSafetyState;
  // Enhanced time tracking
  hours?: number;
  minutes?: number;
  // For grouping duplicates
  groupId?: string;
  scanCount?: number;
  // Individual scan IDs for duplicates
  scanIds?: string[];
}

export interface SafetyResult {
  safe: boolean;
  threatType?: string;
  confidence: 'high' | 'medium' | 'low';
  source: ThreatCheckSource;
}

export interface QRCodeData {
  type: ScanType;
  data: Record<string, any>;
  rawValue: string;
}

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceStrong: string;
  accent: string;
  accentGradient?: string[];
  accentStrongGradient?: string[];
  surfaceGradient?: string[];
  backgroundGradient?: string[];
  backgroundAccentGradient?: string[];
  backgroundBlobs?: string[];
  glassHighlight: string;
  backdrop: string;
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

export type AccentColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange'
  | 'pink'
  | 'teal'
  | 'indigo'
  | 'sunset'
  | 'ocean'
  | 'forest'
  | 'berry'
  | 'aurora'
  | 'midnight'
  | 'fire';

export interface SettingsState {
  appearance: AppearanceMode;
  accentColor: AccentColor;
  autoOpenUrls: boolean;
  saveToHistory: boolean;
  vibrateOnScan: boolean;
  beepOnScan: boolean;
  urlThreatScanning: boolean;
  confirmDeleteHistory: boolean;
  autoCopyScanned: boolean;
  swipeNavigation: boolean;
  defaultErrorCorrection: 'L' | 'M' | 'Q' | 'H';
  defaultOutputFormat: 'QR' | 'EAN-13' | 'Code 128';
  showInsights: boolean;
  historyInsightsCollapsed: boolean;
  showSmartStart: boolean;
}
