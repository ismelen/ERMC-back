import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { colors, hexToRgba } from '../../theme/colors';

export default function STextInput({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      style={[
        {
          borderRadius: 8,
          backgroundColor: colors.surface_container_low,
          color: colors.on_background,
          paddingHorizontal: 12,
        },
        style,
      ]}
      {...props}
      placeholderTextColor={hexToRgba(colors.on_background, 0.3)}
    />
  );
}
