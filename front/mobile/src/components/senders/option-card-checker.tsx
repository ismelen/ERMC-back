import React from 'react';
import { View } from 'react-native';
import { colors } from '../../theme/colors';
import SSwitch from '../shared/SSwitch';
import SText from '../shared/SText';

interface Props {
  checked: boolean;
  onChange(checked: boolean): void;
  label: string;
  text: string;
}

export default function OptionCardChecker({ checked, onChange, label, text }: Props) {
  return (
    <View
      style={{
        borderRadius: 12,
        backgroundColor: colors.surface_container_lowest,
        overflow: 'hidden',
        padding: 10,
        boxShadow: colors.boxShadow,
      }}
    >
      <SText style={{ fontFamily: 'semibold', fontSize: 16, color: colors.on_background }}>
        {label}
      </SText>
      <View style={{ flexDirection: 'row', gap: 10, paddingRight: 10 }}>
        <SText style={{ fontSize: 14, color: colors.on_surface_variant, flex: 1, flexShrink: 1 }}>
          {text}
        </SText>
        <SSwitch value={checked} onValueChange={onChange} />
      </View>
    </View>
  );
}
