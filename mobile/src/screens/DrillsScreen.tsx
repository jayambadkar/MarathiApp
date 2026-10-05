import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeInDown,
  SlideInRight,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useStore } from '../store';
import { FONT } from '../theme';
import type { Theme } from '../theme';
import { Btn, Card, Chip, Gap, HearBtn, Opt, Screen, Seg } from '../ui';
import { stopSpeak } from '../tts';
import { listenOnce, voiceAvailable } from '../voice';
import { XP_CORRECT, normEn, normMr, sample, shuffle } from '../lib';
import drillsData from '../data/drills.json';
import vocabData from '../data/vocab.json';
import speakingData from '../data/speaking.json';

interface Drill {
  id: string;
  level: number;
  type: string;
  prompt_en: string;
  prompt_mr: string;
  choices: string[];
  answer: string;
  hint_en: string;
  skill: string;
}

interface VocabWord {
  en: string;
  mr: string;
  tr?: string;
  pos: string;
  level: number;
  cat: string;
}

interface SpeakPrompt {
  id: string;
  level: number;
  kind: string;
  say_mr: string;
  say_translit?: string;
  say_en: string;
  tip_en?: string;
}

interface Fb {
  ok: boolean;
  answer: string;
  explain: string;
}

const EXERCISES = (drillsData as { exercises: Drill[] }).exercises;
const VOCAB = vocabData as VocabWord[];
const SPEAKING = speakingData as SpeakPrompt[];

const SESSION_LEN = 10;
const MIC_TIMEOUT_MS = 8000;
const CHOICE_TYPES = ['mcq', 'fill-blank', 'match'];

const TYPE_LABEL: Record<string, string> = {
  mcq: 'निवडा · MCQ',
  'fill-blank': 'रिकामी जागा · Fill blank',
  'translate-en-mr': 'भाषांतर EN→MR',
  'translate-mr-en': 'भाषांतर MR→EN',
  reorder: 'शब्द लावा · Reorder',
  match: 'जोड्या लावा · Match',
};

const LEVEL_OPTIONS = [
  { label: 'सर्व', value: 'all' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
];

const TAB_OPTIONS = [
  { label: `200-पॅक (${EXERCISES.length})`, value: 'pack' },
  { label: 'शब्द drills', value: 'vocab' },
  { label: `बोलणं (${SPEAKING.length})`, value: 'speaking' },
];

function buildVocabDrills(level: string): Drill[] {
  const pool = VOCAB.filter((w) => level === 'all' || w.level === Number(level));
  return sample(pool, 60).map((w, i) => {
    const dir = i % 2 === 0 ? 'translate-en-mr' : 'translate-mr-en';
    const distract = shuffle(VOCAB.filter((d) => d.en !== w.en && d.level === w.level)).slice(0, 3);
    const choices =
      dir === 'translate-en-mr'
        ? shuffle([w.mr, ...distract.map((d) => d.mr)])
        : shuffle([w.en, ...distract.map((d) => d.en)]);
    return {
      id: `v-${w.en}`,
      level: w.level,
      type: 'mcq',
      skill: `vocab:${w.cat}`,
      prompt_en:
        dir === 'translate-en-mr' ? `Choose the Marathi for "${w.en}"` : `Choose the English for "${w.mr}"`,
      prompt_mr: '',
      choices,
      answer: dir === 'translate-en-mr' ? w.mr : w.en,
      hint_en: `${w.pos}${w.tr ? ` · ${w.tr}` : ''}`,
    };
  });
}

function checkAnswer(ex: Drill, resp: { selected?: string; typed?: string; built?: string[] }): boolean {
  if (CHOICE_TYPES.includes(ex.type)) return resp.selected === ex.answer;
  if (ex.type === 'reorder') return normMr((resp.built ?? []).join(' ')) === normMr(ex.answer);
  if (ex.type === 'translate-mr-en') return normEn(resp.typed ?? '') === normEn(ex.answer);
  return normMr(resp.typed ?? '') === normMr(ex.answer);
}

function streakLevel(streak: number): number {
  return streak >= 5 ? Math.floor(streak / 5) : 0;
}

/** Visual-only grade bounce: a quick springy scale pop (no haptics dep). */
function GradePop({ children, ok }: { children: ReactNode; ok: boolean }) {
  const scale = useSharedValue(0.94);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  useEffect(() => {
    scale.value = withSequence(
      withSpring(ok ? 1.03 : 1, { damping: 9, stiffness: 320 }),
      withSpring(1, { damping: 12, stiffness: 320 }),
    );
  }, [ok, scale]);
  return <Animated.View style={anim}>{children}</Animated.View>;
}

function sessionSummary(marks: (boolean | undefined)[], total: number): string {
  const correct = marks.filter((m) => m === true).length;
  const pctDone = total > 0 ? Math.round((100 * correct) / total) : 0;
  const cheer =
    pctDone === 100 ? 'अप्रतिम! 🌟' : pctDone >= 70 ? 'छान काम! 👏' : 'सराव चालू ठेवा! 💪';
  return `🎉 संच पूर्ण! ${correct}/${total} बरोबर · ${cheer}`;
}

function FeedbackBlock({
  fb,
  streak,
  summary,
  onNext,
}: {
  fb: Fb;
  streak: number;
  summary: string | null;
  onNext: () => void;
}) {
  const { t } = useStore();
  const styles = makeStyles(t);
  const leveled = fb.ok && streak > 0 && streak % 5 === 0;
  return (
    <Animated.View entering={ZoomIn.springify().damping(16)}>
      <GradePop ok={fb.ok}>
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
          {summary ? <Text style={styles.done}>{summary}</Text> : null}
          <Gap />
          <Btn title="पुढे →" onPress={onNext} />
        </Card>
      </GradePop>
    </Animated.View>
  );
}

export default function DrillsScreen({ navigation, route }: any) {
  void navigation;
  const { award, t } = useStore();
  const styles = makeStyles(t);
  const paramTab = typeof route?.params?.tab === 'string' ? (route.params.tab as string) : 'pack';
  const [tab, setTab] = useState<string>(
    paramTab === 'speaking' || paramTab === 'vocab' ? paramTab : 'pack',
  );
  const [level, setLevel] = useState<string>('all');
  const [queue, setQueue] = useState<Drill[]>(() => sample(EXERCISES, SESSION_LEN));
  const [idx, setIdx] = useState<number>(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState<string>('');
  const [built, setBuilt] = useState<string[]>([]);
  const [fb, setFb] = useState<Fb | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [marks, setMarks] = useState<(boolean | undefined)[]>([]);
  const [round, setRound] = useState<number>(1);
  const [speakIdx, setSpeakIdx] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [micMsg, setMicMsg] = useState<string>('');
  const [listening, setListening] = useState<boolean>(false);

  useEffect(() => () => {
    stopSpeak();
  }, []);

  const micOk = voiceAvailable();
  const ex: Drill | undefined = queue[idx];
  const filteredCount = EXERCISES.filter((e) => level === 'all' || e.level === Number(level)).length;

  function newSession(nextTab: string = tab, nextLevel: string = level): void {
    const src =
      nextTab === 'vocab'
        ? buildVocabDrills(nextLevel)
        : EXERCISES.filter((e) => nextLevel === 'all' || e.level === Number(nextLevel));
    setQueue(sample(src, Math.min(SESSION_LEN, src.length)));
    setIdx(0);
    setSelected(null);
    setTyped('');
    setBuilt([]);
    setFb(null);
    setMarks([]);
    setRound((r) => r + 1);
  }

  function switchTab(next: string): void {
    stopSpeak();
    setTab(next);
    setStreak(0);
    setTranscript('');
    setMicMsg('');
    if (next !== 'speaking') newSession(next, level);
  }

  function changeLevel(next: string): void {
    stopSpeak();
    setLevel(next);
    setStreak(0);
    if (tab !== 'speaking') newSession(tab, next);
  }

  function grade(resp: { selected?: string; typed?: string; built?: string[] }): void {
    if (fb || !ex) return;
    const ok = checkAnswer(ex, resp);
    award('drills', ok);
    setStreak((s) => (ok ? s + 1 : 0));
    setMarks((m) => {
      const n = m.slice();
      n[idx] = ok;
      return n;
    });
    setFb({ ok, answer: ok ? '' : ex.answer, explain: ex.hint_en });
  }

  function next(): void {
    setFb(null);
    setSelected(null);
    setTyped('');
    setBuilt([]);
    if (idx + 1 < queue.length) setIdx(idx + 1);
    else newSession();
  }

  const speakingPool = SPEAKING.filter((s) => level === 'all' || s.level === Number(level));
  const prompt: SpeakPrompt | undefined =
    speakingPool.length > 0 ? speakingPool[speakIdx % speakingPool.length] : undefined;

  function speakNext(): void {
    setTranscript('');
    setMicMsg('');
    setSpeakIdx((i) => i + 1);
  }

  function selfGrade(ok: boolean): void {
    award('drills', ok);
    setStreak((s) => (ok ? s + 1 : 0));
    speakNext();
  }

  async function onMic(): Promise<void> {
    if (listening) return;
    setListening(true);
    setTranscript('');
    setMicMsg('');
    try {
      const text = await listenOnce('mr-IN', MIC_TIMEOUT_MS);
      setTranscript(text);
    } catch (e: any) {
      if (e && e.code === 'timeout') {
        setMicMsg('मायक वेळ संपला (8s) — पुन्हा प्रयत्न करा किंवा स्वतः गुण द्या.');
      } else {
        setMicMsg('मायक त्रुटी — स्वतः गुण द्या.');
      }
    } finally {
      setListening(false);
    }
  }

  const pct = queue.length ? Math.round((100 * idx) / queue.length) : 0;
  const remaining = ex
    ? ex.choices.filter(
        (c) =>
          built.filter((b) => b === c).length < ex.choices.filter((x) => x === c).length,
      )
    : [];

  return (
    <Screen scroll>
      <Text style={styles.title}>सराव — Drills</Text>
      <Card>
        <Seg options={TAB_OPTIONS} value={tab} onChange={switchTab} />
        <Gap />
        <Seg options={LEVEL_OPTIONS} value={level} onChange={changeLevel} />
        <Gap />
        <Text style={styles.muted}>
          🔥 {streak} चालू streak{tab === 'pack' ? ` · ${filteredCount} प्रश्न उपलब्ध` : ''}
        </Text>
      </Card>
      <Gap />

      {tab === 'speaking' ? (
        <Card>
          {!prompt ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎙️</Text>
              <Text style={styles.emptyTitle}>या स्तरावर बोलणं prompts नाहीत</Text>
              <Text style={styles.muted}>दुसरा स्तर निवडा किंवा सर्व स्तर पहा.</Text>
              {level !== 'all' ? (
                <>
                  <Gap />
                  <Btn
                    title="सर्व स्तर दाखवा"
                    kind="secondary"
                    small
                    onPress={() => changeLevel('all')}
                  />
                </>
              ) : null}
            </View>
          ) : (
            <Animated.View key={`sp-${speakIdx}`} entering={SlideInRight.springify().damping(20)}>
              <Text style={styles.muted}>
                {prompt.kind} · स्तर {prompt.level} · {(speakIdx % speakingPool.length) + 1}/
                {speakingPool.length}
              </Text>
              <Text style={styles.prompt}>{prompt.say_mr}</Text>
              {prompt.say_translit ? <Text style={styles.muted}>{prompt.say_translit}</Text> : null}
              <Text style={styles.muted}>{prompt.say_en}</Text>
              {prompt.tip_en ? <Text style={styles.hint}>💡 {prompt.tip_en}</Text> : null}
              {transcript ? <Text style={styles.heard}>🎤 “{transcript}”</Text> : null}
              {micMsg ? <Text style={styles.muted}>{micMsg}</Text> : null}
              <Gap />
              <View style={styles.row}>
                <HearBtn text={prompt.say_mr} title="🔊 ऐका" />
                {micOk ? (
                  <Btn
                    title={listening ? '⏹ ऐकतोय…' : '🎤 बोला'}
                    onPress={onMic}
                    disabled={listening}
                  />
                ) : (
                  <Text style={styles.muted}>मायक उपलब्ध नाही — स्वतः गुण द्या.</Text>
                )}
              </View>
              <Gap />
              <View style={styles.row}>
                <Btn title={`✓ मी बोललो (+${XP_CORRECT} XP)`} onPress={() => selfGrade(true)} />
                <Btn title="वगळा →" onPress={() => selfGrade(false)} kind="secondary" small />
              </View>
            </Animated.View>
          )}
        </Card>
      ) : (
        <Animated.View key={`${tab}-${round}-${idx}`} entering={SlideInRight.springify().damping(20)}>
          <Card>
            {!ex ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={styles.emptyTitle}>या स्तरावर प्रश्न नाहीत</Text>
                <Text style={styles.muted}>दुसरा स्तर निवडा — सोप्यापासून सुरुवात करा! 🌱</Text>
                {level !== 'all' ? (
                  <>
                    <Gap />
                    <Btn
                      title="सर्व स्तर दाखवा"
                      kind="secondary"
                      small
                      onPress={() => changeLevel('all')}
                    />
                  </>
                ) : null}
              </View>
            ) : (
              <>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.muted}>
                  {TYPE_LABEL[ex.type] ?? ex.type} · स्तर {ex.level} · प्रश्न {idx + 1}/{queue.length}{' '}
                  · {ex.skill}
                </Text>
                {ex.prompt_en ? <Text style={styles.q}>{ex.prompt_en}</Text> : null}
                {ex.prompt_mr ? <Text style={styles.prompt}>{ex.prompt_mr}</Text> : null}

                {CHOICE_TYPES.includes(ex.type) &&
                  ex.choices.map((c, ci) => (
                    <Animated.View
                      key={`${c}-${ci}`}
                      entering={FadeInDown.delay(ci * 45)
                        .springify()
                        .damping(16)}>
                      <Opt
                        label={c}
                        state={
                          fb
                            ? c === ex.answer
                              ? 'correct'
                              : c === selected
                                ? 'wrong'
                                : 'idle'
                            : 'idle'
                        }
                        disabled={!!fb}
                        onPress={() => {
                          setSelected(c);
                          grade({ selected: c });
                        }}
                      />
                    </Animated.View>
                  ))}

                {(ex.type === 'translate-en-mr' || ex.type === 'translate-mr-en') && (
                  <View>
                    <Text style={styles.label}>तुमचं उत्तर</Text>
                    <TextInput
                      style={styles.input}
                      value={typed}
                      editable={!fb}
                      onChangeText={setTyped}
                      onSubmitEditing={() => grade({ typed })}
                      placeholder={ex.type === 'translate-en-mr' ? 'मराठीत लिहा…' : 'Write in English…'}
                      placeholderTextColor={t.muted}
                    />
                    <Gap />
                    <Btn
                      title="तपासा"
                      onPress={() => grade({ typed })}
                      disabled={!!fb || !typed.trim()}
                    />
                  </View>
                )}

                {ex.type === 'reorder' && !fb && (
                  <View>
                    <Text style={styles.built}>{built.length ? built.join(' ') : 'शब्दांवर टॅप करा…'}</Text>
                    <View style={styles.chipsRow}>
                      {remaining.map((c, i) => (
                        <Btn
                          key={`${c}-${i}`}
                          title={c}
                          kind="secondary"
                          small
                          onPress={() => setBuilt([...built, c])}
                        />
                      ))}
                    </View>
                    <View style={styles.row}>
                      <Btn
                        title="↩ मागे"
                        kind="secondary"
                        small
                        disabled={!built.length}
                        onPress={() => setBuilt(built.slice(0, -1))}
                      />
                      <Btn
                        title="साफ करा"
                        kind="secondary"
                        small
                        disabled={!built.length}
                        onPress={() => setBuilt([])}
                      />
                    </View>
                    <Gap />
                    <Btn
                      title="तपासा"
                      onPress={() => grade({ built })}
                      disabled={built.length !== ex.choices.length}
                    />
                  </View>
                )}
                {ex.type === 'reorder' && fb ? <Text style={styles.prompt}>{built.join(' ')}</Text> : null}
              </>
            )}
          </Card>
        </Animated.View>
      )}

      {fb && tab !== 'speaking' ? (
        <>
          <Gap />
          <FeedbackBlock
            fb={fb}
            streak={streak}
            summary={
              idx === queue.length - 1 && queue.length > 0
                ? sessionSummary(marks, queue.length)
                : null
            }
            onNext={next}
          />
        </>
      ) : null}

      {!fb && tab !== 'speaking' && ex ? (
        <>
          <Gap />
          <Btn title="नवे 10 प्रश्न" kind="secondary" small onPress={() => newSession()} />
        </>
      ) : null}

      {tab !== 'speaking' && queue.length > 0 ? (
        <>
          <Gap />
          <FlatList
            horizontal
            data={queue}
            keyExtractor={(item, i) => `${item.id}-${i}`}
            extraData={marks}
            showsHorizontalScrollIndicator={false}
            renderItem={({ index }) => (
              <View style={styles.stripItem}>
                <Chip>
                  {`${index === idx ? '▶ ' : ''}Q${index + 1}${marks[index] === undefined ? '' : marks[index] ? ' ✓' : ' ✗'}`}
                </Chip>
              </View>
            )}
          />
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
  q: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  prompt: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 20,
    marginTop: 8,
  },
  hint: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 14,
    marginTop: 4,
  },
  heard: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 16,
    marginTop: 4,
  },
  label: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 14,
    marginTop: 8,
  },
  input: {
    borderColor: t.line,
    borderRadius: 8,
    borderWidth: 1,
    color: t.ink,
    fontFamily: FONT,
    fontSize: 16,
    marginTop: 4,
    padding: 10,
  },
  built: {
    backgroundColor: t.surface2,
    borderRadius: 8,
    color: t.ink,
    fontFamily: FONT,
    fontSize: 18,
    marginTop: 8,
    padding: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  done: {
    color: t.greenInk,
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  stripItem: {
    marginRight: 8,
  },
  });
}
