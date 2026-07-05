import React, { useEffect, useState } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { colors, hexToRgba } from '../../theme/colors';
import { useSafeAreaFrame } from 'react-native-safe-area-context';

export default function STextInput({ style, value: init, onChangeText, ...props }: TextInputProps) {
  const [value, setValue] = useState(init ?? '');

  useEffect(() => {
    onChangeText?.(value);
  }, [value]);

  return (
    <TextInput
      value={value}
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
      onChangeText={(e) => setValue(e)}
    />
  );
}
