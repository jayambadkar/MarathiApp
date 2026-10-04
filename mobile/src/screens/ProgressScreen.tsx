import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInLeft } from 'react-native-reanimated';
import { useStore } from '../store';
import { FONT } from '../theme';
import type { Theme } from '../theme';
import { Btn, Card, Gap, Screen } from '../ui';

// Mirror of web/src/components/ProgressView.jsx copy.
const XP_MODES = ['chat', 'sprint', 'stories', 'drills', 'grammar', 'vocab'];

function Stat({ label, value, index }: { label: string; value: string; index: number }): React.JSX.Element {
  const { t } = useStore();
  const styles = makeStyles(t);
  return (
    <Animated.View style={styles.stat} entering={FadeInDown.delay(index * 60).springify()}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </Animated.View>
  );
}

export default function ProgressScreen(_props: any): React.JSX.Element {
  const { progress, resetAll, t } = useStore();
  const styles = makeStyles(t);
  const acc = progress.answers ? Math.round((100 * progress.correct) / progress.answers) : 0;
  const mx = Math.max(1, ...XP_MODES.map((m) => progress.byMode[m] || 0));

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Card>
          <Text style={styles.h2}>प्रगती — Progress</Text>
          <Gap />
          <View style={styles.stats}>
            <Stat label="XP" value={String(progress.xp)} index={0} />
            <Stat label="Streak (दिवस)" value={`🔥 ${progress.streak}`} index={1} />
            <Stat label="उत्तरं" value={`${progress.correct}/${progress.answers}`} index={2} />
            <Stat label="अचूकता" value={`${acc}%`} index={3} />
          </View>
        </Card>
        <Gap />
        <Card>
          <Text style={styles.h3}>XP by mode</Text>
          <Gap />
          {XP_MODES.map((m, i) => {
            const v = progress.byMode[m] || 0;
            const w = Math.round((100 * v) / mx);
            return (
              <View key={m} style={styles.barRow}>
                <View style={styles.barLabel}>
                  <Text style={styles.barName}>{m}</Text>
                  <Text style={styles.barVal}>{v}</Text>
                </View>
                <View style={styles.track}>
                  <Animated.View
                    style={[styles.fill, { width: `${w}%` }]}
                    entering={FadeInLeft.delay(i * 80).springify()}
                  />
                </View>
              </View>
            );
          })}
        </Card>
        <Gap />
        <Btn title="Reset progress" kind="secondary" small onPress={resetAll} />
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
  content: {
    flex: 1,
  },
  h2: {
    fontFamily: FONT,
    fontSize: 22,
    fontWeight: '700',
    color: t.ink,
  },
  h3: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '700',
    color: t.ink,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.surface2,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: FONT,
    fontSize: 13,
    color: t.muted,
  },
  statValue: {
    fontFamily: FONT,
    fontSize: 22,
    fontWeight: '700',
    color: t.ink,
  },
  barRow: {
    marginBottom: 10,
  },
  barLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barName: {
    fontFamily: FONT,
    fontSize: 14,
    color: t.ink,
  },
  barVal: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: '700',
    color: t.ink,
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: t.line,
    overflow: 'hidden',
  },
  fill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: t.green,
  },
  });
}
