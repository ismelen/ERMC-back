import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { colors } from '../../theme/colors';
import SButton from '../shared/SButton';
import SText from '../shared/SText';

const destinations: { name: string; value: boolean }[] = [
  { name: 'local', value: false },
  { name: 'cloud', value: true },
];

interface Props {
  toCloud: boolean;
  onChange(toCloud: boolean): void;
}

export default function DestinationSelector({ toCloud, onChange }: Props) {
  const [cloudDestination, setCloudDestination] = useState(toCloud);

  useEffect(() => {
    onChange(cloudDestination);
  }, [cloudDestination]);

  return (
    <View
      style={{
        borderRadius: 12,
        backgroundColor: colors.surface_container_lowest,
        boxShadow: colors.boxShadow,
        padding: 5,
        flexDirection: 'row',
        gap: 5,
      }}
    >
      {destinations.map((dest) => (
        <SButton
          key={dest.name}
          onPress={() => setCloudDestination(dest.value)}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            borderRadius: 7,
            backgroundColor:
              dest.value === cloudDestination ? colors.primary_container : 'transparent',
          }}
        >
          <SText
            style={{
              fontFamily: 'semibold',
              color: dest.value === cloudDestination ? colors.on_primary : colors.on_surface,
            }}
          >
            {dest.name[0].toUpperCase() + dest.name.slice(1)}
          </SText>
        </SButton>
      ))}
    </View>
  );
}
