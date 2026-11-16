import { StyleSheet, Text, type TextStyle, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Brand, BrandFonts } from '@/constants/theme';

import { BACK, OUT, seg, type SplashClocks, T } from './timeline';

const WORD = 'PICKR'.split('');
const TAGLINE = 'HEAVY LOGISTICS'.split('');
const TAGLINE_CENTER = (TAGLINE.length - 1) / 2;

type SplashWordmarkProps = SplashClocks & { size: number };

/** "PICKR" rises letter by letter with an amber glint; the tagline spreads out from its centre. */
export function SplashWordmark({ size, ...clocks }: SplashWordmarkProps) {
  const wordText: TextStyle = {
    fontFamily: BrandFonts.display,
    fontSize: size,
    lineHeight: size * 1.12,
    letterSpacing: size * 0.02,
    color: '#FFFFFF',
    includeFontPadding: false,
  };
  const tagSize = size * 0.28;
  const tagText: TextStyle = {
    fontFamily: BrandFonts.medium,
    fontSize: tagSize,
    lineHeight: tagSize * 1.4,
    letterSpacing: tagSize * 0.14,
    color: '#E6EBF0',
    includeFontPadding: false,
  };

  return (
    <View style={styles.column} aria-hidden>
      <View style={styles.row}>
        {WORD.map((char, i) => (
          <WordLetter key={i} char={char} index={i} textStyle={wordText} {...clocks} />
        ))}
      </View>
      <View style={styles.row}>
        {TAGLINE.map((char, i) => (
          <TagLetter key={i} char={char} index={i} textStyle={tagText} {...clocks} />
        ))}
      </View>
    </View>
  );
}

type LetterProps = SplashClocks & { char: string; index: number; textStyle: TextStyle };

function WordLetter({ char, index, textStyle, intro, exit, motion }: LetterProps) {
  const start = T.wordIn + index * 70;

  const style = useAnimatedStyle(() => {
    const t = intro.value;
    const e = exit.value;
    const rise = 1 - seg(t, start, 520, BACK);
    return {
      opacity: seg(t, start, 260) * (1 - seg(e, 0, 260)),
      transform: [
        { translateY: (22 * rise - 12 * seg(e, 0, 260)) * motion },
        { scale: 1 - 0.1 * rise * motion },
      ],
    };
  });

  // An amber copy of the letter flashes over it, one letter after another.
  const glint = useAnimatedStyle(() => ({
    opacity: 0.95 * Math.sin(Math.PI * seg(intro.value, T.glint + index * 70, 420)),
  }));

  return (
    <Animated.View style={style}>
      <Text style={textStyle}>{char}</Text>
      <Animated.Text style={[textStyle, styles.glint, glint]}>{char}</Animated.Text>
    </Animated.View>
  );
}

function TagLetter({ char, index, textStyle, intro, exit, motion }: LetterProps) {
  const start = T.taglineIn + Math.abs(index - TAGLINE_CENTER) * 30;

  const style = useAnimatedStyle(() => {
    const t = intro.value;
    const e = exit.value;
    const gather = (TAGLINE_CENTER - index) * 5 * (1 - seg(t, start, 600, OUT));
    return {
      opacity: seg(t, start, 380) * (1 - seg(e, 0, 260)),
      transform: [{ translateX: gather * motion }, { translateY: -12 * seg(e, 0, 260) * motion }],
    };
  });

  return (
    <Animated.View style={style}>
      <Text style={textStyle}>{char}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  glint: {
    position: 'absolute',
    left: 0,
    top: 0,
    color: Brand.logoAmber,
  },
});
