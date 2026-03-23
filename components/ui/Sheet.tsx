import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, PanResponder } from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme, darkTheme, spacing, borderRadius, typography } from '../../constants/theme';

const { height: screenHeight } = Dimensions.get('window');

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
}

export function Sheet({ visible, onClose, children, snapPoints = [0.5, 0.9] }: SheetProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  
  const [translateY, setTranslateY] = React.useState(screenHeight);

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        const newY = screenHeight * (1 - snapPoints[0]) + gestureState.dy;
        setTranslateY(Math.max(newY, screenHeight * (1 - snapPoints[snapPoints.length - 1])));
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose = gestureState.dy > 50 && gestureState.vy > 500;
        
        if (shouldClose) {
          setTranslateY(screenHeight);
          onClose();
        } else {
          setTranslateY(screenHeight * (1 - snapPoints[0]));
        }
      },
    })
  ).current;

  React.useEffect(() => {
    if (visible) {
      setTranslateY(screenHeight * (1 - snapPoints[0]));
    } else {
      setTranslateY(screenHeight);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <View
        style={[
          styles.backdrop,
          { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        ]}
      >
        <Pressable style={styles.backdropPressable} onPress={onClose} />
      </View>
      
      <View 
        style={[styles.sheet, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        <View style={styles.content}>{children}</View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: screenHeight,
    backgroundColor: 'transparent',
    zIndex: 1001,
  },
  handle: {
    width: 36,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  content: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
  },
});
