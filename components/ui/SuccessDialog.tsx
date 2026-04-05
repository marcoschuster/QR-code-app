import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Button } from './Button';
import { borderRadius, spacing, typography } from '../../constants/theme';

interface SuccessDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function SuccessDialog({
  visible,
  title,
  message,
  onClose,
}: SuccessDialogProps) {
  const { theme, isDark } = useAppTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <BlurView 
          intensity={isDark ? 30 : 20} 
          tint={isDark ? "dark" : "light"} 
          style={StyleSheet.absoluteFill} 
        />
        <Pressable style={s.backdrop} onPress={onClose} />
        
        <View style={[
          s.dialog, 
          { 
            backgroundColor: theme.surface, 
            shadowColor: theme.shadow,
            borderColor: theme.border,
            borderWidth: 1,
          }
        ]}>
          <View style={s.iconContainer}>
            <View style={[s.iconCircle, { backgroundColor: theme.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={32} color={theme.success} />
            </View>
          </View>
          
          <Text style={[s.title, { color: theme.text.primary }]}>{title}</Text>
          <Text style={[s.message, { color: theme.text.secondary }]}>{message}</Text>
          
          <View style={s.actions}>
            <View style={s.buttonWrapper}>
              <Button 
                title="OK" 
                onPress={onClose} 
                variant="primary"
                size="medium"
              />
            </View>
          </View>
        </View>
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
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
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
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  buttonWrapper: {
    flex: 1,
  },
});
