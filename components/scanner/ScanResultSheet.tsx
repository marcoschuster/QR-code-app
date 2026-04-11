import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Linking, Image, ActivityIndicator, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { NoticeDialog } from '../ui/NoticeDialog';
import { SuccessDialog } from '../ui/SuccessDialog';
import { QRCodeData, ScanSafetyState, ThreatCheckSource } from '../../constants/types';
import { spacing, borderRadius, typography } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

interface ScanResultSheetProps {
  visible: boolean;
  onClose: () => void;
  data: QRCodeData & {
    safety?: ScanSafetyState;
  };
}

export function ScanResultSheet({ visible, onClose, data }: ScanResultSheetProps) {
  const { theme, isDark } = useAppTheme();
  const [faviconError, setFaviconError] = useState(false);
  const [successDialog, setSuccessDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });
  const [noticeDialog, setNoticeDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    tone?: 'info' | 'success' | 'warning' | 'danger';
  }>({
    visible: false,
    title: '',
    message: '',
    tone: 'info',
  });

  // Reset favicon error when data changes
  useEffect(() => {
    setFaviconError(false);
  }, [data]);

  // Extract domain from URL for favicon
  const getDomainFromUrl = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch {
      return null;
    }
  };

  // Get favicon URL
  const getFaviconUrl = (domain: string): string => {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'url': return '🔗';
      case 'wifi': return '📶';
      case 'email': return '📧';
      case 'phone': return '📱';
      case 'whatsapp': return '🟢';
      case 'location': return '📍';
      case 'calendar': return '🗓️';
      case 'text': return '📄';
      case 'barcode': return '🛒';
      case 'coupon': return '🏷️';
      case 'sms': return '💬';
      case 'vcard': return '👤';
      default: return '📋';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'url': return 'URL';
      case 'wifi': return 'WiFi';
      case 'email': return 'Email';
      case 'phone': return 'Phone';
      case 'whatsapp': return 'WhatsApp';
      case 'location': return 'Location';
      case 'calendar': return 'Calendar';
      case 'text': return 'Text';
      case 'barcode': return 'Product';
      case 'coupon': return 'Coupon';
      case 'sms': return 'SMS';
      case 'vcard': return 'Contact';
      case 'play-store': return 'Google Play Store';
      case 'app-store': return 'App Store';
      default: return 'Unknown';
    }
  };

  const getSafetySourceLabel = (source?: ThreatCheckSource) => {
    switch (source) {
      case 'google-safe-browsing':
        return 'Google Safe Browsing';
      case 'heuristic':
        return 'local heuristic scan';
      default:
        return 'link safety checks';
    }
  };

  const getThreatTypeLabel = (threatType?: string) => {
    if (!threatType) {
      return null;
    }

    return threatType
      .toLowerCase()
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  };

  const getTypeSublabel = () => {
    if (data.type === 'url' && data.safety?.inProgress) {
      return 'Threat check in progress';
    }

    if (data.type === 'url' && data.safety?.error) {
      return 'Threat check unavailable';
    }

    if (data.type === 'url' && data.safety?.checked) {
      return data.safety.safe ? 'Threat check complete' : 'Threat detected';
    }

    return 'Successfully scanned';
  };

  const showNotice = (
    title: string,
    message: string,
    tone: 'info' | 'success' | 'warning' | 'danger' = 'info'
  ) => {
    setNoticeDialog({
      visible: true,
      title,
      message,
      tone,
    });
  };

  const handleOpenUrl = async () => {
    if (data.type === 'url') {
      await WebBrowser.openBrowserAsync(data.data.url);
    }
  };

  const getMapUrl = () => {
    if (data.type !== 'location') {
      return null;
    }

    if (
      typeof data.rawValue === 'string' &&
      /^https?:\/\//i.test(data.rawValue) &&
      (
        !data.data.query ||
        /^https?:\/\//i.test(String(data.data.query)) ||
        data.data.query === 'Google Maps Link'
      )
    ) {
      return data.data.url || data.rawValue;
    }

    if (data.data.query) {
      const encodedQuery = encodeURIComponent(data.data.query);

      if (Platform.OS === 'ios') {
        return `http://maps.apple.com/?q=${encodedQuery}`;
      }

      if (Platform.OS === 'android') {
        return `geo:0,0?q=${encodedQuery}`;
      }

      return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    }

    if (
      typeof data.data.latitude === 'number' &&
      typeof data.data.longitude === 'number'
    ) {
      const coordinates = `${data.data.latitude},${data.data.longitude}`;

      if (Platform.OS === 'ios') {
        return `http://maps.apple.com/?ll=${coordinates}`;
      }

      if (Platform.OS === 'android') {
        return `geo:${coordinates}`;
      }

      return `https://maps.google.com/?q=${coordinates}`;
    }

    return null;
  };

  const handleOpenMap = async () => {
    const mapUrl = getMapUrl();

    if (!mapUrl) {
      return;
    }

    await Linking.openURL(mapUrl);
  };

  const handleCopy = async () => {
    let textToCopy = data.rawValue;
    
    if (data.type === 'wifi') {
      textToCopy = `WiFi: ${data.data.ssid}\nPassword: ${data.data.password}`;
    }

    if (data.type === 'sms') {
      textToCopy = data.data.body
        ? `SMS to ${data.data.phone}\n${data.data.body}`
        : `SMS to ${data.data.phone}`;
    }

    if (data.type === 'calendar') {
      textToCopy = [
        data.data.title,
        data.data.start ? `Start: ${data.data.start}` : '',
        data.data.end ? `End: ${data.data.end}` : '',
        data.data.location ? `Location: ${data.data.location}` : '',
        data.data.description ? `Description: ${data.data.description}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    if (data.type === 'coupon') {
      textToCopy = [
        data.data.title ? `Offer: ${data.data.title}` : '',
        data.data.code ? `Code: ${data.data.code}` : '',
        data.data.details ? `Details: ${data.data.details}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    if (data.type === 'whatsapp') {
      textToCopy = [
        data.data.phone ? `WhatsApp: ${data.data.phone}` : '',
        data.data.message ? `Message: ${data.data.message}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }
    
    await Clipboard.setStringAsync(textToCopy);
    setSuccessDialog({
      visible: true,
      title: 'Copied',
      message: 'Content copied to clipboard',
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: data.rawValue,
        title: `Scanned ${getTypeLabel(data.type)}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleCall = () => {
    if (data.type === 'phone') {
      Linking.openURL(`tel:${data.data.phone}`);
    }
  };

  const handleEmail = () => {
    if (data.type === 'email') {
      const mailto = `mailto:${data.data.email}?subject=${encodeURIComponent(data.data.subject)}&body=${encodeURIComponent(data.data.body)}`;
      Linking.openURL(mailto);
    }
  };

  const handleOpenWhatsApp = () => {
    if (data.type !== 'whatsapp') {
      return;
    }

    Linking.openURL(data.data.url || data.rawValue).catch(() => {
      showNotice('Could Not Open WhatsApp', 'The WhatsApp link could not be opened on this device.', 'warning');
    });
  };

  const handleReplySms = () => {
    if (data.type !== 'sms') {
      return;
    }

    const sms = data.data.body
      ? `sms:${data.data.phone}?body=${encodeURIComponent(data.data.body)}`
      : `sms:${data.data.phone}`;

    Linking.openURL(sms);
  };

  const handleAddToContacts = async () => {
    try {
      const isAvailable = await Contacts.isAvailableAsync();

      if (!isAvailable) {
        showNotice('Contacts Unavailable', 'This device does not support contact creation.', 'warning');
        return;
      }

      const permission = await Contacts.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        showNotice('Permission Needed', 'Allow contacts access to save this contact.', 'warning');
        return;
      }

      if (data.type === 'phone') {
        await Contacts.presentFormAsync(null, {
          contactType: Contacts.ContactTypes.Person,
          name: data.data.phone,
          phoneNumbers: [{ label: 'mobile', number: data.data.phone }],
        }, {
          allowsEditing: true,
          isNew: true,
        });
        return;
      }

      if (data.type === 'vcard') {
        const fullName = [data.data.firstName, data.data.lastName].filter(Boolean).join(' ').trim();
        await Contacts.presentFormAsync(null, {
          contactType: Contacts.ContactTypes.Person,
          name: fullName || data.data.company || 'New Contact',
          firstName: data.data.firstName || undefined,
          lastName: data.data.lastName || undefined,
          company: data.data.company || undefined,
          jobTitle: data.data.jobTitle || undefined,
          phoneNumbers: data.data.phone
            ? [{ label: 'mobile', number: data.data.phone }]
            : undefined,
          emails: data.data.email
            ? [{ label: 'work', email: data.data.email }]
            : undefined,
          urlAddresses: data.data.website
            ? [{ label: 'homepage', url: data.data.website }]
            : undefined,
          addresses: data.data.address
            ? [{ label: 'work', street: data.data.address }]
            : undefined,
        }, {
          allowsEditing: true,
          isNew: true,
        });
      }
    } catch (error) {
      showNotice(
        'Could Not Open Contacts',
        error instanceof Error ? error.message : 'The contact form could not be opened.',
        'danger'
      );
    }
  };

  const handleAddToCalendar = () => {
    if (data.type !== 'calendar') {
      return;
    }

    const calendarData = data.data;
    const eventTitle = calendarData.title || 'Calendar Event';
    const eventStart = calendarData.start || calendarData.startRaw;
    const eventEnd = calendarData.end || calendarData.endRaw;
    const eventLocation = calendarData.location || '';
    const eventDescription = calendarData.description || '';

    // Create calendar URL format
    let calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE`;
    calendarUrl += `&text=${encodeURIComponent(eventTitle)}`;
    
    if (eventStart) {
      calendarUrl += `&dates=${eventStart.replace(/[-:]/g, '')}/${eventEnd ? eventEnd.replace(/[-:]/g, '') : ''}`;
    }
    
    if (eventLocation) {
      calendarUrl += `&location=${encodeURIComponent(eventLocation)}`;
    }
    
    if (eventDescription) {
      calendarUrl += `&details=${encodeURIComponent(eventDescription)}`;
    }

    Linking.openURL(calendarUrl).catch(error => {
      showNotice(
        'Could Not Open Calendar',
        'Unable to open calendar application. You can manually add this event.',
        'warning'
      );
    });
  };

  const renderActionButtons = () => {
    const buttons = [];
    const urlThreatCheckPending = data.type === 'url' && data.safety?.inProgress;
    const urlThreatCheckFailed = data.type === 'url' && !!data.safety?.error;

    switch (data.type) {
      case 'url':
        if (data.safety?.safe !== false) {
          buttons.push(
            <Button
              key="open"
              title={
                urlThreatCheckPending
                  ? 'Checking Threats...'
                  : urlThreatCheckFailed
                    ? 'Open Anyway'
                    : 'Open in Browser'
              }
              onPress={handleOpenUrl}
              disabled={urlThreatCheckPending}
              icon={<Ionicons name="globe-outline" size={20} color="#FFFFFF" />}
            />
          );
        }
        buttons.push(
          <Button
            key="copy"
            title="Copy Link"
            onPress={handleCopy}
            variant="secondary"
            icon={<Ionicons name="copy-outline" size={20} color={theme.text.primary} />}
          />
        );
        break;

      case 'wifi':
        buttons.push(
          <Button
            key="connect"
            title="Connect to Network"
            onPress={() =>
              showNotice(
                'Wi-Fi Connection',
                'Direct Wi-Fi connection will be added in a later version.',
                'info'
              )
            }
            icon={<Ionicons name="wifi-outline" size={20} color="#FFFFFF" />}
          />
        );
        buttons.push(
          <Button
            key="copy"
            title="Copy Password"
            onPress={() => Clipboard.setStringAsync(data.data.password)}
            variant="secondary"
            icon={<Ionicons name="key-outline" size={20} color={theme.text.primary} />}
          />
        );
        break;

      case 'whatsapp':
        buttons.push(
          <Button
            key="open-whatsapp"
            title="Open WhatsApp"
            onPress={handleOpenWhatsApp}
            icon={<Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />}
          />
        );
        if (data.data.message) {
          buttons.push(
            <Button
              key="copy-message"
              title="Copy Message"
              onPress={() => Clipboard.setStringAsync(data.data.message)}
              variant="secondary"
              icon={<Ionicons name="copy-outline" size={20} color={theme.text.primary} />}
            />
          );
        } else if (data.data.phone) {
          buttons.push(
            <Button
              key="copy-number"
              title="Copy Number"
              onPress={() => Clipboard.setStringAsync(data.data.phone)}
              variant="secondary"
              icon={<Ionicons name="copy-outline" size={20} color={theme.text.primary} />}
            />
          );
        }
        break;

      case 'email':
        buttons.push(
          <Button
            key="send"
            title="Send Email"
            onPress={handleEmail}
            icon={<Ionicons name="mail-outline" size={20} color="#FFFFFF" />}
          />
        );
        buttons.push(
          <Button
            key="copy"
            title="Copy Address"
            onPress={() => Clipboard.setStringAsync(data.data.email)}
            variant="secondary"
            icon={<Ionicons name="copy-outline" size={20} color={theme.text.primary} />}
          />
        );
        break;

      case 'phone':
        buttons.push(
          <Button
            key="call"
            title="Call"
            onPress={handleCall}
            icon={<Ionicons name="call-outline" size={20} color="#FFFFFF" />}
          />
        );
        buttons.push(
          <Button
            key="copy"
            title="Copy Number"
            onPress={() => Clipboard.setStringAsync(data.data.phone)}
            variant="secondary"
            icon={<Ionicons name="copy-outline" size={20} color={theme.text.primary} />}
          />
        );
        buttons.push(
          <Button
            key="contact"
            title="Add to Contacts"
            onPress={handleAddToContacts}
            variant="secondary"
            icon={<Ionicons name="person-add-outline" size={20} color={theme.text.primary} />}
          />
        );
        break;

      case 'sms':
        buttons.push(
          <Button
            key="reply"
            title="Reply"
            onPress={handleReplySms}
            icon={<Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />}
          />
        );
        buttons.push(
          <Button
            key="copy"
            title="Copy Number"
            onPress={() => Clipboard.setStringAsync(data.data.phone)}
            variant="secondary"
            icon={<Ionicons name="copy-outline" size={20} color={theme.text.primary} />}
          />
        );
        break;

      case 'location':
        buttons.push(
          <Button
            key="map"
            title="Open Map"
            onPress={handleOpenMap}
            icon={<Ionicons name="location-outline" size={20} color="#FFFFFF" />}
          />
        );
        buttons.push(
          <Button
            key="copy"
            title={data.data.query ? 'Copy Address' : 'Copy Coordinates'}
            onPress={() =>
              Clipboard.setStringAsync(
                data.data.query ||
                  `${data.data.latitude},${data.data.longitude}`
              )
            }
            variant="secondary"
            icon={<Ionicons name="copy-outline" size={20} color={theme.text.primary} />}
          />
        );
        break;

      case 'calendar':
        buttons.push(
          <Button
            key="calendar"
            title="Add to Calendar"
            onPress={handleAddToCalendar}
            icon={<Ionicons name="calendar-outline" size={20} color="#FFFFFF" />}
          />
        );
        buttons.push(
          <Button
            key="copy"
            title="Copy Event"
            onPress={handleCopy}
            variant="secondary"
            icon={<Ionicons name="copy-outline" size={20} color={theme.text.primary} />}
          />
        );
        break;

      case 'vcard':
        buttons.push(
          <Button
            key="contact"
            title="Add to Contacts"
            onPress={handleAddToContacts}
            icon={<Ionicons name="person-add-outline" size={20} color="#FFFFFF" />}
          />
        );
        buttons.push(
          <Button
            key="copy"
            title="Copy Contact"
            onPress={handleCopy}
            variant="secondary"
            icon={<Ionicons name="copy-outline" size={20} color={theme.text.primary} />}
          />
        );
        break;

      case 'coupon':
        if (data.data.code) {
          buttons.push(
            <Button
              key="copy-code"
              title="Copy Code"
              onPress={() => Clipboard.setStringAsync(data.data.code)}
              icon={<Ionicons name="pricetag-outline" size={20} color="#FFFFFF" />}
            />
          );
        }
        buttons.push(
          <Button
            key="copy-all"
            title="Copy All"
            onPress={handleCopy}
            variant={data.data.code ? 'secondary' : 'primary'}
            icon={
              <Ionicons
                name="copy-outline"
                size={20}
                color={data.data.code ? theme.text.primary : '#FFFFFF'}
              />
            }
          />
        );
        break;

      case 'play-store':
      case 'app-store':
        buttons.push(
          <Button
            key="open-store"
            title={data.type === 'play-store' ? 'Open in Play Store' : 'Open in App Store'}
            onPress={() => WebBrowser.openBrowserAsync(data.data.url || data.rawValue)}
            icon={<Ionicons name="open-outline" size={20} color="#FFFFFF" />}
          />
        );
        buttons.push(
          <Button
            key="copy-store-link"
            title="Copy Link"
            onPress={handleCopy}
            variant="secondary"
            icon={<Ionicons name="copy-outline" size={20} color={theme.text.primary} />}
          />
        );
        break;

      default:
        buttons.push(
          <Button
            key="copy"
            title="Copy Text"
            onPress={handleCopy}
            icon={<Ionicons name="copy-outline" size={20} color="#FFFFFF" />}
          />
        );
        break;
    }

    buttons.push(
      <Button
        key="share"
        title="Share"
        onPress={handleShare}
        variant="secondary"
        icon={<Ionicons name="share-outline" size={20} color={theme.text.primary} />}
      />
    );

    return buttons;
  };

  const renderSafetyStatus = () => {
    if (data.type !== 'url' || !data.safety) {
      return null;
    }

    if (data.safety.inProgress) {
      return (
        <Card style={styles.safetyCard}>
          <View style={[styles.safetyContent, { backgroundColor: theme.warning + '10' }]}>
            <View style={styles.safetyIconContainer}>
              <ActivityIndicator size="small" color={theme.warning} />
            </View>
            <View style={styles.safetyText}>
              <Text style={[styles.safetyTitle, { color: theme.warning }]}>
                Checking this link for threats
              </Text>
              <Text style={[styles.safetyDescription, { color: theme.text.secondary }]}>
                Running {getSafetySourceLabel(data.safety.source)} before enabling this link.
              </Text>
            </View>
          </View>
        </Card>
      );
    }

    if (data.safety.error) {
      return (
        <Card style={styles.safetyCard}>
          <View style={[styles.safetyContent, { backgroundColor: theme.warning + '10' }]}>
            <View style={styles.safetyIconContainer}>
              <Ionicons name="alert-circle-outline" size={24} color={theme.warning} />
            </View>
            <View style={styles.safetyText}>
              <Text style={[styles.safetyTitle, { color: theme.warning }]}>
                Threat check could not complete
              </Text>
              <Text style={[styles.safetyDescription, { color: theme.text.secondary }]}>
                {data.safety.error} The link was not verified, so open it only if you trust it.
              </Text>
            </View>
          </View>
        </Card>
      );
    }

    if (data.safety.checked && !data.safety.safe) {
      return (
        <Card style={styles.safetyCard}>
          <View style={[styles.safetyContent, { backgroundColor: theme.danger + '10' }]}>
            <View style={styles.safetyIconContainer}>
              <Ionicons name="warning-outline" size={24} color={theme.danger} />
            </View>
            <View style={styles.safetyText}>
              <Text style={[styles.safetyTitle, { color: theme.danger }]}>
                Malicious URL Detected
              </Text>
              <Text style={[styles.safetyDescription, { color: theme.text.secondary }]}>
                This link was flagged by {getSafetySourceLabel(data.safety.source)} and opening it may compromise your security.
              </Text>
              {getThreatTypeLabel(data.safety.threatType) ? (
                <Text style={[styles.safetyMeta, { color: theme.text.secondary }]}>
                  Signal: {getThreatTypeLabel(data.safety.threatType)}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>
      );
    }

    if (data.safety.checked && data.safety.safe) {
      return (
        <Card style={styles.safetyCard}>
          <View style={[styles.safetyContent, { backgroundColor: theme.success + '10' }]}>
            <View style={styles.safetyIconContainer}>
              <Ionicons name="shield-checkmark-outline" size={24} color={theme.success} />
            </View>
            <View style={styles.safetyText}>
              <Text style={[styles.safetyTitle, { color: theme.success }]}>
                No threats detected
              </Text>
              <Text style={[styles.safetyDescription, { color: theme.text.secondary }]}>
                {getSafetySourceLabel(data.safety.source)} finished and did not find a known threat for this link.
              </Text>
            </View>
          </View>
        </Card>
      );
    }

    return null;
  };

  const renderContent = () => {
    switch (data.type) {
      case 'url':
        return (
          <Text style={[styles.contentText, { color: theme.text.primary }]}>
            {data.data.url}
          </Text>
        );

      case 'wifi':
        return (
          <View style={styles.contentContainer}>
            <Text style={[styles.contentLabel, { color: theme.text.secondary }]}>
              Network
            </Text>
            <Text style={[styles.contentText, { color: theme.text.primary }]}>
              {data.data.ssid}
            </Text>
            <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
              Security
            </Text>
            <Text style={[styles.contentText, { color: theme.text.primary }]}>
              {data.data.security}
            </Text>
            {data.data.password && (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Password
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {'•'.repeat(Math.min(data.data.password.length, 12))}
                </Text>
              </>
            )}
          </View>
        );

      case 'email':
        return (
          <View style={styles.contentContainer}>
            <Text style={[styles.contentLabel, { color: theme.text.secondary }]}>
              To
            </Text>
            <Text style={[styles.contentText, { color: theme.text.primary }]}>
              {data.data.email}
            </Text>
            {data.data.subject && (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Subject
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.subject}
                </Text>
              </>
            )}
            {data.data.body && (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Body
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.body}
                </Text>
              </>
            )}
          </View>
        );

      case 'phone':
        return (
          <Text style={[styles.contentText, { color: theme.text.primary }]}>
            {data.data.phone}
          </Text>
        );

      case 'whatsapp':
        return (
          <View style={styles.contentContainer}>
            {data.data.phone ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary }]}>
                  Phone Number
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.phone}
                </Text>
              </>
            ) : null}
            {data.data.message ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Message
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.message}
                </Text>
              </>
            ) : null}
          </View>
        );

      case 'sms':
        return (
          <View style={styles.contentContainer}>
            <Text style={[styles.contentLabel, { color: theme.text.secondary }]}>
              Phone Number
            </Text>
            <Text style={[styles.contentText, { color: theme.text.primary }]}>
              {data.data.phone}
            </Text>
            {data.data.body ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Message
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.body}
                </Text>
              </>
            ) : null}
          </View>
        );

      case 'location':
        return (
          <View style={styles.contentContainer}>
            {data.data.query ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary }]}>
                  Address or Search
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.query}
                </Text>
              </>
            ) : null}
            {typeof data.data.latitude === 'number' && typeof data.data.longitude === 'number' ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: data.data.query ? spacing.sm : 0 }]}>
                  Coordinates
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.latitude}, {data.data.longitude}
                </Text>
              </>
            ) : null}
          </View>
        );

      case 'calendar':
        return (
          <View style={styles.contentContainer}>
            <Text style={[styles.contentLabel, { color: theme.text.secondary }]}>
              Title
            </Text>
            <Text style={[styles.contentText, { color: theme.text.primary }]}>
              {data.data.title}
            </Text>
            {data.data.start ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Start
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.start}
                </Text>
              </>
            ) : null}
            {data.data.end ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  End
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.end}
                </Text>
              </>
            ) : null}
            {data.data.location ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Location
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.location}
                </Text>
              </>
            ) : null}
            {data.data.description ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Description
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.description}
                </Text>
              </>
            ) : null}
          </View>
        );

      case 'vcard':
        return (
          <View style={styles.contentContainer}>
            <Text style={[styles.contentLabel, { color: theme.text.secondary }]}>
              Name
            </Text>
            <Text style={[styles.contentText, { color: theme.text.primary }]}>
              {[data.data.firstName, data.data.lastName].filter(Boolean).join(' ') || data.data.company || 'Contact'}
            </Text>
            {data.data.company ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Company
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.company}
                </Text>
              </>
            ) : null}
            {data.data.jobTitle ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Job Title
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.jobTitle}
                </Text>
              </>
            ) : null}
            {data.data.phone ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Phone
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.phone}
                </Text>
              </>
            ) : null}
            {data.data.email ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Email
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.email}
                </Text>
              </>
            ) : null}
            {data.data.website ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Website
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.website}
                </Text>
              </>
            ) : null}
            {data.data.address ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Address
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.address}
                </Text>
              </>
            ) : null}
          </View>
        );

      case 'coupon':
        return (
          <View style={styles.contentContainer}>
            <Text style={[styles.contentLabel, { color: theme.text.secondary }]}>
              Offer
            </Text>
            <Text style={[styles.contentText, { color: theme.text.primary }]}>
              {data.data.title || 'Coupon'}
            </Text>
            {data.data.code ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Code
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.code}
                </Text>
              </>
            ) : null}
            {data.data.details ? (
              <>
                <Text style={[styles.contentLabel, { color: theme.text.secondary, marginTop: spacing.sm }]}>
                  Details
                </Text>
                <Text style={[styles.contentText, { color: theme.text.primary }]}>
                  {data.data.details}
                </Text>
              </>
            ) : null}
          </View>
        );

      case 'play-store':
      case 'app-store':
        return (
          <View style={styles.contentContainer}>
            <Text style={[styles.contentLabel, { color: theme.text.secondary }]}>
              Store Link
            </Text>
            <Text style={[styles.contentText, { color: theme.text.primary }]}>
              {data.data.url || data.rawValue}
            </Text>
          </View>
        );

      default:
        return (
          <Text style={[styles.contentText, { color: theme.text.primary }]}>
            {data.data.text || data.rawValue}
          </Text>
        );
    }
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          {/* Favicon for URL-like links, emoji icon for other types */}
          {data.type === 'url' || data.type === 'play-store' || data.type === 'app-store' ? (
            <View
              style={[
                styles.faviconContainer,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              ]}
            >
              {getDomainFromUrl(data.data.url) && !faviconError ? (
                <Image
                  source={{ uri: getFaviconUrl(getDomainFromUrl(data.data.url)!) }}
                  style={styles.favicon}
                  onError={() => setFaviconError(true)}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.faviconFallback}>
                  <Ionicons name="globe-outline" size={20} color={theme.text.primary} />
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.typeIcon}>{getTypeIcon(data.type)}</Text>
          )}
          <View>
            <Text style={[styles.typeLabel, { color: theme.text.primary }]}>
              {getTypeLabel(data.type)}
            </Text>
            <Text style={[styles.typeSublabel, { color: theme.text.secondary }]}>
              {getTypeSublabel()}
            </Text>
          </View>
        </View>
        
        {data.safety?.inProgress ? (
          <Badge
            title="Checking…"
            variant="warning"
          />
        ) : data.safety?.error ? (
          <Badge
            title="Check Failed"
            variant="warning"
          />
        ) : data.safety?.checked ? (
          <Badge
            title={data.safety.safe ? 'Safe ✓' : '⚠ Threat Detected'}
            variant={data.safety.safe ? 'success' : 'danger'}
          />
        ) : null}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          {renderContent()}
        </Card>

        {renderSafetyStatus()}

        {/* Action buttons */}
        <View style={styles.actionContainer}>
          {renderActionButtons().map((button, index) => (
            <View
              key={index}
              style={[
                styles.actionButton,
                data.type === 'url' && index === 0 && styles.primaryUrlActionButton,
              ]}
            >
              {button}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Close button */}
      <Pressable style={[styles.closeButton, { borderTopColor: theme.border }]} onPress={onClose}>
        <Text style={[styles.closeButtonText, { color: theme.text.secondary }]}>
          Close
        </Text>
      </Pressable>

      <SuccessDialog
        visible={successDialog.visible}
        title={successDialog.title}
        message={successDialog.message}
        onClose={() => setSuccessDialog(prev => ({ ...prev, visible: false }))}
      />
      <NoticeDialog
        visible={noticeDialog.visible}
        title={noticeDialog.title}
        message={noticeDialog.message}
        tone={noticeDialog.tone}
        onClose={() => setNoticeDialog({ visible: false, title: '', message: '', tone: 'info' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  faviconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  favicon: {
    width: 28,
    height: 28,
  },
  faviconFallback: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    fontSize: 24,
  },
  typeLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  typeSublabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  contentContainer: {
    gap: spacing.sm,
  },
  contentLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  contentText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    lineHeight: 24,
  },
  safetyCard: {
    marginTop: spacing.md,
    padding: spacing.md,
  },
  safetyContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  safetyIconContainer: {
    width: 24,
    alignItems: 'center',
    paddingTop: 2,
  },
  safetyText: {
    flex: 1,
  },
  safetyTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
  },
  safetyDescription: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  safetyMeta: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  actionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
    minWidth: 140,
  },
  primaryUrlActionButton: {
    flexBasis: '100%',
    width: '100%',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  closeButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
});
