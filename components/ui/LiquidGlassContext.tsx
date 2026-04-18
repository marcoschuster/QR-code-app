import React, { createContext, RefObject, useContext } from 'react';
import { View } from 'react-native';

const LiquidGlassBlurTargetContext = createContext<RefObject<View | null> | null>(null);

interface LiquidGlassProviderProps {
  children: React.ReactNode;
  blurTargetRef: RefObject<View | null>;
}

export function LiquidGlassProvider({ children, blurTargetRef }: LiquidGlassProviderProps) {
  return (
    <LiquidGlassBlurTargetContext.Provider value={blurTargetRef}>
      {children}
    </LiquidGlassBlurTargetContext.Provider>
  );
}

export function useLiquidGlassBlurTarget() {
  return useContext(LiquidGlassBlurTargetContext);
}
