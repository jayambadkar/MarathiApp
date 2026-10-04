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
  Timer,
} from 'lucide-react-native';
import { MODES } from '../data/modes';
import { useStore } from '../store';
import { FONT } from '../theme';
import type { Theme } from '../theme';
import { Card, Gap, XPBadge, Screen } from '../ui';
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

function ModeCard({ mode, index, onPress }: { mode: Mode; index: number; onPress: () => void }): React.JSX.Element {
  const Icon = ICONS[mode.id] ?? CircleHelp;
  const { t } = useStore();
  const styles = makeStyles(t);
  return (
    <Animated.View style={styles.cell} entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable style={styles.press} onPress={onPress} accessibilityLabel={`${mode.mr} ${mode.en}`}>
        <Icon size={22} color={t.blue} />
        <Text style={styles.mr}>{mode.mr}</Text>
        <Text style={styles.en}>{mode.en}</Text>
        <Text style={styles.desc} numberOfLines={3}>
          {mode.desc}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }: any): React.JSX.Element {
  const { t } = useStore();
  const styles = makeStyles(t);
  const modes = MODES.filter((m) => m.id !== 'modes');
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
            <View style={styles.header}>
              <Text style={styles.greet}>मराठी शिका</Text>
              <XPBadge />
            </View>
            <Gap />
            <Card>
              <StoryArt id="app-hero" />
              <Gap />
              <Text style={styles.tagline}>गप्पा, गोष्टी, सराव — रोज थोडं मराठी!</Text>
            </Card>
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
  },
  greet: {
    fontFamily: FONT,
    fontSize: 28,
    fontWeight: '700',
    color: t.ink,
  },
  tagline: {
    fontFamily: FONT,
    fontSize: 16,
    textAlign: 'center',
    color: t.ink,
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
