import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  type LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { NoticeDialog } from '../ui/NoticeDialog';
import { SuccessDialog } from '../ui/SuccessDialog';
import { LiquidProgress } from '../ui/LiquidProgress';
import { SupportDialog, SupportHeadsetIcon } from '../ui/SupportDialog';
import { AdBanner } from '../AdBanner';
import {
  borderRadius,
  spacing,
  typography,
} from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSettingsStore } from '../../store/useSettingsStore';
import {
  createQrCodeImage,
  saveQrCodeImage,
  type GeneratedQrCodeImage,
} from '../../services/qrCodeImage';
import {
  createBarcodeImage,
  getBarcodeSymbologyForTemplate,
} from '../../services/barcodeImage';
import {
  GENERATOR_TEMPLATES,
  buildGeneratorContent,
  createInitialGeneratorValues,
  getGeneratorTemplateSummary,
  getGeneratorTemplate,
  suggestGeneratorSetupFromRawContent,
  type GeneratorField,
  type GeneratorQuickStartSuggestion,
  type GeneratorTemplateId,
} from '../../services/generatorTemplates';
import { useGeneratorStore } from '../../store/useGeneratorStore';

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
  const { recentPresets, savePreset, removePreset } = useGeneratorStore();
  const { showSmartStart } = useSettingsStore();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const previewYRef = useRef(0);
  const pendingPreviewScrollRef = useRef(false);
  const completeIconProgress = useRef(new Animated.Value(0)).current;

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
  const [typesCollapsed, setTypesCollapsed] = useState(true);
  const [presetsCollapsed, setPresetsCollapsed] = useState(true);
  const [clipboardSuggestion, setClipboardSuggestion] = useState<GeneratorQuickStartSuggestion | null>(null);
  const [isCheckingClipboard, setIsCheckingClipboard] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [supportDialogVisible, setSupportDialogVisible] = useState(false);

  // 6 most important/most used types
  const importantTypes: GeneratorTemplateId[] = ['website', 'plain-text', 'phone', 'sms', 'email', 'wifi'];
  const displayedTemplates = typesCollapsed
    ? GENERATOR_TEMPLATES.filter(t => importantTypes.includes(t.id))
    : GENERATOR_TEMPLATES;

  // Barcode types
  const barcodeTypes: GeneratorTemplateId[] = [
    'product-code', 'ean-13', 'ean-8', 'upc-a', 'code-128', 'code-39', 'itf-14',
    'code-93', 'pharmacode', 'msi-plesey', 'codabar'
  ];

  const qrCodeTemplates = displayedTemplates.filter(t => !barcodeTypes.includes(t.id));
  const barcodeTemplates = displayedTemplates.filter(t => barcodeTypes.includes(t.id));
  const generationComplete = Boolean(generatedCode && generationProgress >= 100 && !errorMessage);

  const selectedTemplate = useMemo(
    () => getGeneratorTemplate(selectedTemplateId),
    [selectedTemplateId]
  );

  useEffect(() => {
    void refreshClipboardSuggestion();
  }, []);

  useEffect(() => {
    Animated.timing(completeIconProgress, {
      toValue: generationComplete ? 1 : 0,
      duration: generationComplete ? 260 : 140,
      easing: generationComplete ? Easing.out(Easing.back(1.4)) : Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [completeIconProgress, generationComplete]);

  const applyTemplateSetup = (templateId: GeneratorTemplateId, values: Record<string, string>) => {
    setSelectedTemplateId(templateId);
    setFormValues({
      ...createInitialGeneratorValues(templateId),
      ...values,
    });
    setErrorMessage('');
    setGeneratedCode(null);
    setGenerationProgress(0);
  };

  const refreshClipboardSuggestion = async () => {
    setIsCheckingClipboard(true);

    try {
      const clipboardValue = (await Clipboard.getStringAsync()).trim();
      setClipboardSuggestion(suggestGeneratorSetupFromRawContent(clipboardValue));
    } catch {
      setClipboardSuggestion(null);
    } finally {
      setIsCheckingClipboard(false);
    }
  };

  const handleTemplateSelect = (templateId: GeneratorTemplateId) => {
    applyTemplateSetup(templateId, {});
  };

  const handleFieldChange = (fieldKey: string, value: string) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [fieldKey]: value,
    }));
    setErrorMessage('');
    setGeneratedCode(null);
    setGenerationProgress(0);
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
      Keyboard.dismiss();
      pendingPreviewScrollRef.current = true;
      setGenerationProgress(8);
      const content = buildGeneratorContent(selectedTemplateId, formValues);
      const barcodeSymbology = getBarcodeSymbologyForTemplate(selectedTemplateId, content);
      const generatedImage = barcodeSymbology
        ? createBarcodeImage(content, barcodeSymbology)
        : createQrCodeImage(content);

      setGeneratedCode(generatedImage);
      setErrorMessage('');
      setTimeout(() => {
        setGenerationProgress(100);
      }, 180);
      savePreset({
        templateId: selectedTemplateId,
        templateTitle: selectedTemplate.title,
        summary: getGeneratorTemplateSummary(selectedTemplateId, formValues),
        values: { ...formValues },
        content,
      });
    } catch (error) {
      pendingPreviewScrollRef.current = false;
      setGeneratedCode(null);
      setErrorMessage(
        error instanceof Error ? error.message : 'The code image could not be generated.'
      );
      setGenerationProgress(0);
    }
  };

  const scrollToPreview = () => {
    if (!pendingPreviewScrollRef.current || previewYRef.current <= 0) {
      return;
    }

    pendingPreviewScrollRef.current = false;
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, previewYRef.current - spacing.md),
        animated: true,
      });
    }, 120);
  };

  const handlePreviewLayout = (event: LayoutChangeEvent) => {
    previewYRef.current = event.nativeEvent.layout.y;
    scrollToPreview();
  };

  useEffect(() => {
    if (generatedCode) {
      scrollToPreview();
    }
  }, [generatedCode]);

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
      const isBarcode = generatedCode.kind === 'barcode';
      const result = await saveQrCodeImage(
        generatedCode.imageBase64,
        isBarcode ? 'barcode' : 'qr-code'
      );

      if (!result) {
        return;
      }

      setNoticeDialog({
        visible: true,
        title: Platform.OS === 'web' ? 'Download Started' : 'Image Saved',
        message:
          Platform.OS === 'web'
            ? `Your ${isBarcode ? 'barcode' : 'QR code'} is downloading as ${result.fileName}.`
            : result.uri
              ? `Saved as ${result.fileName}.`
              : `${result.fileName} is ready in the app documents folder.`,
      });
    } catch (error) {
      setNoticeDialog({
        visible: true,
        title: 'Save Failed',
        message: error instanceof Error ? error.message : 'The code image could not be saved.',
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
            ref={scrollViewRef}
            style={styles.container}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.headerTopRow}>
                <Text style={[styles.title, { color: theme.text.primary }]}>Generate Codes</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.supportIconButton,
                    {
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                  onPress={() => setSupportDialogVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Contact support"
                >
                  <SupportHeadsetIcon size={21} color={theme.accent} />
                </Pressable>
              </View>
              <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                Pick a format, fill in the details, and export the generated code as a PNG image.
              </Text>
            </View>

            {showSmartStart && clipboardSuggestion ? (
              <Card style={styles.sectionCard} padding={spacing.lg}>
                <View style={styles.smartStartHeader}>
                  <View style={styles.smartStartCopy}>
                    <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Smart Start</Text>
                    <Text style={[styles.smartStartText, { color: theme.text.secondary }]}>
                      Detect clipboard content and jump back into recent generator presets.
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.refreshButton,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                        opacity: pressed ? 0.78 : 1,
                      },
                    ]}
                    onPress={refreshClipboardSuggestion}
                    disabled={isCheckingClipboard}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={16}
                      color={theme.text.secondary}
                    />
                  </Pressable>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.quickStartPressable,
                    {
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                  onPress={() => applyTemplateSetup(clipboardSuggestion.templateId, clipboardSuggestion.values)}
                >
                  <View style={styles.quickStartContent}>
                    <Text style={[styles.quickStartTitle, { color: theme.text.primary }]}>
                      {clipboardSuggestion.title}
                    </Text>
                    <Text style={[styles.quickStartHint, { color: theme.text.secondary }]}>
                      {clipboardSuggestion.subtitle}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward-circle-outline" size={22} color={theme.accent} />
                </Pressable>
              </Card>
            ) : null}

            {recentPresets.length > 0 ? (
              <View style={styles.recentPresetsBlock}>
                <View style={styles.recentPresetsHeader}>
                  <Text style={[styles.recentPresetsLabel, { color: theme.text.secondary }]}>
                    Recent Presets
                  </Text>
                  {recentPresets.length > 3 && (
                    <Pressable
                      onPress={() => setPresetsCollapsed(!presetsCollapsed)}
                      style={styles.collapseButton}
                    >
                      <Ionicons
                        name={presetsCollapsed ? 'chevron-down' : 'chevron-up'}
                        size={20}
                        color={theme.text.secondary}
                      />
                    </Pressable>
                  )}
                </View>
                {(presetsCollapsed ? recentPresets.slice(0, 3) : recentPresets).map((preset) => (
                  <View
                    key={preset.id}
                    style={[
                      styles.presetRow,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.presetRowContent,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => applyTemplateSetup(preset.templateId, preset.values)}
                    >
                      <Text style={[styles.presetTitle, { color: theme.text.primary }]}>
                        {preset.templateTitle}
                      </Text>
                      <Text style={[styles.presetSummary, { color: theme.text.secondary }]}>
                        {preset.summary}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.presetRemoveButton}
                      onPress={() => removePreset(preset.id)}
                    >
                      <Ionicons name="close-outline" size={20} color={theme.text.tertiary} />
                    </Pressable>
                  </View>
                ))}
                {presetsCollapsed && recentPresets.length > 3 && (
                  <View style={styles.moreIndicator}>
                    <Text style={[styles.moreIndicatorText, { color: theme.text.tertiary }]}>•••</Text>
                  </View>
                )}
              </View>
            ) : null}

          <Card style={styles.sectionCard} padding={spacing.lg}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Code Type</Text>
              <Pressable onPress={() => setTypesCollapsed(!typesCollapsed)} style={styles.collapseButton}>
                <Ionicons
                  name={typesCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={20}
                  color={theme.text.secondary}
                />
              </Pressable>
            </View>

            <View style={styles.templateGrid}>
              {qrCodeTemplates.map((template) => (
                <Chip
                  key={template.id}
                  title={template.title}
                  selected={template.id === selectedTemplateId}
                  onPress={() => handleTemplateSelect(template.id)}
                />
              ))}
            </View>

            {barcodeTemplates.length > 0 && (
              <>
                <View style={[styles.separator, { backgroundColor: theme.border }]} />
                <Text style={[styles.barcodeSectionTitle, { color: theme.text.tertiary }]}>Barcodes</Text>
                <View style={styles.templateGrid}>
                  {barcodeTemplates.map((template) => (
                    <Chip
                      key={template.id}
                      title={template.title}
                      selected={template.id === selectedTemplateId}
                      onPress={() => handleTemplateSelect(template.id)}
                    />
                  ))}
                </View>
              </>
            )}
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
              {errorMessage || 'QR templates export QR images. Barcode templates export matching barcode PNGs.'}
            </Text>

            <View style={styles.progressBlock}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: generationComplete ? theme.success : theme.text.secondary }]}>
                  Generation Progress
                </Text>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.progressCompleteBadge,
                    {
                      opacity: completeIconProgress,
                      backgroundColor: theme.success,
                      transform: [
                        {
                          scale: completeIconProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.72, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </Animated.View>
              </View>
              <LiquidProgress value={generatedCode ? generationProgress : 0} complete={generationComplete} />
            </View>

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
                icon={barcodeTypes.includes(selectedTemplateId) ? 'barcode-outline' : 'qr-code-outline'}
                onPress={handleGenerate}
                theme={theme}
                isDark={isDark}
              />
            </View>
          </Card>

          {generatedCode && (
            <View onLayout={handlePreviewLayout}>
              <Card style={styles.sectionCard} padding={spacing.lg}>
                <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Preview</Text>
                <Text style={[styles.previewTitle, { color: theme.text.primary }]}>
                  {selectedTemplate.title}
                </Text>

                <View
                  style={[
                    styles.previewSurface,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: generatedCode.imageUri }}
                    style={[
                      styles.previewImage,
                      generatedCode.kind === 'barcode' && styles.barcodePreviewImage,
                    ]}
                    resizeMode="contain"
                  />
                </View>

                <Text style={[styles.previewLabel, { color: theme.text.secondary }]}>
                  {generatedCode.kind === 'barcode' ? 'Barcode Data' : 'Encoded Content'}
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
            </View>
          )}

          <View style={styles.adBlock}>
            <AdBanner placement="inline" size="medium" />
          </View>
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
      <SupportDialog
        visible={supportDialogVisible}
        onClose={() => setSupportDialogVisible(false)}
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
              backgroundColor: theme.surfaceStrong,
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
  const hasGradient = isPrimary && !disabled && theme.accentGradient && theme.accentGradient.length >= 2;
  const backgroundColor = disabled
    ? isDark
      ? '#1A1C1F'
      : '#ECEEF1'
    : isPrimary && !hasGradient
      ? theme.accent
      : isDark
        ? '#090A0C'
        : '#FFFFFF';
  const borderColor = disabled
    ? theme.border
    : isPrimary
      ? theme.accent
      : theme.border;
  const iconColor = disabled ? theme.text.tertiary : isPrimary ? '#FFFFFF' : theme.text.primary;
  const textColor = disabled ? theme.text.tertiary : isPrimary ? '#FFFFFF' : theme.text.primary;

  const buttonContent = (
    <>
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={[styles.actionButtonText, { color: textColor }]}>{title}</Text>
    </>
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: hasGradient ? undefined : backgroundColor,
          borderColor: hasGradient ? theme.accent : borderColor,
          borderWidth: 1,
          opacity: pressed ? 0.82 : 1,
          overflow: hasGradient ? 'hidden' : 'visible',
        },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {hasGradient ? (
        <>
          <LinearGradient
            colors={theme.accentGradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionButtonAbsoluteGradient}
          />
          {buttonContent}
        </>
      ) : (
        buttonContent
      )}
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
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  supportIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartStartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  smartStartCopy: {
    flex: 1,
  },
  smartStartText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartCard: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 84,
    justifyContent: 'center',
  },
  quickStartPressable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  quickStartContent: {
    flex: 1,
    gap: spacing.xs,
  },
  quickStartTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  quickStartHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  recentPresetsBlock: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  recentPresetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentPresetsLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  presetRowContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  presetTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  presetSummary: {
    marginTop: 2,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  presetRemoveButton: {
    paddingHorizontal: spacing.md,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreIndicator: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  moreIndicatorText: {
    fontSize: 16,
    letterSpacing: 2,
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
  adBlock: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  collapseButton: {
    padding: spacing.xs,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  separator: {
    height: 1,
    marginVertical: spacing.md,
  },
  barcodeSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
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
  progressBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  progressHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  progressCompleteBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
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
  actionButtonGradientWrapper: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  actionButtonAbsoluteGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  actionButtonGradientContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
  barcodePreviewImage: {
    aspectRatio: 2.35,
    maxWidth: 360,
    maxHeight: 180,
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
