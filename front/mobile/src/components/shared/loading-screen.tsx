import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, hexToRgba } from '../../theme/colors';
import SIcon from '../icons/SIcon';

// SVG-less arc spinner using Animated + border trick
function SpinnerRing() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.ringWrapper}>
      <View style={styles.ringOuter} />
      <Animated.View style={[styles.ringSpinner, { transform: [{ rotate: spin }] }]} />
      <View style={styles.iconCircle}>
        <SIcon name="open_book" color={colors.on_primary} size={40} type="outlined" />
      </View>
    </View>
  );
}

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
}

export default function LoadingScreen({
  title = 'Sending your book…',
  subtitle = "Optimizing for your e-reader. This won't take long.",
}: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <SpinnerRing />

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const RING_SIZE = 160;
const ICON_SIZE = 110;
const SPINNER_BORDER = 5;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 0,
  },

  // ── Spinner ──────────────────────────────────────────────
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  ringOuter: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: SPINNER_BORDER,
    borderColor: hexToRgba(colors.primary, 0.15),
  },
  ringSpinner: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: SPINNER_BORDER,
    borderColor: 'transparent',
    borderTopColor: colors.primary,
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },

  // ── Book icon ─────────────────────────────────────────────
  bookIcon: {
    width: 44,
    height: 36,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bookLeft: {
    width: 19,
    height: 30,
    backgroundColor: colors.on_primary,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    opacity: 0.9,
    marginRight: 2,
    transform: [{ skewX: '6deg' }],
  },
  bookRight: {
    width: 19,
    height: 30,
    backgroundColor: colors.on_primary,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    opacity: 0.9,
    transform: [{ skewX: '-6deg' }],
  },
  bookSpine: {
    position: 'absolute',
    left: 19,
    bottom: 0,
    width: 4,
    height: 30,
    backgroundColor: hexToRgba(colors.primary_fixed_dim, 0.6),
    borderRadius: 2,
  },

  // ── Text ─────────────────────────────────────────────────
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.on_surface,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },

  // ── Progress bar ─────────────────────────────────────────
  progressWrapper: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: hexToRgba(colors.primary, 0.15),
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    color: colors.outline,
    textTransform: 'uppercase',
  },
});
