import { Image, type ImageProps } from 'expo-image';
import { useId, useState } from 'react';
import { type ImageSourcePropType, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { LucideIcon } from '@/components/ui/icons';
import type { Tint } from '@/lib/catalog';
import { makeStyles } from '@/lib/app-theme';

type ImagePlaceholderProps = {
  tint: Tint;
  icon: LucideIcon;
  iconSize?: number;
  /** A bundled `require(...)` or URI; the gradient shows until it loads or if it fails. */
  source?: ImageSourcePropType | ImageProps['source'];
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  style?: StyleProp<ViewStyle>;
};

/**
 * Renders a product or vehicle photo using `expo-image` when available.
 * Falls back to the material's colours as a gradient, faint diagonal texture
 * and its icon if no image source is provided or if loading fails.
 */
export function ImagePlaceholder({
  tint,
  icon: Icon,
  iconSize = 36,
  source,
  contentFit = 'cover',
  style,
}: ImagePlaceholderProps) {
  const styles = useStyles();
  const [hasError, setHasError] = useState(false);
  const id = useId().replace(/:/g, '');

  const showImage = Boolean(source) && !hasError;

  return (
    // The tint shows at once, so a photo still loading never leaves a blank hole.
    <View style={[styles.box, { backgroundColor: tint[0] }, style]} aria-hidden>
      {showImage ? (
        <Image
          source={source as ImageProps['source']}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={120}
          cachePolicy="memory-disk"
          priority="high"
          onError={() => setHasError(true)}
        />
      ) : (
        <>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={tint[0]} />
                <Stop offset="1" stopColor={tint[1]} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#g${id})`} />
            {Array.from({ length: 14 }, (_, i) => (
              <Line
                key={i}
                x1={`${i * 12 - 40}%`}
                y1="0%"
                x2={`${i * 12}%`}
                y2="100%"
                stroke="#FFFFFF"
                strokeOpacity={0.07}
                strokeWidth={10}
              />
            ))}
          </Svg>
          <Icon size={iconSize} color="#FFFFFF" strokeWidth={1.5} opacity={0.55} />
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  box: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
