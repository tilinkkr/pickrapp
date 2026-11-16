import { StyleSheet } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';

/** Drawing space shared by the illustrated maps (search and tracking). */
export const ART_SIZE = 360;

const LAND = '#EEF0EC';

/**
 * A quiet, illustrated street map: blocks, a park, a backwater and a few
 * roads. Purely decorative, so screen readers skip it; anything meaningful
 * (pins, trucks, labels) is drawn on top by the caller.
 */
export function MapArt() {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${ART_SIZE} ${ART_SIZE}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <Rect x={0} y={0} width={ART_SIZE} height={ART_SIZE} fill={LAND} />
      <G fill="#E3E7E0">
        <Rect x={14} y={14} width={86} height={70} rx={8} />
        <Rect x={124} y={14} width={64} height={54} rx={8} />
        <Rect x={212} y={14} width={60} height={40} rx={8} />
        <Rect x={14} y={112} width={70} height={84} rx={8} />
        <Rect x={244} y={124} width={100} height={60} rx={8} />
        <Rect x={110} y={240} width={90} height={60} rx={8} />
        <Rect x={244} y={216} width={58} height={70} rx={8} />
        <Rect x={14} y={232} width={70} height={52} rx={8} />
      </G>
      <Rect x={288} y={14} width={58} height={88} rx={14} fill="#D7EAD0" />
      <Rect x={124} y={124} width={86} height={56} rx={14} fill="#D7EAD0" />
      <Path d="M 0 312 Q 70 296 120 330 T 240 336 T 360 318 L 360 360 L 0 360 Z" fill="#CFE2EF" />
      <G stroke="#FFFFFF" strokeLinecap="round" fill="none">
        <Path d="M 0 100 L 360 100" strokeWidth={10} />
        <Path d="M 0 214 L 360 214" strokeWidth={10} />
        <Path d="M 106 0 L 106 310" strokeWidth={8} />
        <Path d="M 228 0 L 228 310" strokeWidth={10} />
        <Path d="M 0 160 L 106 160" strokeWidth={5} />
        <Path d="M 228 110 L 360 110" strokeWidth={5} />
        <Path d="M 106 214 L 228 300" strokeWidth={6} />
        <Path d="M 300 214 L 300 300" strokeWidth={5} />
      </G>
    </Svg>
  );
}
