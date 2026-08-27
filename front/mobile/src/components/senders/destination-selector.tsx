import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { colors } from '../../theme/colors';
import SButton from '../shared/SButton';
import SText from '../shared/SText';
import { useTranslation } from 'react-i18next';

interface Props {
  toCloud: boolean;
  onChange(toCloud: boolean): void;
}

export default function DestinationSelector({ toCloud, onChange }: Props) {
  const [cloudDestination, setCloudDestination] = useState(toCloud);
  const { t } = useTranslation();

  const destinations: { labelKey: string; value: boolean }[] = [
    { labelKey: 'destination.local', value: false },
    { labelKey: 'destination.cloud', value: true },
  ];

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
          key={dest.labelKey}
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
            {t(dest.labelKey)}
          </SText>
        </SButton>
      ))}
    </View>
  );
}
