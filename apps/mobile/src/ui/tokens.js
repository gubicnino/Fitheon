// The design tokens, defined once. Read by tailwind.config.js (class names such
// as bg-ink, text-coin) and by components that need a raw value, such as icon
// and SVG colours, which cannot take a class name.
// Values from the Magic Patterns prototype's index.css.

const colors = {
  ink: '#111214',
  surface: '#1a1c20',
  raised: '#24272c',
  line: '#30343a',
  fg: '#f3f1ec',
  muted: '#a3a8b0',
  faint: '#70757d',
  coin: '#f5b82e',
  'coin-ink': '#2b1f02',
  xp: '#6fd3ff',
  'xp-ink': '#04212e',
  go: '#7bd88f',
  danger: '#ff6b5e',
  q1: '#b4b9c1',
  q2: '#4f8cff',
  q3: '#ff7a3d',
  q4: '#b98cff',
};

// Rubik, one family name per weight as registered by @expo-google-fonts/rubik.
// iOS does not pick a weight of a custom font from fontWeight, so each weight
// class (font-medium, font-bold, ...) selects its own family instead.
const fonts = {
  normal: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  semibold: 'Rubik_600SemiBold',
  bold: 'Rubik_700Bold',
  extrabold: 'Rubik_800ExtraBold',
};

module.exports = { colors, fonts };
