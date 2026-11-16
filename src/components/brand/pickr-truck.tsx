import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/** Vector of the Pickr logo truck: a box truck facing right with speed lines trailing it. */
export const TRUCK_VIEWBOX = { width: 200, height: 100 } as const;

/** Speed lines end just short of the cargo box; `y` is the top edge. */
export const SPEED_LINES = [
  { y: 13, length: 46 },
  { y: 23, length: 30 },
  { y: 33, length: 54 },
  { y: 43, length: 36 },
  { y: 53, length: 22 },
] as const;
export const SPEED_LINE_END_X = 38;
export const SPEED_LINE_THICKNESS = 5;

const WHEELS = [
  { x: 66, y: 82 },
  { x: 92, y: 82 },
  { x: 172, y: 82 },
];
const WHEEL_ARCH_RADIUS = 14;

/** Cab outline with the window cut out (evenodd). */
const CAB =
  'M146 24 H168 Q174 24 177 29 L186 45 Q190 49 190 55 V69 Q190 73 186 73 H146 Z ' +
  'M154 30 H167 L174 44 H154 Z';

type PickrTruckProps = {
  width: number;
  color?: string;
  /** Draw the speed lines into the SVG. The splash animates them separately instead. */
  withSpeedLines?: boolean;
};

export function PickrTruck({ width, color = Brand.logoAmber, withSpeedLines = false }: PickrTruckProps) {
  const height = (width * TRUCK_VIEWBOX.height) / TRUCK_VIEWBOX.width;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${TRUCK_VIEWBOX.width} ${TRUCK_VIEWBOX.height}`}>
      {withSpeedLines &&
        SPEED_LINES.map((line) => (
          <Rect
            key={line.y}
            x={SPEED_LINE_END_X - line.length}
            y={line.y}
            width={line.length}
            height={SPEED_LINE_THICKNESS}
            rx={SPEED_LINE_THICKNESS / 2}
            fill={color}
          />
        ))}
      <Defs>
        {/* Cuts a gap around each wheel out of the chassis and cab, like the logo. */}
        <Mask id="pickrWheelArches" maskUnits="userSpaceOnUse" x={0} y={0} width={200} height={100}>
          <Rect width={200} height={100} fill="#FFFFFF" />
          {WHEELS.map((wheel) => (
            <Circle key={wheel.x} cx={wheel.x} cy={wheel.y} r={WHEEL_ARCH_RADIUS} fill="#000000" />
          ))}
        </Mask>
      </Defs>
      <Rect x={42} y={10} width={100} height={50} rx={3} fill={color} />
      <G mask="url(#pickrWheelArches)">
        <Rect x={46} y={63} width={104} height={10} fill={color} />
        <Path d={CAB} fill={color} fillRule="evenodd" />
      </G>
      {WHEELS.map((wheel) => (
        <Circle key={wheel.x} cx={wheel.x} cy={wheel.y} r={8.5} stroke={color} strokeWidth={5} fill="none" />
      ))}
    </Svg>
  );
}
