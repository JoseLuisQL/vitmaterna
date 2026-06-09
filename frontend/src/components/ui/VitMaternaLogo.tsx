import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface VitMaternaLogoProps {
  size?: number;
  color?: 'pink' | 'purple' | 'white';
}

export function VitMaternaLogo({ size = 100 }: VitMaternaLogoProps) {
  return (
    <View style={{ 
      width: size, 
      height: size, 
      justifyContent: 'center', 
      alignItems: 'center',
    }}>
      <Image 
        source={require('../../../assets/vitmaterna_logo.png')} 
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}
