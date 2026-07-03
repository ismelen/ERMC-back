import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { colors, hexToRgba } from '../../theme/colors';

export default function STextInput({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      style={[
        {
          borderColor: hexToRgba(colors.outline_variant, 0.2),
          borderWidth: 1,
          borderRadius: 8,
          backgroundColor: colors.surface_container_low,
          color: colors.on_primary,
        },
        style,
      ]}
      {...props}
      placeholderTextColor={colors.on_surface_variant}
    />
  );
}
