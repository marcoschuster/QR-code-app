import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { AccentColor } from '../../constants/types';
import { accentColors, getAccentColor, getAccentGradient } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { spacing, borderRadius, typography } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORBIT_RADIUS = Math.min(SCREEN_WIDTH * 0.32, 140);
const COLOR_SIZE = 36;

const classicColors: AccentColor[] = ['red', 'blue', 'green', 'purple', 'orange', 'pink', 'teal', 'indigo'];
const gradientColors: AccentColor[] = ['sunset', 'ocean', 'forest', 'berry', 'aurora', 'peach', 'meadow', 'twilight'];
const gradientLabels: Record<AccentColor, string | undefined> = {
  red: undefined,
  blue: undefined,
  green: undefined,
  purple: undefined,
  orange: undefined,
  pink: undefined,
  teal: undefined,
  indigo: undefined,
  sunset: 'Sunset',
  ocean: 'Ocean',
  forest: 'Forest',
  berry: 'Berry',
  aurora: 'Aurora',
  peach: 'Golden Hour',
  meadow: 'Meadow',
  twilight: 'Twilight',
};

interface ColorOrbitPickerProps {
  selectedColor: AccentColor;
  onSelect: (color: AccentColor) => void;
}

export function ColorOrbitPicker({ selectedColor, onSelect }: ColorOrbitPickerProps) {
  const { theme } = useAppTheme();
  const [expandedGradient, setExpandedGradient] = useState<AccentColor | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const gradientAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedColor]);

  const handleColorSelect = (color: AccentColor) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(color);
  };

  const handleGradientPress = (color: AccentColor) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (expandedGradient === color) {
      Animated.timing(gradientAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => setExpandedGradient(null));
    } else {
      setExpandedGradient(color);
      Animated.timing(gradientAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
    onSelect(color);
  };

  const isGradient = (color: AccentColor): boolean => {
    return !!accentColors[color].gradient;
  };

  const renderClassicOrbit = () => {
    const angleStep = (2 * Math.PI) / classicColors.length;
    
    return classicColors.map((color, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const x = Math.cos(angle) * ORBIT_RADIUS;
      const y = Math.sin(angle) * ORBIT_RADIUS;
      const isSelected = selectedColor === color;

      return (
        <Animated.View
          key={color}
          style={[
            styles.orbitColor,
            {
              transform: [
                { translateX: x },
                { translateY: y },
                { scale: isSelected ? pulseAnim : 1 },
              ],
            },
          ]}
        >
          <Pressable
            onPress={() => handleColorSelect(color)}
            style={[
              styles.colorButton,
              {
                backgroundColor: getAccentColor(color),
                borderWidth: isSelected ? 3 : 2,
                borderColor: isSelected ? theme.text.primary : 'transparent',
                shadowColor: getAccentColor(color),
                shadowOpacity: isSelected ? 0.5 : 0.3,
                shadowRadius: isSelected ? 12 : 6,
                shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
              },
            ]}
          />
        </Animated.View>
      );
    });
  };

  const renderGradientCards = () => {
    return gradientColors.map((color) => {
      const gradient = getAccentGradient(color);
      const isSelected = selectedColor === color;
      const isExpanded = expandedGradient === color;
      const colors = (gradient && gradient.length >= 2
        ? gradient
        : [getAccentColor(color), getAccentColor(color)]) as any;

      return (
        <Animated.View
          key={color}
          style={[
            styles.gradientCardWrapper,
            {
              width: isExpanded ? '100%' : '100%',
              marginRight: isExpanded ? 0 : 0,
              marginBottom: isExpanded ? 12 : 12,
            },
          ]}
        >
          <Pressable
            onPress={() => handleGradientPress(color)}
            style={[
              styles.gradientCard,
              {
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? theme.accent : theme.border,
                height: isExpanded ? 86 : 62,
              },
            ]}
          >
            <LinearGradient
              colors={colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientInner}
            >
              <View style={styles.gradientPreview}>
                <View style={styles.gradientStops}>
                  {colors.map((stop: string, index: number) => (
                    <View
                      key={`${color}-${stop}-${index}`}
                      style={[styles.previewDot, { backgroundColor: stop }]}
                    />
                  ))}
                </View>
                {isExpanded ? (
                  <Text style={[styles.previewLabel, { color: '#FFFFFF' }]}>
                    {gradientLabels[color] ?? color.charAt(0).toUpperCase() + color.slice(1)}
                  </Text>
                ) : null}
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* Classic Color Orbit */}
      <View style={styles.orbitSection}>
        <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Classic Colors</Text>
        <View style={styles.orbitContainer}>
          {/* Center preview */}
          <View style={[styles.centerPreview, { borderColor: theme.border }]}>
            {getAccentGradient(selectedColor) ? (
              <LinearGradient
                colors={getAccentGradient(selectedColor) as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.centerPreviewInner, { borderColor: theme.border }]}
              >
                <Animated.View
                  style={[
                    styles.centerDot,
                    {
                      backgroundColor: getAccentColor(selectedColor),
                      transform: [{ scale: pulseAnim }],
                      shadowColor: getAccentColor(selectedColor),
                      shadowOpacity: 0.6,
                      shadowRadius: 16,
                      shadowOffset: { width: 0, height: 4 },
                    },
                  ]}
                />
              </LinearGradient>
            ) : (
              <View style={[styles.centerPreviewInner, { borderColor: theme.border, backgroundColor: getAccentColor(selectedColor) + '20' }]}>
                <Animated.View
                  style={[
                    styles.centerDot,
                    {
                      backgroundColor: getAccentColor(selectedColor),
                      transform: [{ scale: pulseAnim }],
                      shadowColor: getAccentColor(selectedColor),
                      shadowOpacity: 0.6,
                      shadowRadius: 16,
                      shadowOffset: { width: 0, height: 4 },
                    },
                  ]}
                />
              </View>
            )}
          </View>
          {/* Orbit ring */}
          <View style={[styles.orbitRing, { borderColor: theme.border + '40' }]} />
          {/* Color buttons */}
          {renderClassicOrbit()}
        </View>
      </View>

      {/* Gradient Cards */}
      <View style={styles.gradientSection}>
        <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Gradient Themes</Text>
        <View style={styles.gradientGrid}>
          {renderGradientCards()}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  orbitSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  orbitContainer: {
    width: ORBIT_RADIUS * 2 + COLOR_SIZE + 20,
    height: ORBIT_RADIUS * 2 + COLOR_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPreview: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPreviewInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  orbitRing: {
    position: 'absolute',
    width: ORBIT_RADIUS * 2,
    height: ORBIT_RADIUS * 2,
    borderRadius: ORBIT_RADIUS,
    borderWidth: 1,
  },
  orbitColor: {
    position: 'absolute',
    width: COLOR_SIZE,
    height: COLOR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButton: {
    width: COLOR_SIZE,
    height: COLOR_SIZE,
    borderRadius: COLOR_SIZE / 2,
    elevation: 4,
  },
  gradientSection: {
    paddingHorizontal: spacing.xs,
  },
  gradientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gradientCardWrapper: {
    overflow: 'hidden',
  },
  gradientCard: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  gradientInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  gradientIndicator: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  gradientDot: {
    borderRadius: 50,
  },
  gradientPreview: {
    alignItems: 'center',
    gap: 5,
  },
  gradientStops: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  previewDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  previewLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
