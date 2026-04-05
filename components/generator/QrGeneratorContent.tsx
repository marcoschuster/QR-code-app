import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { SuccessDialog } from '../ui/SuccessDialog';
import {
  borderRadius,
  spacing,
  typography,
} from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';
import {
  createQrCodeImage,
  normalizeQrLinkInput,
  saveQrCodeImage,
  type GeneratedQrCodeImage,
} from '../../services/qrCodeImage';

type ScreenTheme = ReturnType<typeof useAppTheme>['theme'];

interface ActionButtonProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  theme: ScreenTheme;
  isDark: boolean;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function QrGeneratorContent() {
  const { theme, isDark } = useAppTheme();

  const [linkInput, setLinkInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedCode, setGeneratedCode] = useState<GeneratedQrCodeImage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successDialog, setSuccessDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const handleLinkChange = (value: string) => {
    setLinkInput(value);
    setErrorMessage('');

    if (generatedCode && value.trim() !== generatedCode.content) {
      setGeneratedCode(null);
    }
  };

  const handlePaste = async () => {
    const clipboardValue = (await Clipboard.getStringAsync()).trim();

    if (!clipboardValue) {
      Alert.alert('Clipboard empty', 'Copy a link first, then try again.');
      return;
    }

    setLinkInput(clipboardValue);
    setErrorMessage('');
  };

  const handleGenerate = () => {
    try {
      const normalizedLink = normalizeQrLinkInput(linkInput);
      const qrCode = createQrCodeImage(normalizedLink);

      setLinkInput(normalizedLink);
      setGeneratedCode(qrCode);
      setErrorMessage('');
    } catch (error) {
      setGeneratedCode(null);
      setErrorMessage(
        error instanceof Error ? error.message : 'The QR code could not be generated.'
      );
    }
  };

  const handleCopyLink = async () => {
    if (!generatedCode) {
      return;
    }

    await Clipboard.setStringAsync(generatedCode.content);
    setSuccessDialog({
      visible: true,
      title: 'Link copied',
      message: 'The QR code link has been copied to your clipboard.',
    });
  };

  const handleDownload = async () => {
    if (!generatedCode || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await saveQrCodeImage(generatedCode.imageBase64);

      if (!result) {
        return;
      }

      Alert.alert(
        Platform.OS === 'web' ? 'Download started' : 'Image saved',
        Platform.OS === 'web'
          ? `Your QR code is downloading as ${result.fileName}.`
          : result.uri
            ? `Saved as ${result.fileName}.`
            : `${result.fileName} is ready in the app documents folder.`
      );
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'The QR code image could not be saved.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text.primary }]}>Generate QR</Text>
            <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
              Paste a link, turn it into a QR code, and export it as a PNG image.
            </Text>
          </View>

          <Card style={styles.sectionCard} padding={spacing.lg}>
            <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Link</Text>

            <TextInput
              value={linkInput}
              onChangeText={handleLinkChange}
              placeholder="https://example.com"
              placeholderTextColor={theme.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  borderColor: errorMessage ? theme.danger : theme.border,
                  color: theme.text.primary,
                },
              ]}
            />

            <Text
              style={[
                styles.helperText,
                { color: errorMessage ? theme.danger : theme.text.secondary },
              ]}
            >
              {errorMessage || 'If you paste a domain without http, https will be added for you.'}
            </Text>

            <View style={styles.actionsRow}>
              <ActionButton
                title="Paste"
                icon="clipboard-outline"
                onPress={handlePaste}
                theme={theme}
                isDark={isDark}
                variant="secondary"
              />
              <ActionButton
                title="Generate QR"
                icon="qr-code-outline"
                onPress={() => {
                  if (linkInput.trim()) {
                    const normalizedInput = normalizeQrLinkInput(linkInput.trim());
                    if (normalizedInput) {
                      const qrCode = createQrCodeImage(normalizedInput);
                      setGeneratedCode(qrCode);
                      setErrorMessage('');
                    } else {
                      setErrorMessage('Please enter a valid URL or text.');
                    }
                  } else {
                    setErrorMessage('Please enter a URL or text first.');
                  }
                }}
                theme={theme}
                isDark={isDark}
                disabled={!linkInput.trim()}
              />
            </View>
          </Card>

          {generatedCode && (
            <Card style={styles.sectionCard} padding={spacing.lg}>
              <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Preview</Text>

              <View
                style={[
                  styles.previewSurface,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Image
                  source={{ uri: generatedCode.imageUri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={[styles.previewLink, { color: theme.text.secondary }]}>
                {generatedCode.content}
              </Text>

              <View style={styles.actionsRow}>
                <ActionButton
                  title="Copy Link"
                  icon="copy-outline"
                  onPress={handleCopyLink}
                  theme={theme}
                  isDark={isDark}
                  variant="secondary"
                  disabled={!generatedCode}
                />
                <ActionButton
                  title={isSaving ? 'Saving...' : 'Download PNG'}
                  icon="download-outline"
                  onPress={handleDownload}
                  theme={theme}
                  isDark={isDark}
                  disabled={!generatedCode || isSaving}
                />
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessDialog
        visible={successDialog.visible}
        title={successDialog.title}
        message={successDialog.message}
        onClose={() => setSuccessDialog(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
}

function ActionButton({
  title,
  icon,
  onPress,
  theme,
  isDark,
  variant = 'primary',
  disabled = false,
}: ActionButtonProps) {
  const isPrimary = variant === 'primary';
  const backgroundColor = disabled
    ? isDark
      ? '#1A1C1F'
      : '#ECEEF1'
    : isPrimary
      ? isDark
        ? '#1A1C1F'
        : '#ECEEF1'
      : isDark
        ? '#090A0C'
        : '#FFFFFF';
  const borderColor = disabled
    ? theme.border
    : isPrimary
      ? isDark
        ? '#2B2E34'
        : '#DDE2E8'
      : theme.border;
  const iconColor = disabled ? theme.text.tertiary : theme.text.primary;
  const textColor = disabled ? theme.text.tertiary : theme.text.primary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor,
          borderColor,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={[styles.actionButtonText, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
    paddingBottom: 148,
  },
  header: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    lineHeight: 24,
  },
  sectionCard: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  input: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  helperText: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  previewSurface: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 280,
    maxHeight: 280,
  },
  emptyPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyPreviewText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  previewLink: {
    marginTop: spacing.md,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
});
