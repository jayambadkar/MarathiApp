import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Timer } from 'lucide-react-native';
import sprintsData from '../data/sprints.json';
import { useStore } from '../store';
import { FONT } from '../theme';
import { Btn, Card, Gap, HearBtn, Opt, SayText, Screen, Seg } from '../ui';
import { XP_CORRECT, shuffleOptions } from '../lib';

const BONUS_XP = 5;

interface SprintQ {
  q_mr?: string;
  q_en: string;
  options: string[];
  answer: number;
}

interface Sprint {
  id: string;
  level: number;
  title_mr: string;
  title_en: string;
  text_mr: string;
  text_en: string;
  words: number;
  target_wpm: number;
  questions: SprintQ[];
}

const sprints = sprintsData as unknown as Sprint[];

/** Animated pace bar: elapsed vs expected time (words / target WPM). */
function PaceBar({ elapsed, expected }: { elapsed: number; expected: number }): React.JSX.Element {
  const { t } = useStore();
  const [trackW, setTrackW] = useState(0);
  const pct = expected > 0 ? Math.min(elapsed / expected, 1) : 0;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(pct, { duration: 220 });
  }, [pct, p]);
  const fill = useAnimatedStyle(() => ({ width: p.value * trackW }));
  const over = expected > 0 && elapsed > expected;
  return (
    <View
      style={[styles.pbar, { backgroundColor: t.line }]}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
      <Animated.View
        style={[styles.pfill, { backgroundColor: over ? t.orange : t.green }, fill]}
      />
    </View>
  );
}

export default function SprintsScreen({ navigation, route }: any): React.JSX.Element {
  void navigation;
  void route;
  const { award, t, progress } = useStore();
  const pal = { text: t.ink, muted: t.muted };
  const sprintXP = progress.byMode.sprint ?? 0;
  const [level, setLevel] = useState('all');
  const [selId, setSelId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [wpm, setWpm] = useState<number | null>(null);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [fb, setFb] = useState<{ ok: boolean; answer: string } | null>(null);
  const [streak, setStreak] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  const levels = useMemo(
    () => [...new Set(sprints.map((s) => s.level))].sort((a, b) => a - b),
    [],
  );
  const list = sprints.filter((s) => level === 'all' || s.level === Number(level));
  const sprint = selId ? (sprints.find((s) => s.id === selId) ?? null) : null;
  const q: SprintQ | null = sprint && wpm !== null ? (sprint.questions[qi] ?? null) : null;
  const sq = useMemo(() => (q ? shuffleOptions(q.options, q.answer) : null), [q]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    },
    [],
  );

  function openSprint(id: string): void {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setSelId(id);
    setRunning(false);
    setElapsed(0);
    setWpm(null);
    setQi(0);
    setPicked(null);
    setFb(null);
    setStreak(0);
    setDone(false);
  }

  function startTimer(): void {
    if (running) return;
    startRef.current = Date.now() - elapsed * 1000;
    setRunning(true);
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 200);
  }

  function resetTimer(): void {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRunning(false);
    setElapsed(0);
    setWpm(null);
    setQi(0);
    setPicked(null);
    setFb(null);
    setStreak(0);
    setDone(false);
  }

  function stopTimer(): void {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRunning(false);
    const secs = Math.max(1, (Date.now() - startRef.current) / 1000);
    setElapsed(secs);
    if (sprint) {
      const rate = Math.round((sprint.words / secs) * 60);
      setWpm(rate);
      if (rate >= sprint.target_wpm) {
        award('sprint', true, BONUS_XP);
      }
    }
  }

  function grade(i: number): void {
    if (fb || !q || !sq) return;
    const ok = i === sq.answer;
    award('sprint', ok);
    setStreak((s) => (ok ? s + 1 : 0));
    setPicked(i);
    setFb({ ok, answer: ok ? '' : (sq.options[sq.answer] ?? '') });
  }

  function nextQ(): void {
    setFb(null);
    setPicked(null);
    if (sprint && qi + 1 < sprint.questions.length) setQi(qi + 1);
    else setDone(true);
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(Math.floor(elapsed % 60)).padStart(2, '0');
  const expectedSecs = sprint ? (sprint.words / sprint.target_wpm) * 60 : 0;
  const liveWpm =
    sprint && running && elapsed > 1 ? Math.round((sprint.words / elapsed) * 60) : null;

  return (
    <Screen>
      <View style={styles.header}>
        <Timer size={22} color={pal.text} />
        <Text style={[styles.title, { color: pal.text }]}>वाचन स्प्रिंट — Sprints</Text>
      </View>
      <Text style={[styles.small, { color: pal.muted }]}>
        {sprints.length} उतारे · लक्ष्य 40–140 WPM · 🔥 {streak} streak
        {sprintXP > 0 ? ` · ⭐ ${sprintXP} XP` : ''}
      </Text>
      <Gap />
      <View testID="sprint-level">
        <Seg
          value={level}
          onChange={(v: string) => setLevel(v)}
          options={[
            { value: 'all', label: 'सर्व All' },
            ...levels.map((l) => ({ value: String(l), label: String(l) })),
          ]}
        />
      </View>
      <Gap />
      <FlatList
        data={list}
        keyExtractor={(s) => s.id}
        testID="sprint-list"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listRow}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).duration(350)}>
            <View testID={`sprint-${item.id}`}>
              <Btn
                title={`${item.id} · L${item.level} · ${item.target_wpm}wpm`}
                kind={selId === item.id ? 'primary' : 'secondary'}
                small
                onPress={() => openSprint(item.id)}
              />
            </View>
          </Animated.View>
        )}
      />
      <Gap />
      {!sprint ? (
        <Card>
          <Text style={[styles.body, { color: pal.muted }]}>
            वर उतारा निवडा — टायमर लावून वाचा, WPM मोजा, मग प्रश्न सोडवा.
          </Text>
        </Card>
      ) : (
        <ScrollView
          testID="sprint-reader"
          style={styles.flex}
          contentContainerStyle={{paddingBottom: 24}}
          showsVerticalScrollIndicator={false}>
          <Animated.View key={sprint.id} entering={FadeInDown.duration(300)}>
            <Card>
              <Text style={[styles.h3, { color: pal.text }]}>
                {sprint.title_mr}{' '}
                <Text style={[styles.small, { color: pal.muted }]}>
                  {sprint.title_en} · {sprint.words} शब्द · लक्ष्य {sprint.target_wpm} WPM
                </Text>
              </Text>
              <Gap />
              <View style={styles.row}>
                <Text style={[styles.timer, { color: pal.text }]} testID="sprint-timer">
                  {mm}:{ss}
                </Text>
                {liveWpm !== null && (
                  <Text style={[styles.liveWpm, { color: pal.muted }]}>~{liveWpm} WPM</Text>
                )}
                {!running && wpm === null && (
                  <Btn title="▶ वाचन सुरू" kind="primary" small onPress={startTimer} />
                )}
                {running && <Btn title="⏹ वाचन संपलं" kind="primary" small onPress={stopTimer} />}
                {!running && wpm !== null && (
                  <Btn title="↺ पुन्हा वाचा" kind="secondary" small onPress={resetTimer} />
                )}
                <View testID="sprint-hear">
                  <HearBtn text={sprint.text_mr} title="🔊 ऐका" />
                </View>
              </View>
              <PaceBar elapsed={elapsed} expected={expectedSecs} />
              <Gap />
              <Animated.View
                key={`passage-${sprint.id}`}
                entering={FadeInDown.delay(120).duration(400)}>
                <SayText
                  text={sprint.text_mr}
                  style={[styles.storyText, { color: pal.text }]}
                  testID="sprint-text"
                />
                <Text style={[styles.small, { color: pal.muted }]}>
                  💡 वाक्यावर टॅप करा — ऐकू येईल · long-press = सर्व ऐका
                </Text>
                <Text style={[styles.small, { color: pal.muted }]}>{sprint.text_en}</Text>
              </Animated.View>
              {wpm !== null && (
                <Animated.View
                  key={`result-${sprint.id}-${wpm}`}
                  entering={ZoomIn.springify().damping(15)}
                  testID="sprint-result">
                  <Gap />
                  <Text style={[styles.body, { color: pal.text }]}>
                    तुमचा वेग: <Text style={styles.bold}>{wpm} WPM</Text> (लक्ष्य{' '}
                    {sprint.target_wpm}){' '}
                    {wpm >= sprint.target_wpm ? (
                      <Text testID="sprint-hit">🎯 लक्ष्य गाठलं! +{BONUS_XP} XP बोनस</Text>
                    ) : (
                      <Text testID="sprint-miss">
                        💪 पुन्हा प्रयत्न करा — लक्ष्य {XP_CORRECT} XP/प्रश्न अजूनही मिळेल
                      </Text>
                    )}
                  </Text>
                </Animated.View>
              )}
              {wpm !== null && !done && q !== null && sq !== null && (
                <Animated.View
                  key={`quiz-${sprint.id}-${qi}`}
                  entering={FadeInDown.duration(350)}
                  testID="sprint-quiz">
                  <Gap />
                  <Text style={[styles.small, { color: pal.muted }]}>
                    प्रश्न {qi + 1}/{sprint.questions.length}
                  </Text>
                  {q.q_mr ? (
                    <Text style={[styles.storyText, { color: pal.text }]}>{q.q_mr}</Text>
                  ) : null}
                  <Text style={[styles.h3, { color: pal.text }]} testID="sprint-q">
                    {q.q_en}
                  </Text>
                  {sq.options.map((o, i) => (
                    <Animated.View
                      key={`${qi}-${i}`}
                      entering={FadeInDown.delay(80 + i * 70).duration(300)}>
                      <Opt
                        label={o}
                        state={
                          fb
                            ? i === sq.answer
                              ? 'correct'
                              : i === picked
                                ? 'wrong'
                                : 'idle'
                            : 'idle'
                        }
                        disabled={fb !== null}
                        onPress={() => grade(i)}
                      />
                    </Animated.View>
                  ))}
                  {fb !== null && (
                    <Animated.View entering={FadeIn.duration(250)} style={styles.row}>
                      <Text style={[styles.body, { color: pal.text }]}>
                        {fb.ok ? '✓ बरोबर!' : `✗ उत्तर: ${fb.answer}`} · 🔥 {streak}
                      </Text>
                      <Btn title="पुढे →" kind="primary" small onPress={nextQ} />
                    </Animated.View>
                  )}
                </Animated.View>
              )}
              {done && (
                <Animated.View entering={FadeInDown.duration(350)} testID="sprint-done">
                  <Gap />
                  <Text style={[styles.body, { color: pal.text }]}>
                    ✅ स्प्रिंट पूर्ण! <Text style={styles.bold}>{wpm} WPM</Text> · पुढचा उतारा निवडा
                    किंवा स्तर बदला.
                  </Text>
                </Animated.View>
              )}
            </Card>
          </Animated.View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: FONT,
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  h3: {
    fontFamily: FONT,
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    fontFamily: FONT,
    fontSize: 16,
  },
  bold: {
    fontFamily: FONT,
    fontWeight: '700',
  },
  small: {
    fontFamily: FONT,
    fontSize: 13,
  },
  storyText: {
    fontFamily: FONT,
    fontSize: 18,
    lineHeight: 30,
  },
  timer: {
    fontFamily: FONT,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  liveWpm: {
    fontFamily: FONT,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  pbar: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
    marginTop: 8,
  },
  pfill: {
    height: 4,
    borderRadius: 999,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  listRow: {
    gap: 8,
  },
});
