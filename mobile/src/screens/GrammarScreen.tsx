import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { useStore } from '../store';
import { FONT } from '../theme';
import type { Theme } from '../theme';
import { Btn, Card, Gap, HearBtn, Opt, Screen, XPBadge } from '../ui';
import { shuffle, shuffleOptions } from '../lib';
import grammarData from '../data/grammar.json';

interface GramExample {
  mr: string;
  en: string;
  tr?: string;
}

interface GramQuiz {
  q: string;
  q_en?: string;
  options: string[];
  answer: number;
  explain: string;
}

interface GramTable {
  headers: string[];
  rows: string[][];
}

interface GramTopic {
  id: string;
  title_mr: string;
  title_en: string;
  explanation_en: string;
  explanation_mr: string;
  table?: GramTable;
  examples: GramExample[];
  quiz: GramQuiz[];
}

interface Fb {
  ok: boolean;
  answer: string;
  explain: string;
}

const TOPICS = (grammarData as { topics: GramTopic[] }).topics;
const TOTAL_Q = TOPICS.reduce((n, t) => n + t.quiz.length, 0);

function streakLevel(streak: number): number {
  return streak >= 5 ? Math.floor(streak / 5) : 0;
}

function FeedbackBlock({ fb, streak, onNext }: { fb: Fb; streak: number; onNext: () => void }) {
  const { t } = useStore();
  const styles = makeStyles(t);
  const leveled = fb.ok && streak > 0 && streak % 5 === 0;
  return (
    <Animated.View entering={FadeIn}>
      <Card>
        <Text style={[styles.fbTitle, fb.ok ? styles.ok : styles.bad]}>
          {fb.ok ? 'बरोबर! Correct ✓' : 'चूक — Correct answer:'}
          {streak >= 2 && fb.ok ? `  🔥×${streak}` : ''}
        </Text>
        {!fb.ok && fb.answer ? <Text style={styles.fbAnswer}>{fb.answer}</Text> : null}
        {fb.explain ? <Text style={styles.fbExplain}>{fb.explain}</Text> : null}
        {leveled ? (
          <Text style={styles.levelup}>🎉 Streak level {streakLevel(streak)}! छान चाललंय!</Text>
        ) : null}
        <Gap />
        <Btn title="पुढे →" onPress={onNext} />
      </Card>
    </Animated.View>
  );
}

export default function GrammarScreen({ navigation, route }: any) {
  void navigation;
  const { award, t } = useStore();
  const styles = makeStyles(t);
  const paramTopic = typeof route?.params?.topicId === 'string' ? (route.params.topicId as string) : null;
  const [topicId, setTopicId] = useState<string | null>(
    paramTopic && TOPICS.some((t) => t.id === paramTopic) ? paramTopic : null,
  );
  const [quizOn, setQuizOn] = useState<boolean>(false);
  const [order, setOrder] = useState<number[]>([]);
  const [idx, setIdx] = useState<number>(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [fb, setFb] = useState<Fb | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [score, setScore] = useState<number>(0);

  const topic: GramTopic | undefined = TOPICS.find((t) => t.id === topicId);
  const qi: number | undefined = quizOn ? order[idx] : undefined;
  const q: GramQuiz | undefined = topic && qi !== undefined ? topic.quiz[qi] : undefined;
  const qKey = topic && qi !== undefined ? `${topic.id}:${qi}` : 'none';
  const sq = useMemo(() => (q ? shuffleOptions(q.options, q.answer) : null), [qKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function openTopic(id: string): void {
    setTopicId(id);
    setQuizOn(false);
    setFb(null);
    setPicked(null);
    setStreak(0);
    setScore(0);
  }

  function backToList(): void {
    setTopicId(null);
    setQuizOn(false);
    setFb(null);
    setPicked(null);
  }

  function startQuiz(): void {
    if (!topic) return;
    setOrder(shuffle(topic.quiz.map((_, i) => i)));
    setIdx(0);
    setPicked(null);
    setFb(null);
    setStreak(0);
    setScore(0);
    setQuizOn(true);
  }

  function grade(i: number): void {
    if (fb || !q || !sq) return;
    const ok = i === sq.answer;
    award('grammar', ok);
    setStreak((s) => (ok ? s + 1 : 0));
    if (ok) setScore((s) => s + 1);
    setPicked(i);
    setFb({ ok, answer: ok ? '' : (sq.options[sq.answer] ?? ''), explain: q.explain });
  }

  function next(): void {
    setFb(null);
    setPicked(null);
    if (idx + 1 < order.length) setIdx(idx + 1);
    else setQuizOn(false);
  }

  const pct = order.length ? Math.round((100 * idx) / order.length) : 0;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>व्याकरण — Grammar</Text>
        <XPBadge />
      </View>
      <Card>
        <Text style={styles.muted}>
          {TOPICS.length} विषय · {TOTAL_Q} प्रश्न · 🔥 {streak} streak
        </Text>
      </Card>
      <Gap />

      {!topic ? (
        <>
          <Card>
            <Text style={styles.muted}>
              विषय निवडा — नियम, तक्ता, उदाहरणं आणि प्रश्नमंजुषा दिसेल.
            </Text>
          </Card>
          <Gap />
          <FlatList
            data={TOPICS}
            keyExtractor={(t) => t.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.topicItem}>
                <Opt
                  label={item.title_mr}
                  sub={`${item.title_en} · ${item.quiz.length} प्रश्न`}
                  state="idle"
                  disabled={false}
                  onPress={() => openTopic(item.id)}
                />
              </View>
            )}
          />
        </>
      ) : (
        <Animated.View key={topic.id} entering={FadeIn}>
          {!quizOn ? (
            <Card>
              <Btn title="← विषयांकडे" kind="secondary" small onPress={backToList} />
              <Gap />
              <Text style={styles.topicTitle}>
                {topic.title_mr} <Text style={styles.muted}>{topic.title_en}</Text>
              </Text>
              <Text style={styles.body}>{topic.explanation_en}</Text>
              <Text style={styles.body}>{topic.explanation_mr}</Text>
              {topic.table ? (
                <View style={styles.table}>
                  <View style={[styles.tRow, styles.tHead]}>
                    {topic.table.headers.map((h) => (
                      <Text key={h} style={[styles.tCell, styles.tHeadCell]}>
                        {h}
                      </Text>
                    ))}
                  </View>
                  {topic.table.rows.map((r, i) => (
                    <View key={i} style={styles.tRow}>
                      {r.map((c, j) => (
                        <Text key={j} style={styles.tCell}>
                          {c}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              ) : null}
              <Text style={styles.section}>उदाहरणं · Examples</Text>
              {topic.examples.map((e, i) => (
                <View key={i} style={styles.exRow}>
                  <Text style={styles.exText}>
                    <Text style={styles.exMr}>{e.mr}</Text> — {e.en}
                    {e.tr ? ` · ${e.tr}` : ''}
                  </Text>
                  <HearBtn text={e.mr} title="🔊" />
                </View>
              ))}
              <Gap />
              <Btn
                title={`प्रश्नमंजुषा सुरू करा (${topic.quiz.length} प्रश्न)`}
                onPress={startQuiz}
              />
              {score > 0 ? <Text style={styles.muted}>मागील गुण: {score}</Text> : null}
            </Card>
          ) : (
            <Animated.View key={`${topic.id}-quiz-${idx}`} entering={SlideInRight.springify()}>
              <Card>
                {!q || !sq ? (
                  <Text style={styles.muted}>प्रश्न उपलब्ध नाहीत.</Text>
                ) : (
                  <>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.muted}>
                      प्रश्न {idx + 1}/{order.length} · गुण {score}
                    </Text>
                    <Text style={styles.q}>{q.q}</Text>
                    {q.q_en ? <Text style={styles.muted}>{q.q_en}</Text> : null}
                    <Gap />
                    {sq.options.map((o, i) => (
                      <Opt
                        key={i}
                        label={o}
                        state={
                          fb ? (i === sq.answer ? 'correct' : i === picked ? 'wrong' : 'idle') : 'idle'
                        }
                        disabled={!!fb}
                        onPress={() => grade(i)}
                      />
                    ))}
                  </>
                )}
              </Card>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {fb && topic && quizOn ? (
        <>
          <Gap />
          <FeedbackBlock fb={fb} streak={streak} onNext={next} />
        </>
      ) : null}

      {!fb && topic && quizOn ? (
        <>
          <Gap />
          <Btn title="सोडा · नियमांकडे" kind="secondary" small onPress={() => setQuizOn(false)} />
        </>
      ) : null}
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 22,
    fontWeight: '700',
  },
  muted: {
    color: t.muted,
    fontFamily: FONT,
    fontSize: 13,
  },
  topicTitle: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 16,
    marginTop: 6,
  },
  section: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  table: {
    borderColor: t.line,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  tRow: {
    borderTopColor: t.line,
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  tHead: {
    backgroundColor: t.surface2,
    borderTopWidth: 0,
  },
  tCell: {
    color: t.ink,
    flex: 1,
    fontFamily: FONT,
    fontSize: 14,
    padding: 8,
  },
  tHeadCell: {
    fontWeight: '700',
  },
  exRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  exText: {
    color: t.ink,
    flex: 1,
    fontFamily: FONT,
    fontSize: 15,
    marginRight: 8,
  },
  exMr: {
    fontWeight: '700',
  },
  q: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  track: {
    backgroundColor: t.line,
    borderRadius: 4,
    height: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: t.green,
    height: 8,
  },
  fbTitle: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '700',
  },
  ok: {
    color: t.greenInk,
  },
  bad: {
    color: t.red,
  },
  fbAnswer: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 16,
    marginTop: 4,
  },
  fbExplain: {
    color: t.muted,
    fontFamily: FONT,
    fontSize: 14,
    marginTop: 4,
  },
  levelup: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 14,
    marginTop: 4,
  },
  topicItem: {
    marginBottom: 4,
  },
  });
}
