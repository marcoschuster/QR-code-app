import React, { useMemo, useState } from 'react';
import {
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
import { Chip } from '../ui/Chip';
import { NoticeDialog } from '../ui/NoticeDialog';
import { SuccessDialog } from '../ui/SuccessDialog';
import {
  borderRadius,
  spacing,
  typography,
} from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';
import {
  createQrCodeImage,
  saveQrCodeImage,
  type GeneratedQrCodeImage,
} from '../../services/qrCodeImage';
import {
  GENERATOR_TEMPLATES,
  buildGeneratorContent,
  createInitialGeneratorValues,
  getGeneratorTemplate,
  type GeneratorField,
  type GeneratorTemplateId,
} from '../../services/generatorTemplates';

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

  const [selectedTemplateId, setSelectedTemplateId] = useState<GeneratorTemplateId>('website');
  const [formValues, setFormValues] = useState<Record<string, string>>(() =>
    createInitialGeneratorValues('website')
  );
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
  const [noticeDialog, setNoticeDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const selectedTemplate = useMemo(
    () => getGeneratorTemplate(selectedTemplateId),
    [selectedTemplateId]
  );

  const handleTemplateSelect = (templateId: GeneratorTemplateId) => {
    setSelectedTemplateId(templateId);
    setFormValues(createInitialGeneratorValues(templateId));
    setErrorMessage('');
    setGeneratedCode(null);
  };

  const handleFieldChange = (fieldKey: string, value: string) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [fieldKey]: value,
    }));
    setErrorMessage('');
    setGeneratedCode(null);
  };

  const handlePaste = async () => {
    const clipboardValue = (await Clipboard.getStringAsync()).trim();

    if (!clipboardValue) {
      setNoticeDialog({
        visible: true,
        title: 'Clipboard Empty',
        message: 'Copy a link first, then try again.',
      });
      return;
    }

    const firstField = selectedTemplate.fields[0];

    if (!firstField) {
      return;
    }

    handleFieldChange(firstField.key, clipboardValue);
  };

  const handleGenerate = () => {
    try {
      const content = buildGeneratorContent(selectedTemplateId, formValues);
      const qrCode = createQrCodeImage(content);

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
      title: 'Content copied',
      message: 'The generated code content has been copied to your clipboard.',
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

      setNoticeDialog({
        visible: true,
        title: Platform.OS === 'web' ? 'Download Started' : 'Image Saved',
        message:
          Platform.OS === 'web'
            ? `Your QR code is downloading as ${result.fileName}.`
            : result.uri
              ? `Saved as ${result.fileName}.`
              : `${result.fileName} is ready in the app documents folder.`,
      });
    } catch (error) {
      setNoticeDialog({
        visible: true,
        title: 'Save Failed',
        message: error instanceof Error ? error.message : 'The QR code image could not be saved.',
      });
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
            <Text style={[styles.title, { color: theme.text.primary }]}>Generate Codes</Text>
            <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
              Pick a format, fill in the details, and export the generated code as a PNG image.
            </Text>
          </View>

          <Card style={styles.sectionCard} padding={spacing.lg}>
            <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Code Type</Text>

            <View style={styles.templateGrid}>
              {GENERATOR_TEMPLATES.map((template) => (
                <Chip
                  key={template.id}
                  title={template.title}
                  selected={template.id === selectedTemplateId}
                  onPress={() => handleTemplateSelect(template.id)}
                />
              ))}
            </View>
          </Card>

          <Card style={styles.sectionCard} padding={spacing.lg}>
            <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Details</Text>
            <Text style={[styles.templateDescription, { color: theme.text.secondary }]}>
              {selectedTemplate.description}
            </Text>

            <View style={styles.formFields}>
              {selectedTemplate.fields.map((field) => renderField({
                field,
                value: formValues[field.key] ?? '',
                onChange: (value) => handleFieldChange(field.key, value),
                theme,
                errorMessage,
              }))}
            </View>

            <Text style={[styles.helperText, { color: errorMessage ? theme.danger : theme.text.secondary }]}>
              {errorMessage || 'All code types are encoded into QR images in this version.'}
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
                title="Generate"
                icon="qr-code-outline"
                onPress={handleGenerate}
                theme={theme}
                isDark={isDark}
              />
            </View>
          </Card>

          {generatedCode && (
            <Card style={styles.sectionCard} padding={spacing.lg}>
              <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Preview</Text>
              <Text style={[styles.previewTitle, { color: theme.text.primary }]}>
                {selectedTemplate.title}
              </Text>

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

              <Text style={[styles.previewLabel, { color: theme.text.secondary }]}>
                Encoded Content
              </Text>
              <Text style={[styles.previewLink, { color: theme.text.secondary }]}>
                {generatedCode.content}
              </Text>

              <View style={styles.actionsRow}>
                <ActionButton
                  title="Copy Text"
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
      <NoticeDialog
        visible={noticeDialog.visible}
        title={noticeDialog.title}
        message={noticeDialog.message}
        onClose={() => setNoticeDialog(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
}

function renderField({
  field,
  value,
  onChange,
  theme,
  errorMessage,
}: {
  field: GeneratorField;
  value: string;
  onChange: (value: string) => void;
  theme: ScreenTheme;
  errorMessage: string;
}) {
  return (
    <View key={field.key} style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: theme.text.primary }]}>{field.label}</Text>

      {field.options ? (
        <View style={styles.optionRow}>
          {field.options.map((option) => {
            const isSelected = value === option.value;

            return (
              <Pressable
                key={option.value}
                style={({ pressed }) => [
                  styles.optionButton,
                  {
                    backgroundColor: isSelected ? theme.accent : theme.background,
                    borderColor: isSelected ? theme.accent : theme.border,
                    opacity: pressed ? 0.84 : 1,
                  },
                ]}
                onPress={() => onChange(option.value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    { color: isSelected ? '#FFFFFF' : theme.text.primary },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={field.placeholder}
          placeholderTextColor={theme.text.tertiary}
          autoCapitalize={field.autoCapitalize}
          autoCorrect={false}
          keyboardType={field.keyboardType}
          multiline={field.multiline}
          textAlignVertical={field.multiline ? 'top' : 'center'}
          style={[
            styles.input,
            field.multiline ? styles.multilineInput : styles.singleLineInput,
            {
              backgroundColor: theme.background,
              borderColor: errorMessage ? theme.danger : theme.border,
              color: theme.text.primary,
            },
          ]}
        />
      )}
    </View>
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
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  templateDescription: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  formFields: {
    gap: spacing.md,
  },
  fieldBlock: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  singleLineInput: {
    minHeight: 56,
  },
  multilineInput: {
    minHeight: 112,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
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
  previewTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.md,
  },
  previewLabel: {
    marginTop: spacing.md,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  previewLink: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
});
