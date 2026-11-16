import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Brand } from '@/constants/theme';

import { IN, seg, type SplashClocks, T } from './timeline';

/** Small deterministic PRNG so the particle field is identical on every launch and render. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seeded(20261103);

/**
 * Positions are in truck widths (x) and truck heights (y) from the truck's
 * centre. Like the logo, the cloud sits above and behind the truck.
 */
const PARTICLES = Array.from({ length: 30 }, () => {
  const u = rand();
  const v = rand();
  return {
    x: -0.8 + u * 0.95,
    y: -1.8 + v * (1.4 + 0.6 * (1 - u)),
    size: 2 + rand() * 7,
    alpha: 0.35 + rand() * 0.6,
    period: 900 + rand() * 1400,
    phase: rand() * Math.PI * 2,
    delay: rand() * 700,
    drift: 10 + rand() * 40,
    depth: 0.4 + rand() * 0.6,
  };
});

type Particle = (typeof PARTICLES)[number];

type BokehProps = SplashClocks & {
  centerX: number;
  centerY: number;
  truckWidth: number;
  truckHeight: number;
};

export function Bokeh({ centerX, centerY, truckWidth, truckHeight, ...clocks }: BokehProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PARTICLES.map((particle, i) => (
        <BokehParticle
          key={i}
          particle={particle}
          left={centerX + particle.x * truckWidth}
          top={centerY + particle.y * truckHeight}
          {...clocks}
        />
      ))}
    </View>
  );
}

type BokehParticleProps = SplashClocks & { particle: Particle; left: number; top: number };

function BokehParticle({ particle: p, left, top, intro, exit, motion }: BokehParticleProps) {
  const halo = p.size * 3;

  const style = useAnimatedStyle(() => {
    const t = intro.value;
    const e = exit.value;
    const twinkle = 0.6 + 0.4 * Math.sin((t / p.period) * Math.PI * 2 + p.phase);
    const fadeIn = seg(t, T.particlesIn + p.delay, 600);
    const fadeOut = 1 - seg(e, 0, 420);
    const drift = (-p.drift * t) / 3000;
    // On exit the field streaks left, as if the truck pulled it along.
    const streak = -140 * p.depth * seg(e, 0, 500, IN);
    return {
      opacity: p.alpha * twinkle * fadeIn * fadeOut,
      transform: [{ translateX: (drift + streak) * motion }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: left - halo / 2, top: top - halo / 2, width: halo, height: halo, borderRadius: halo / 2 },
        style,
      ]}>
      <View style={[styles.core, { width: p.size, height: p.size, borderRadius: p.size / 2 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246, 185, 26, 0.16)',
  },
  core: {
    backgroundColor: Brand.logoAmber,
  },
});
