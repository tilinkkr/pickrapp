import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
};

/**
 * The app's standard pressable. Feedback is a brief dim only: cards do not
 * shrink, bounce or jump when touched (calm motion, 2026-11-13). The name is
 * kept because many screens import it.
 */
export function PressableScale({ style, ...rest }: PressableScaleProps) {
  return <Pressable {...rest} style={({ pressed }) => [style, pressed && PRESSED]} />;
}

const PRESSED: ViewStyle = { opacity: 0.72 };
