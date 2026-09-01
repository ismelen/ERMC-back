import React from 'react';
import { View } from 'react-native';
import { colors } from '../theme/colors';
import SText from './shared/SText';

export default function AppHeader() {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexDirection: 'row',
        gap: '8',
        marginBottom: 24,
        paddingHorizontal: 24,
      }}
    >
      <SText
        style={{
          fontSize: 28,
          color: colors.primary,
          fontFamily: 'bold',
        }}
      >
        Inkomi
      </SText>
    </View>
  );
}
