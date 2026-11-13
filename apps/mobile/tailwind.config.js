const { colors, fonts } = require('./src/ui/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Without this NativeWind 4 logs "Cannot manually set color scheme" on web.
  // The app is dark only; there is no light variant.
  darkMode: 'class',
  // font-normal ... font-extrabold choose a Rubik family (see tokens.js), so the
  // fontWeight utilities, which would share those names, are turned off.
  corePlugins: { fontWeight: false },
  theme: {
    fontFamily: {
      sans: [fonts.normal],
      normal: [fonts.normal],
      medium: [fonts.medium],
      semibold: [fonts.semibold],
      bold: [fonts.bold],
      extrabold: [fonts.extrabold],
    },
    extend: { colors },
  },
  plugins: [],
};
