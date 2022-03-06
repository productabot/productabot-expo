import * as React from 'react';
import { Platform, Text as DefaultText, View as DefaultView } from 'react-native';
import { useTheme } from '@react-navigation/native';
const isWeb = Platform.OS === 'web';
function s(number: number, factor = 0.7) {
  return isWeb ? number * factor : number;
}

export type TextProps = DefaultText['props'];
export function Text(props: TextProps) {
  const { style, ...otherProps } = props;
  const { colors } = useTheme();
  return <DefaultText style={[{ color: colors.text, fontSize: s(20) }, style]} {...otherProps} />;
}

export type ViewProps = DefaultView['props'];
export function View(props: ViewProps) {
  const { style, ...otherProps } = props;
  return <DefaultView style={[{}, style]} {...otherProps} />;
}
