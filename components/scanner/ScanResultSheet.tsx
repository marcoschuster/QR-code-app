import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Alert, Linking } from 'react-native';
import { useColorScheme } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { QRCodeData } from '../../constants/types';
import { lightTheme, darkTheme, spacing, borderRadius, typography } from '../../constants/theme';

interface ScanResultSheetProps {
  visible: boolean;
  onClose: () => void;
  data: QRCodeData & {
    safety?: {
      checked: boolean;
      safe: boolean | null;
      threatType?: string;
    };
  };
}

export function ScanResultSheet({ visible, onClose, data }: ScanResultSheetProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'url': return '🔗';
      case 'wifi': return '📶';
      case 'email': return '📧';
      case 'phone': return '📱';
      case 'location': return '📍';
      case 'text': return '📄';
      case 'barcode': return '🛒';
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
      case 'location': return 'Location';
      case 'text': return 'Text';
      case 'barcode': return 'Product';
      case 'sms': return 'SMS';
      case 'vcard': return 'Contact';
      default: return 'Unknown';
    }
  };

  const handleOpenUrl = async () => {
    if (data.type === 'url') {
      await WebBrowser.openBrowserAsync(data.data.url);
    }
  };

  const handleCopy = async () => {
    let textToCopy = data.rawValue;
    
    if (data.type === 'wifi') {
      textToCopy = `WiFi: ${data.data.ssid}\nPassword: ${data.data.password}`;
    }
    
    await Clipboard.setStringAsync(textToCopy);
    Alert.alert('Copied', 'Content copied to clipboard');
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

  const renderActionButtons = () => {
    const buttons = [];

    switch (data.type) {
      case 'url':
        if (data.safety?.safe !== false) {
          buttons.push(
            <Button
              key="open"
              title="Open in Browser"
              onPress={handleOpenUrl}
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
            onPress={() => Alert.alert('WiFi Connection', 'This feature will be implemented in the next version.')}
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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.typeIcon}>{getTypeIcon(data.type)}</Text>
          <View>
            <Text style={[styles.typeLabel, { color: theme.text.primary }]}>
              {getTypeLabel(data.type)}
            </Text>
            <Text style={[styles.typeSublabel, { color: theme.text.secondary }]}>
              Successfully scanned
            </Text>
          </View>
        </View>
        
        {data.safety?.checked && (
          <Badge
            title={data.safety.safe ? 'Safe ✓' : '⚠ Threat Detected'}
            variant={data.safety.safe ? 'success' : 'danger'}
          />
        )}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          {renderContent()}
        </Card>

        {/* Safety warning for URLs */}
        {data.type === 'url' && data.safety?.checked && !data.safety.safe && (
          <Card style={styles.safetyCard}>
            <View style={[styles.safetyContent, { backgroundColor: theme.danger + '10' }]}>
              <Ionicons name="warning-outline" size={24} color={theme.danger} />
              <View style={styles.safetyText}>
                <Text style={[styles.safetyTitle, { color: theme.danger }]}>
                  ⚠ Malicious URL Detected
                </Text>
                <Text style={[styles.safetyDescription, { color: theme.text.secondary }]}>
                  This link has been flagged as potentially harmful. Opening it may compromise your security.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Action buttons */}
        <View style={styles.actionContainer}>
          {renderActionButtons().map((button, index) => (
            <View key={index} style={styles.actionButton}>
              {button}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Close button */}
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Text style={[styles.closeButtonText, { color: theme.text.secondary }]}>
          Close
        </Text>
      </Pressable>
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
    borderBottomColor: '#E5E5E7',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  closeButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  closeButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
});
