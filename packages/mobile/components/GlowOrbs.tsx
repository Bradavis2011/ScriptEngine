/**
 * Diffused glow orbs matching the landing page background effect.
 * Uses SVG RadialGradient for a proper smooth falloff — identical to
 * CSS `background + filter: blur(120px)`.
 */
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

const TEAL = '#03EDD6';
const RED  = '#FD1741';

function DiffuseOrb({ color, size, top, left, right }: {
  color: string; size: number;
  top?: number; left?: number; right?: number;
}) {
  const r = size / 2;
  const gradId = color.replace('#', 'g');
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top, left, right, width: size, height: size }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor={color} stopOpacity={0.3} />
            <Stop offset="50%"  stopColor={color} stopOpacity={0.1} />
            <Stop offset="100%" stopColor={color} stopOpacity={0}   />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#${gradId})`} />
      </Svg>
    </View>
  );
}

/** Drop this inside any screen root view. Matches landing page orb layout. */
export function GlowOrbs() {
  return (
    <>
      <DiffuseOrb color={TEAL} size={420} top={-60} left={-60} />
      <DiffuseOrb color={RED}  size={380} top={-60} right={-60} />
    </>
  );
}
