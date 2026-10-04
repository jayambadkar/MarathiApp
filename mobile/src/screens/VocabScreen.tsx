import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FlipInYLeft } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../store';
import { FONT } from '../theme';
import type { Theme } from '../theme';
import { Btn, Card, Chip, Gap, HearBtn, Opt, Screen, Seg, XPBadge } from '../ui';
import { sample, shuffle, shuffleOptions } from '../lib';
import vocabData from '../data/vocab.json';

interface VocabWord {
  en: string;
  mr: string;
  tr?: string;
  pos: string;
  level: number;
  cat: string;
}

interface SrsState {
  boxes: Record<string, number>;
}

interface Fb {
  ok: boolean;
  answer: string;
  explain: string;
}

const VOCAB = vocabData as VocabWord[];

const MAX_BOX = 5;
const SESSION_LEN = 12;
const SRS_KEY = 'mt.srs.v1';

const DIR_OPTIONS = [
  { label: 'EN → MR', value: 'en-mr' },
  { label: 'MR → EN', value: 'mr-en' },
];

const LEVEL_OPTIONS = [
  { label: 'सर्व', value: 'all' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
];

function boxOf(srs: SrsState, en: string): number {
  return srs.boxes[en] || 1;
}

/** Due-first ordering: lowest box first, then random. */
function orderQueue(words: VocabWord[], srs: SrsState): VocabWord[] {
  return words
    .map((w) => ({ w, r: Math.random() }))
    .sort((a, b) => boxOf(srs, a.w.en) - boxOf(srs, b.w.en) || a.r - b.r)
    .map((x) => x.w);
}

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

export default function VocabScreen({ navigation, route }: any) {
  void navigation;
  const { award, t } = useStore();
  const styles = makeStyles(t);
  const paramDir = typeof route?.params?.dir === 'string' ? (route.params.dir as string) : 'en-mr';
  const [srs, setSrs] = useState<SrsState>({ boxes: {} });
  const [dir, setDir] = useState<string>(paramDir === 'mr-en' ? 'mr-en' : 'en-mr');
  const [level, setLevel] = useState<string>('all');
  const [queue, setQueue] = useState<VocabWord[]>(() => sample(VOCAB, SESSION_LEN));
  const [idx, setIdx] = useState<number>(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [fb, setFb] = useState<Fb | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [round, setRound] = useState<number>(1);

  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(SRS_KEY)
      .then((raw) => {
        if (!live || !raw) return;
        try {
          const v = JSON.parse(raw) as SrsState;
          if (v && typeof v === 'object' && v.boxes && typeof v.boxes === 'object') {
            setSrs({ boxes: v.boxes });
          }
        } catch {
          /* keep defaults */
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const word: VocabWord | undefined = queue[idx];
  const askMr = dir === 'mr-en';

  const options = useMemo<VocabWord[]>(() => {
    if (!word) return [];
    const pool = VOCAB.filter((d) => d.en !== word.en && d.level === word.level);
    const distract = shuffle(pool).slice(0, 3);
    const sq = shuffleOptions([word.en, ...distract.map((d) => d.en)], 0);
    const byEn = new Map<string, VocabWord>();
    byEn.set(word.en, word);
    for (const d of distract) byEn.set(d.en, d);
    const out: VocabWord[] = [];
    for (const k of sq.options) {
      const w = byEn.get(k);
      if (w) out.push(w);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, round]);

  const dist = useMemo(() => {
    const d = [0, 0, 0, 0, 0];
    for (const w of VOCAB) d[boxOf(srs, w.en) - 1] += 1;
    return d;
  }, [srs]);

  function persist(next: SrsState): void {
    setSrs(next);
    AsyncStorage.setItem(SRS_KEY, JSON.stringify(next)).catch(() => {});
  }

  function newSession(nextDir: string = dir, nextLevel: string = level): void {
    const pool = VOCAB.filter((w) => nextLevel === 'all' || w.level === Number(nextLevel));
    setQueue(orderQueue(sample(pool, Math.min(SESSION_LEN * 2, pool.length)), srs).slice(0, SESSION_LEN));
    setIdx(0);
    setPicked(null);
    setFb(null);
    setRound((r) => r + 1);
  }

  function changeDir(next: string): void {
    setDir(next);
    setStreak(0);
    newSession(next, level);
  }

  function changeLevel(next: string): void {
    setLevel(next);
    setStreak(0);
    newSession(dir, next);
  }

  function grade(choice: VocabWord): void {
    if (fb || !word) return;
    const ok = choice.en === word.en;
    award('vocab', ok);
    setStreak((s) => (ok ? s + 1 : 0));
    const nextBox = ok ? Math.min(MAX_BOX, boxOf(srs, word.en) + 1) : 1;
    persist({ boxes: { ...srs.boxes, [word.en]: nextBox } });
    setPicked(choice.en);
    setFb({
      ok,
      answer: ok ? '' : askMr ? word.en : word.mr,
      explain: `${word.mr} · ${word.en}${word.tr ? ` · ${word.tr}` : ''} — पेटी ${boxOf(srs, word.en)} → ${nextBox}`,
    });
  }

  function next(): void {
    setFb(null);
    setPicked(null);
    if (idx + 1 < queue.length) setIdx(idx + 1);
    else newSession();
  }

  const pct = queue.length ? Math.round((100 * idx) / queue.length) : 0;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>शब्द-संग्रह — Vocab</Text>
        <XPBadge />
      </View>
      <Card>
        <Seg options={DIR_OPTIONS} value={dir} onChange={changeDir} />
        <Gap />
        <Seg options={LEVEL_OPTIONS} value={level} onChange={changeLevel} />
        <Gap />
        <View style={styles.srsRow}>
          {dist.map((n, i) => (
            <View key={i} style={styles.stripItem}>
              <Chip>{`📦${i + 1} · ${n}`}</Chip>
            </View>
          ))}
        </View>
        <Gap />
        <Text style={styles.muted}>
          🔥 {streak} streak · {VOCAB.length} शब्द · SRS पेट्या {SRS_KEY} मध्ये जतन
        </Text>
      </Card>
      <Gap />

      <Animated.View key={`${round}-${idx}`} entering={FlipInYLeft.springify()}>
        <Card>
          {!word ? (
            <Text style={styles.muted}>या स्तरावर शब्द नाहीत.</Text>
          ) : (
            <>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.muted}>
                प्रश्न {idx + 1}/{queue.length} · पेटी {boxOf(srs, word.en)} · {word.pos} · स्तर{' '}
                {word.level}
              </Text>
              <Text style={styles.prompt}>{askMr ? word.mr : word.en}</Text>
              <Text style={styles.hint}>
                {word.pos}
                {word.tr ? ` · ${word.tr}` : ''}
              </Text>
              {askMr ? (
                <>
                  <Gap />
                  <HearBtn text={word.mr} title="🔊 ऐका" />
                </>
              ) : null}
              <Gap />
              {options.map((o) => (
                <Opt
                  key={o.en}
                  label={askMr ? o.en : o.mr}
                  sub={askMr ? o.pos : o.tr || undefined}
                  state={
                    fb ? (o.en === word.en ? 'correct' : o.en === picked ? 'wrong' : 'idle') : 'idle'
                  }
                  disabled={!!fb}
                  onPress={() => grade(o)}
                />
              ))}
            </>
          )}
        </Card>
      </Animated.View>

      {fb ? (
        <>
          <Gap />
          <FeedbackBlock fb={fb} streak={streak} onNext={next} />
        </>
      ) : null}

      {!fb && word ? (
        <>
          <Gap />
          <Btn title="नवा संच" kind="secondary" small onPress={() => newSession()} />
        </>
      ) : null}

      {queue.length > 0 ? (
        <>
          <Gap />
          <FlatList
            horizontal
            data={queue}
            keyExtractor={(item, i) => `${item.en}-${i}`}
            extraData={srs}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <View style={styles.stripItem}>
                <Chip>{`Q${index + 1} 📦${boxOf(srs, item.en)}`}</Chip>
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
  prompt: {
    color: t.ink,
    fontFamily: FONT,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  hint: {
    color: t.muted,
    fontFamily: FONT,
    fontSize: 14,
    marginTop: 4,
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
  srsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  stripItem: {
    marginRight: 8,
    marginBottom: 4,
  },
  });
}
