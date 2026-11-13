import { Text as NativeText, type TextProps } from 'react-native';

import { colors } from './tokens';

const WEIGHT_CLASS = /(^|\s)font-(normal|medium|semibold|bold|extrabold)(\s|$)/;
const COLOR_CLASS = new RegExp(`(^|\\s)text-(${Object.keys(colors).join('|')})(/\\S+)?(\\s|$)`);

/**
 * The app's text. React Native has no inherited default font, so this adds
 * Rubik regular and the foreground colour unless the class names already
 * choose a weight or a colour. Use it instead of react-native's Text.
 */
export function Text({ className = '', ...rest }: TextProps) {
  const weight = WEIGHT_CLASS.test(className) ? '' : 'font-normal ';
  const color = COLOR_CLASS.test(className) ? '' : 'text-fg ';
  return <NativeText className={`${weight}${color}${className}`} {...rest} />;
}
