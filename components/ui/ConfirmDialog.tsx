import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Button } from './Button';
import { LiquidGlassSurface } from './LiquidGlassSurface';
import { borderRadius, spacing, typography } from '../../constants/theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmDialogProps) {
  const { theme, isDark } = useAppTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={s.overlay}>
        <BlurView 
          intensity={isDark ? 30 : 20} 
          tint={isDark ? "dark" : "light"} 
          style={StyleSheet.absoluteFill} 
        />
        <Pressable style={[s.backdrop, { backgroundColor: theme.backdrop }]} onPress={onCancel} />
        
        <LiquidGlassSurface
          style={s.dialog}
          contentStyle={s.dialogContent}
          borderRadius={borderRadius.lg}
          blurIntensity={isDark ? 44 : 34}
          enableRipple={false}
        >
          <Text style={[s.title, { color: theme.text.primary }]}>{title}</Text>
          <Text style={[s.message, { color: theme.text.secondary }]}>{message}</Text>
          
          <View style={s.actions}>
            <View style={s.buttonWrapper}>
              <Button 
                title={cancelLabel} 
                onPress={onCancel} 
                variant="secondary" 
                size="medium"
              />
            </View>
            <View style={s.buttonWrapper}>
              <Button 
                title={confirmLabel} 
                onPress={onConfirm} 
                variant={isDestructive ? 'danger' : 'primary'}
                size="medium"
              />
            </View>
          </View>
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
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  buttonWrapper: {
    flex: 1,
  },
});
