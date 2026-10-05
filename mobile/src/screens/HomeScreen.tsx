import React, { type ComponentType } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  BookOpen,
  ChartColumn,
  CircleHelp,
  Dumbbell,
  Languages,
  Layers,
  MessagesSquare,
  Settings as SettingsIcon,
  Target,
  Timer,
} from 'lucide-react-native';
import { MODES } from '../data/modes';
import { useStore } from '../store';
import { FONT } from '../theme';
import type { Theme } from '../theme';
import { Bar, Card, Gap, XPBadge, Screen } from '../ui';
import { StoryArt } from '../components/StoryArt';

type Mode = (typeof MODES)[number];
type IconComp = ComponentType<{ size?: number | string; color?: string }>;

const ICONS: Record<string, IconComp> = {
  chat: MessagesSquare,
  sprint: Timer,
  stories: BookOpen,
  drills: Dumbbell,
  grammar: Languages,
  vocab: Layers,
  progress: ChartColumn,
  settings: SettingsIcon,
  help: CircleHelp,
};

function routeFor(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function greeting(): { mr: string; sub: string } {
  const h = new Date().getHours();
  if (h < 12) return { mr: 'सुप्रभात!', sub: 'चला, आजच्या मराठीची सुरुवात करूया' };
  if (h < 17) return { mr: 'नमस्कार!', sub: 'रोज थोडं मराठी — आजचा सराव करा' };
  if (h < 21) return { mr: 'शुभ संध्याकाळ!', sub: 'संध्याकाळचा सराव वेळ झाला' };
  return { mr: 'शुभ रात्री!', sub: 'झोपण्यापूर्वी थोडा सराव?' };
}

function ModeCard({ mode, index, onPress }: { mode: Mode; index: number; onPress: () => void }): React.JSX.Element {
  const Icon = ICONS[mode.id] ?? CircleHelp;
  const { t } = useStore();
  const styles = makeStyles(t);
  return (
    <Animated.View style={styles.cell} entering={FadeInDown.delay(140 + index * 60).springify()}>
      <Pressable
        style={({ pressed }) => [styles.press, pressed && styles.pressed]}
        onPress={onPress}
        accessibilityLabel={`${mode.mr} ${mode.en}`}
        testID={`mode-${mode.id}`}>
        <View style={styles.iconWrap}>
          <Icon size={22} color={t.blue} />
        </View>
        <Text style={styles.mr}>{mode.mr}</Text>
        <Text style={styles.en}>{mode.en}</Text>
        <Text style={styles.desc} numberOfLines={3}>
          {mode.desc}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function DailyGoal(): React.JSX.Element {
  const { progress, settings, t } = useStore();
  const styles = makeStyles(t);
  const goal = settings.dailyGoalXp > 0 ? settings.dailyGoalXp : 25;
  const done = progress.xp % goal;
  const justCompleted = done === 0 && progress.xp > 0;
  const pct = justCompleted ? 100 : Math.round((100 * done) / goal);
  const label = justCompleted ? `🎉 ${goal}/${goal} XP — ध्येय पूर्ण!` : `${done}/${goal} XP`;
  return (
    <Animated.View entering={FadeInDown.delay(80).springify()} testID="home-goal">
      <Card>
        <View style={styles.goalRow}>
          <Target size={18} color={t.green} />
          <Text style={styles.goalTitle}>दैनंदिन ध्येय</Text>
          <Text style={styles.goalVal}>{label}</Text>
        </View>
        <Bar value={pct / 100} testID="home-goal-bar" />
      </Card>
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }: any): React.JSX.Element {
  const { t } = useStore();
  const styles = makeStyles(t);
  const modes = MODES.filter((m) => m.id !== 'modes');
  const g = greeting();
  return (
    <Screen>
      <FlatList
        data={modes}
        keyExtractor={(m) => m.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View>
            <Animated.View entering={FadeInDown.springify()}>
              <View style={styles.header}>
                <View style={styles.greetWrap} testID="home-greeting">
                  <Text style={styles.greet}>{g.mr}</Text>
                  <Text style={styles.greetSub}>{g.sub}</Text>
                </View>
                <XPBadge />
              </View>
            </Animated.View>
            <Gap />
            <DailyGoal />
            <Gap />
            <Animated.View entering={FadeInDown.delay(120).springify()}>
              <Card>
                <StoryArt id="app-hero" />
                <Gap />
                <Text style={styles.tagline}>गप्पा, गोष्टी, सराव — रोज थोडं मराठी!</Text>
              </Card>
            </Animated.View>
            <Gap />
          </View>
        }
        renderItem={({ item, index }) => (
          <ModeCard mode={item} index={index} onPress={() => navigation.navigate(routeFor(item.id))} />
        )}
      />
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  greetWrap: {
    flex: 1,
    gap: 2,
  },
  greet: {
    fontFamily: FONT,
    fontSize: 28,
    fontWeight: '700',
    color: t.ink,
  },
  greetSub: {
    fontFamily: FONT,
    fontSize: 14,
    color: t.muted,
  },
  tagline: {
    fontFamily: FONT,
    fontSize: 16,
    textAlign: 'center',
    color: t.ink,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    flex: 1,
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: '700',
    color: t.ink,
  },
  goalVal: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: '700',
    color: t.greenInk,
  },
  row: {
    gap: 12,
  },
  cell: {
    flex: 1,
    marginBottom: 12,
  },
  press: {
    flex: 1,
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.surface,
    padding: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: t.blueBg,
    padding: 8,
    marginBottom: 4,
  },
  mr: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '700',
    color: t.ink,
  },
  en: {
    fontFamily: FONT,
    fontSize: 13,
    color: t.muted,
  },
  desc: {
    fontFamily: FONT,
    fontSize: 13,
    color: t.muted,
  },
  });
}
