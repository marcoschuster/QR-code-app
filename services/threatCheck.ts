import { SafetyResult } from '../constants/types';

const GOOGLE_SAFE_BROWSING_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_SAFE_BROWSING_API_KEY;

export async function checkUrlSafety(url: string): Promise<SafetyResult> {
  if (!GOOGLE_SAFE_BROWSING_API_KEY) {
    // Fallback to heuristic checks if no API key
    return heuristicSafetyCheck(url);
  }

  try {
    const response = await fetch('https://safebrowsing.googleapis.com/v4/threatMatches:find', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client: {
          clientId: 'qr-scanner-app',
          clientVersion: '1.0.0',
        },
        threatInfo: {
          threatTypes: [
            'MALWARE',
            'SOCIAL_ENGINEERING',
            'UNWANTED_SOFTWARE',
            'POTENTIALLY_HARMFUL_APPLICATION',
          ],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
    });

    const data = await response.json();
    
    if (data.matches && data.matches.length > 0) {
      const threat = data.matches[0];
      return {
        safe: false,
        threatType: threat.threatType,
        confidence: 'high',
      };
    }

    return {
      safe: true,
      confidence: 'high',
    };
  } catch (error) {
    console.warn('Google Safe Browsing API failed, falling back to heuristic check:', error);
    return heuristicSafetyCheck(url);
  }
}

function heuristicSafetyCheck(url: string): SafetyResult {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Known suspicious patterns
    const suspiciousPatterns = [
      /bit\.ly$/,
      /tinyurl\.com$/,
      /t\.co$/,
      /goo\.gl$/,
      /shortened\.link$/,
      /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // IP addresses
      /[a-z0-9]{20,}/, // Very long subdomains
    ];

    const highRiskTlds = ['.tk', '.ml', '.ga', '.cf', '.gq'];
    const suspiciousKeywords = ['login', 'secure', 'account', 'verify', 'update', 'banking'];

    let riskScore = 0;

    // Check for suspicious patterns
    suspiciousPatterns.forEach((pattern) => {
      if (pattern.test(hostname)) riskScore += 2;
    });

    // Check for high-risk TLDs
    highRiskTlds.forEach((tld) => {
      if (hostname.endsWith(tld)) riskScore += 3;
    });

    // Check for suspicious keywords
    suspiciousKeywords.forEach((keyword) => {
      if (hostname.includes(keyword)) riskScore += 1;
    });

    // Check for HTTP vs HTTPS
    if (urlObj.protocol === 'http:') {
      riskScore += 1;
    }

    if (riskScore >= 4) {
      return {
        safe: false,
        threatType: 'SUSPICIOUS_PATTERN',
        confidence: 'medium',
      };
    } else if (riskScore >= 2) {
      return {
        safe: false,
        threatType: 'POTENTIALLY_SUSPICIOUS',
        confidence: 'low',
      };
    }

    return {
      safe: true,
      confidence: 'low',
    };
  } catch (error) {
    // If URL parsing fails, assume it's suspicious
    return {
      safe: false,
      threatType: 'INVALID_URL',
      confidence: 'medium',
    };
  }
}
