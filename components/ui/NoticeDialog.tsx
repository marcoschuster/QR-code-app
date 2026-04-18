import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Button } from './Button';
import { LiquidGlassSurface } from './LiquidGlassSurface';
import { borderRadius, spacing, typography } from '../../constants/theme';

interface NoticeDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  tone?: 'info' | 'success' | 'warning' | 'danger';
}

const TONE_CONFIG = {
  info: { icon: 'information-circle' as const, colorKey: 'accent' as const },
  success: { icon: 'checkmark-circle' as const, colorKey: 'success' as const },
  warning: { icon: 'warning' as const, colorKey: 'warning' as const },
  danger: { icon: 'alert-circle' as const, colorKey: 'danger' as const },
};

export function NoticeDialog({
  visible,
  title,
  message,
  onClose,
  tone = 'info',
}: NoticeDialogProps) {
  const { theme, isDark } = useAppTheme();
  const toneConfig = TONE_CONFIG[tone];
  const toneColor = theme[toneConfig.colorKey];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <BlurView
          intensity={isDark ? 30 : 20}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <Pressable style={[s.backdrop, { backgroundColor: theme.backdrop }]} onPress={onClose} />

        <LiquidGlassSurface
          style={s.dialog}
          contentStyle={s.dialogContent}
          borderRadius={borderRadius.lg}
          blurIntensity={isDark ? 44 : 34}
          enableRipple={false}
        >
          <View style={s.iconContainer}>
            <View style={[s.iconCircle, { backgroundColor: `${toneColor}20` }]}>
              <Ionicons name={toneConfig.icon} size={32} color={toneColor} />
            </View>
          </View>

          <Text style={[s.title, { color: theme.text.primary }]}>{title}</Text>
          <Text style={[s.message, { color: theme.text.secondary }]}>{message}</Text>

          <Button title="OK" onPress={onClose} size="medium" />
        </LiquidGlassSurface>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.lg,
  },
  dialogContent: {
    padding: spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
});
