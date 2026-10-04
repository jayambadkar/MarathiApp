import type {ReactNode} from 'react';
import {useMemo} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {StyleProp, TextStyle, ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {Flame, Star, Volume2} from 'lucide-react-native';
import {FONT, FONT_BOLD} from './theme';
import {useStore} from './store';
import {speak, stopSpeak} from './tts';
import {splitSentences} from './lib';

export function Screen({
  children,
  style,
  scroll,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scroll?: boolean;
}) {
  const {t} = useStore();
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.screen, style]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.screen, style]}>{children}</View>
  );
  return <SafeAreaView style={[styles.safe, {backgroundColor: t.bg}]}>{body}</SafeAreaView>;
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const {t} = useStore();
  const inner = (
    <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.line}, style]}>
      {children}
    </View>
  );
  if (!onPress) return inner;
  return <Pressable onPress={onPress}>{inner}</Pressable>;
}

export type BtnKind = 'primary' | 'secondary' | 'danger';

export function Btn({
  title,
  onPress,
  kind = 'primary',
  small,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  kind?: BtnKind;
  small?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const {t} = useStore();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));
  const face = kind === 'primary' ? t.green : kind === 'secondary' ? t.blue : t.red;
  const edge = kind === 'primary' ? t.greenDark : kind === 'secondary' ? t.blueDark : t.redDark;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.96, {damping: 15, stiffness: 400});
      }}
      onPressOut={() => {
        scale.value = withSpring(1, {damping: 15, stiffness: 400});
      }}>
      <Animated.View
        style={[styles.btnEdge, {backgroundColor: edge}, disabled && styles.dimmed, anim]}>
        <View
          style={[
            styles.btnFace,
            small ? styles.btnFaceSmall : styles.btnFaceBig,
            {backgroundColor: disabled ? t.muted : face},
          ]}>
          {icon}
          <Text style={[styles.btnText, small && styles.btnTextSmall]}>{title}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export type OptState = 'idle' | 'correct' | 'wrong' | 'dim';

export function Opt({
  label,
  sub,
  state = 'idle',
  onPress,
  disabled,
}: {
  label: string;
  sub?: string;
  state?: OptState;
  onPress: () => void;
  disabled?: boolean;
}) {
  const {t} = useStore();
  const bg = state === 'correct' ? t.greenBg : state === 'wrong' ? t.redBg : t.surface;
  const border = state === 'correct' ? t.green : state === 'wrong' ? t.red : t.line;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || state === 'dim'}
      style={[styles.opt, {backgroundColor: bg, borderColor: border}, state === 'dim' && styles.dimmed]}>
      <Text style={[styles.optLabel, {color: t.ink}]}>{label}</Text>
      {sub ? <Text style={[styles.optSub, {color: t.muted}]}>{sub}</Text> : null}
    </Pressable>
  );
}

export function Chip({children}: {children: ReactNode}) {
  const {t} = useStore();
  return (
    <View style={[styles.chip, {backgroundColor: t.surface2, borderColor: t.line}]}>
      <Text style={[styles.chipText, {color: t.ink}]}>{children}</Text>
    </View>
  );
}

export function XPBadge() {
  const {progress, t} = useStore();
  return (
    <View style={styles.badgeRow}>
      <View style={[styles.badge, {backgroundColor: t.surface2, borderColor: t.line}]}>
        <Star size={16} color={t.yellow} />
        <Text style={[styles.badgeText, {color: t.ink}]}>{progress.xp} XP</Text>
      </View>
      <View style={[styles.badge, {backgroundColor: t.surface2, borderColor: t.line}]}>
        <Flame size={16} color={t.orange} />
        <Text style={[styles.badgeText, {color: t.ink}]}>{progress.streak}</Text>
      </View>
    </View>
  );
}

export function HearBtn({text, title}: {text: string; title?: string}) {
  const {settings, t} = useStore();
  return (
    <Pressable
      onPress={() => {
        void speak(text, settings.speed);
      }}
      style={[styles.hear, {backgroundColor: t.blueBg, borderColor: t.blueBorder}]}>
      <Volume2 size={18} color={t.blueInk} />
      {title ? <Text style={[styles.hearText, {color: t.blueInk}]}>{title}</Text> : null}
    </Pressable>
  );
}

export function Gap({h = 12}: {h?: number}) {
  return <View style={{height: h}} />;
}

/**
 * Speakable paragraph: tap a sentence to hear it, long-press to hear all.
 * The mobile equivalent of select-to-read-aloud (RN Text exposes no
 * selection events, so tap-a-sentence replaces drag-selection).
 */
export function SayText({
  text,
  style,
  testID,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const {settings} = useStore();
  const sents = useMemo(() => splitSentences(text), [text]);
  const say = (s: string) => {
    stopSpeak();
    void speak(s, settings.speed);
  };
  return (
    <Pressable
      onLongPress={() => say(text)}
      style={({pressed}) => [{opacity: pressed ? 0.7 : 1}]}>
      <Text style={style} testID={testID}>
        {sents.map((s, i) => (
          <Text key={i} onPress={() => say(s)}>
            {s}
            {i < sents.length - 1 ? ' ' : ''}
          </Text>
        ))}
      </Text>
    </Pressable>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  secure,
  multiline,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  multiline?: boolean;
  onSubmit?: () => void;
}) {
  const {t} = useStore();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={t.muted}
      secureTextEntry={secure}
      multiline={multiline}
      onSubmitEditing={onSubmit}
      style={[styles.input, {backgroundColor: t.surface, borderColor: t.line, color: t.ink}]}
    />
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<T | {label: string; value: T}>;
  value: T;
  onChange: (v: T) => void;
}) {
  const {t} = useStore();
  const norm = options.map(o => (typeof o === 'string' ? {label: o, value: o as T} : o));
  return (
    <View style={[styles.seg, {backgroundColor: t.surface2, borderColor: t.line}]}>
      {norm.map(o => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[
            styles.segOpt,
            o.value === value && {
              backgroundColor: t.blueBg,
              borderColor: t.blueBorder,
            },
          ]}>
          <Text style={[styles.segText, {color: o.value === value ? t.blueInk : t.muted}]}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SwitchRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const {t} = useStore();
  return (
    <View style={[styles.row, {borderColor: t.line}]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, {color: t.ink}]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, {color: t.muted}]}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{false: t.line, true: t.green}}
        thumbColor={value ? '#fff' : t.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  flex: {flex: 1},
  screen: {padding: 16, gap: 12},
  card: {borderWidth: 1, borderRadius: 12, padding: 14, gap: 8},
  btnEdge: {borderRadius: 12, paddingBottom: 4},
  dimmed: {opacity: 0.5},
  btnFace: {
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnFaceBig: {paddingVertical: 12, paddingHorizontal: 18},
  btnFaceSmall: {paddingVertical: 8, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center'},
  btnText: {fontFamily: FONT_BOLD, fontWeight: '700', fontSize: 16, color: '#fff'},
  btnTextSmall: {fontSize: 14},
  opt: {borderWidth: 2, borderRadius: 12, padding: 12, gap: 2},
  optLabel: {fontFamily: FONT_BOLD, fontWeight: '600', fontSize: 16},
  optSub: {fontFamily: FONT, fontSize: 13},
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  chipText: {fontFamily: FONT_BOLD, fontSize: 13, fontWeight: '600'},
  badgeRow: {flexDirection: 'row', gap: 8},
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {fontFamily: FONT_BOLD, fontWeight: '700', fontSize: 14},
  hear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  hearText: {fontFamily: FONT_BOLD, fontWeight: '700', fontSize: 14},
  input: {borderWidth: 1, borderRadius: 12, padding: 12, fontFamily: FONT, fontSize: 16},
  seg: {flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, gap: 4},
  segOpt: {flex: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: 'transparent', minHeight: 44, justifyContent: 'center'},
  segText: {fontFamily: FONT_BOLD, fontWeight: '700', fontSize: 14},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  rowText: {flex: 1, gap: 2},
  rowLabel: {fontFamily: FONT_BOLD, fontWeight: '700', fontSize: 15},
  rowSub: {fontFamily: FONT, fontSize: 13},
});
