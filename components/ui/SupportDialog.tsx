import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../hooks/useAppTheme';
import { borderRadius, spacing, typography } from '../../constants/theme';
import { getOrCreateSupportUserId, getSupportAppVersion, submitSupportRequest } from '../../services/supportClient';

interface SupportDialogProps {
  visible: boolean;
  onClose: () => void;
}

type SupportField = 'name' | 'email' | 'message';

const SUBJECT_OPTIONS = ['Scanning', 'Generator', 'History', 'Settings', 'Privacy'] as const;
const CUSTOM_SUBJECT = 'Custom';
type SubjectOption = typeof SUBJECT_OPTIONS[number] | typeof CUSTOM_SUBJECT;

const INITIAL_FORM = {
  name: '',
  email: '',
  message: '',
};

export function SupportDialog({ visible, onClose }: SupportDialogProps) {
  const { theme, isDark } = useAppTheme();
  const [form, setForm] = useState(INITIAL_FORM);
  const [subjectOption, setSubjectOption] = useState<SubjectOption>('Scanning');
  const [customSubject, setCustomSubject] = useState('');
  const [subjectPickerExpanded, setSubjectPickerExpanded] = useState(false);
  const [userId, setUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [ticketId, setTicketId] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    setErrorMessage('');
    setTicketId('');
    setSubjectPickerExpanded(false);
    void getOrCreateSupportUserId().then(setUserId);
  }, [visible]);

  const updateField = (field: SupportField, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrorMessage('');
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    const trimmedForm = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: subjectOption === CUSTOM_SUBJECT ? customSubject.trim() : subjectOption,
      message: form.message.trim(),
    };

    if (!trimmedForm.name || !trimmedForm.email || !trimmedForm.subject || trimmedForm.message.length < 10) {
      setErrorMessage('Please fill in all fields, choose a subject, and include at least 10 characters in the message.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setTicketId('');

    try {
      const result = await submitSupportRequest(trimmedForm);
      setTicketId(result.ticketId ?? '');
      setForm(INITIAL_FORM);
      setSubjectOption('Scanning');
      setCustomSubject('');
      setSubjectPickerExpanded(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Support request could not be sent right now.'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.backdrop }]}
          onPress={handleClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View
            style={[
              styles.dialog,
              {
                backgroundColor: theme.surfaceStrong,
                borderColor: theme.border,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <View style={[styles.headerIcon, { backgroundColor: theme.accent + '1F' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.accent} />
              </View>
              <View style={styles.headerCopy}>
                <Text style={[styles.title, { color: theme.text.primary }]}>Contact Support</Text>
                <Text style={[styles.subtitle, { color: theme.text.secondary }]}>Send us a message.</Text>
              </View>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={theme.text.secondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <SupportInput
                label="Name"
                value={form.name}
                onChangeText={(value) => updateField('name', value)}
                placeholder="Your name"
                autoCapitalize="words"
              />
              <SupportInput
                label="Email"
                value={form.email}
                onChangeText={(value) => updateField('email', value)}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Subject</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.subjectButton,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                  onPress={() => setSubjectPickerExpanded((expanded) => !expanded)}
                >
                  <Text style={[styles.subjectButtonText, { color: theme.text.primary }]}>
                    {subjectOption === CUSTOM_SUBJECT ? customSubject || CUSTOM_SUBJECT : subjectOption}
                  </Text>
                  <Ionicons
                    name={subjectPickerExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                    size={18}
                    color={theme.text.secondary}
                  />
                </Pressable>

                {subjectPickerExpanded ? (
                  <View style={[styles.subjectOptions, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    {([...SUBJECT_OPTIONS, CUSTOM_SUBJECT] as SubjectOption[]).map((option) => {
                      const isSelected = subjectOption === option;

                      return (
                        <Pressable
                          key={option}
                          style={({ pressed }) => [
                            styles.subjectOption,
                            {
                              backgroundColor: isSelected ? theme.accent + '1F' : 'transparent',
                              opacity: pressed ? 0.8 : 1,
                            },
                          ]}
                          onPress={() => {
                            setSubjectOption(option);
                            setSubjectPickerExpanded(false);
                            setErrorMessage('');
                          }}
                        >
                          <Text
                            style={[
                              styles.subjectOptionText,
                              { color: isSelected ? theme.accent : theme.text.primary },
                            ]}
                          >
                            {option}
                          </Text>
                          {isSelected ? (
                            <Ionicons name="checkmark-outline" size={18} color={theme.accent} />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {subjectOption === CUSTOM_SUBJECT ? (
                  <>
                    <TextInput
                      value={customSubject}
                      onChangeText={(value) => {
                        setCustomSubject(value.slice(0, 20));
                        setErrorMessage('');
                      }}
                      placeholder="Custom subject"
                      placeholderTextColor={theme.text.tertiary}
                      autoCapitalize="sentences"
                      autoCorrect={false}
                      maxLength={20}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          color: theme.text.primary,
                        },
                      ]}
                    />
                    <Text style={[styles.characterCount, { color: theme.text.tertiary }]}>
                      {customSubject.length}/20
                    </Text>
                  </>
                ) : null}
              </View>
              <SupportInput
                label="Message"
                value={form.message}
                onChangeText={(value) => updateField('message', value.slice(0, 2000))}
                placeholder="What happened?"
                multiline
              />
              <Text style={[styles.characterCount, { color: theme.text.tertiary }]}>
                {form.message.length}/2000
              </Text>

              <View style={[styles.metadata, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.metadataText, { color: theme.text.secondary }]}>
                  App version: {getSupportAppVersion()}
                </Text>
                <Text style={[styles.metadataText, { color: theme.text.secondary }]} numberOfLines={1}>
                  User ID: {userId || 'loading...'}
                </Text>
              </View>

              <Text style={[styles.privacyNote, { color: theme.text.secondary }]}>
                By sending, you agree to processing per our privacy policy.
              </Text>

              {errorMessage ? (
                <Text style={[styles.feedbackText, { color: theme.danger }]}>{errorMessage}</Text>
              ) : null}
              {ticketId ? (
                <Text style={[styles.feedbackText, { color: theme.success }]}>
                  Sent. Ticket {ticketId}
                </Text>
              ) : null}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: theme.border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={handleClose}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.text.primary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: theme.accent,
                    opacity: pressed || isSubmitting ? 0.82 : 1,
                  },
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Send</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function SupportInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
}) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text.primary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.text.tertiary}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            color: theme.text.primary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
  },
  multilineInput: {
    minHeight: 128,
    paddingTop: spacing.md,
  },
  subjectButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  subjectButtonText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  subjectOptions: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  subjectOption: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectOptionText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  characterCount: {
    marginTop: -spacing.sm,
    alignSelf: 'flex-end',
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
  },
  metadata: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metadataText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
  },
  privacyNote: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
  feedbackText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
