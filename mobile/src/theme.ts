import {Platform} from 'react-native';
import type {ViewStyle} from 'react-native';

export const FONT = Platform.OS === 'ios' ? 'Baloo 2' : 'Baloo2';
export const FONT_BOLD = Platform.OS === 'ios' ? 'Baloo 2' : 'Baloo2-Bold';

export const light = {
  bg: '#fff',
  surface: '#fff',
  surface2: '#f7f7f7',
  ink: '#3c3c3c',
  muted: '#6b6b6b',
  line: '#e5e5e5',
  green: '#58a700',
  greenDark: '#3f7a00',
  greenInk: '#357000',
  greenBg: '#d7ffb8',
  blue: '#1cb0f6',
  blueDark: '#1899d6',
  blueInk: '#0a6ea8',
  blueBg: '#ddf4ff',
  blueBorder: '#84d8ff',
  red: '#ff4b4b',
  redDark: '#b32b2b',
  redBg: '#ffdfe0',
  orange: '#ff9600',
  orangeInk: '#b25b00',
  yellow: '#ffc800',
  radius: 12,
};

export const dark = {
  ...light,
  bg: '#131f24',
  surface: '#1f2d36',
  surface2: '#283942',
  ink: '#f1f7fb',
  muted: '#a5b4c0',
  line: '#37464f',
  greenBg: '#234d1b',
  redBg: '#4d1f1f',
  blueBg: '#1e3a4c',
  blueBorder: '#1cb0f6',
  greenInk: '#7ee787',
  blueInk: '#79c0ff',
  orangeInk: '#ffa657',
};

export type Theme = typeof light;

/** 4pt-based spacing scale (numbers = density-independent points). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export type Spacing = typeof spacing;

/** Corner-radius scale. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export type Radii = typeof radii;

/** Soft card shadow, tuned per theme (iOS shadow* + Android elevation). */
export const cardShadow: ViewStyle = {
  shadowColor: '#0f2b33',
  shadowOffset: {width: 0, height: 3},
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 2,
};

export const cardShadowDark: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: {width: 0, height: 3},
  shadowOpacity: 0.45,
  shadowRadius: 10,
  elevation: 3,
};

/** Stronger lift for sheets, modals, and floating elements. */
export const popShadow: ViewStyle = {
  shadowColor: '#0f2b33',
  shadowOffset: {width: 0, height: 6},
  shadowOpacity: 0.14,
  shadowRadius: 16,
  elevation: 4,
};

export const popShadowDark: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: {width: 0, height: 6},
  shadowOpacity: 0.55,
  shadowRadius: 16,
  elevation: 6,
};
