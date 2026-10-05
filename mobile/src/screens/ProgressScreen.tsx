import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInLeft } from 'react-native-reanimated';
import { Flame, Star } from 'lucide-react-native';
import { MODES } from '../data/modes';
import { useStore } from '../store';
import { FONT } from '../theme';
import type { Theme } from '../theme';
import { Btn, Card, Gap, Screen } from '../ui';

// Mirror of web/src/components/ProgressView.jsx copy.
const XP_MODES = ['chat', 'sprint', 'stories', 'drills', 'grammar', 'vocab'];

function modeMr(id: string): string {
  return MODES.find((m) => m.id === id)?.mr ?? id;
}

function Stat({
  label,
  value,
  index,
  icon,
  testID,
}: {
  label: string;
  value: string;
  index: number;
  icon?: ReactNode;
  testID?: string;
}): React.JSX.Element {
  const { t } = useStore();
  const styles = makeStyles(t);
  return (
    <Animated.View style={styles.stat} entering={FadeInDown.delay(index * 60).springify()}>
      <View style={styles.statTop}>
        {icon}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue} testID={testID}>
        {value}
      </Text>
    </Animated.View>
  );
}

export default function ProgressScreen(_props: any): React.JSX.Element {
  const { progress, resetAll, t } = useStore();
  const styles = makeStyles(t);
  const acc = progress.answers ? Math.round((100 * progress.correct) / progress.answers) : 0;
  const mx = Math.max(1, ...XP_MODES.map((m) => progress.byMode[m] || 0));
  const fresh = progress.xp === 0 && progress.answers === 0;

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Card>
          <Text style={styles.h2}>प्रगती — Progress</Text>
          <Text style={styles.sub}>
            {fresh ? 'अजून सुरुवात नाही? आजच पहिला सराव करा!' : 'छान चाललंय — असंच सुरू ठेवा!'}
          </Text>
          <Gap />
          <View style={styles.hero}>
            <View style={styles.heroItem}>
              <Star size={28} color={t.yellow} />
              <Text style={styles.heroValue} testID="progress-xp">
                {progress.xp}
              </Text>
              <Text style={styles.heroLabel}>एकूण XP — Total XP</Text>
            </View>
            <View style={styles.heroDiv} />
            <View style={styles.heroItem}>
              <Flame size={28} color={t.orange} />
              <Text style={styles.heroValue} testID="progress-streak">
                🔥 {progress.streak}
              </Text>
              <Text style={styles.heroLabel}>स्ट्रीक — दिवस</Text>
            </View>
          </View>
          <Gap />
          <View style={styles.stats}>
            <Stat label="उत्तरं — Answers" value={String(progress.answers)} index={0} testID="progress-answers" />
            <Stat label="बरोबर — Correct" value={String(progress.correct)} index={1} testID="progress-correct" />
            <Stat label="अचूकता — Accuracy" value={`${acc}%`} index={2} testID="progress-accuracy" />
          </View>
        </Card>
        <Gap />
        <Card>
          <Text style={styles.h3}>प्रत्येक मोडमधील XP — XP by mode</Text>
          <Gap />
          {XP_MODES.map((m, i) => {
            const v = progress.byMode[m] || 0;
            const w = Math.round((100 * v) / mx);
            return (
              <View key={m} style={styles.barRow}>
                <View style={styles.barLabel}>
                  <Text style={styles.barName}>
                    {modeMr(m)} · {m}
                  </Text>
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
  sub: {
    fontFamily: FONT,
    fontSize: 14,
    color: t.muted,
  },
  h3: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '700',
    color: t.ink,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.surface2,
    padding: 14,
  },
  heroItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  heroDiv: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: t.line,
    marginHorizontal: 8,
  },
  heroValue: {
    fontFamily: FONT,
    fontSize: 30,
    fontWeight: '700',
    color: t.ink,
  },
  heroLabel: {
    fontFamily: FONT,
    fontSize: 13,
    color: t.muted,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stat: {
    flexGrow: 1,
    flexBasis: '30%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.surface2,
    padding: 12,
    alignItems: 'center',
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
