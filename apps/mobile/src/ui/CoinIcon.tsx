import Svg, { Circle } from 'react-native-svg';

import { colors } from './tokens';

type Props = { size?: number };

/** The coin: an amber disc with a faint inner ring. Decorative; pair it with a number. */
export function CoinIcon({ size = 16 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessible={false}>
      <Circle cx={10} cy={10} r={9} fill={colors.coin} />
      <Circle
        cx={10}
        cy={10}
        r={5.5}
        fill="none"
        stroke={colors['coin-ink']}
        strokeOpacity={0.35}
        strokeWidth={1.6}
      />
    </Svg>
  );
}
