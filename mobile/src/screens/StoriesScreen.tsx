import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BookOpen } from 'lucide-react-native';
import storiesData from '../data/stories.json';
import { useStore } from '../store';
import { FONT } from '../theme';
import type { Theme } from '../theme';
import { Btn, Card, Gap, Opt, Screen, Seg } from '../ui';
import { speak, stopSpeak } from '../tts';
import { shuffleOptions } from '../lib';
import { StoryArt } from '../components/StoryArt';
import { Celebrate } from '../components/Celebrate';

const XP_STORY_DONE = 15;
const KARA_MS = 1600;

interface Gloss {
  mr: string;
  en: string;
}

interface StoryQ {
  q_mr: string;
  q_en: string;
  options: string[];
  answer: number;
}

interface Story {
  id: string;
  level: number;
  title_mr: string;
  title_en: string;
  text_mr: string;
  text_en: string;
  gloss?: Gloss[];
  questions?: StoryQ[];
}

const stories = storiesData as unknown as Story[];

interface Pal {
  text: string;
  muted: string;
  hiBg: string;
  glossBg: string;
  chipBg: string;
}

function palette(dark: boolean, t: Theme): Pal {
  return {
    text: t.ink,
    muted: t.muted,
    hiBg: dark ? '#5a4a1f' : '#ffe9a8',
    glossBg: t.surface2,
    chipBg: t.surface2,
  };
}

function splitSentences(text: string): string[] {
  const m = text.match(/[^।.!?]+[।.!?]+|[^।.!?]+$/g);
  return (m ?? [text]).map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Slim animated read-along progress track: progress = active sentence / total. */
function ReadProgress({ active, total }: { active: number; total: number }): React.JSX.Element {
  const { t } = useStore();
  const [trackW, setTrackW] = useState(0);
  const pct = total > 0 && active >= 0 ? (active + 1) / total : 0;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(pct, { duration: 400 });
  }, [pct, p]);
  const fill = useAnimatedStyle(() => ({ width: p.value * trackW }));
  return (
    <View
      style={[styles.pbar, { backgroundColor: t.line }]}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.pfill, { backgroundColor: t.green }, fill]} />
    </View>
  );
}

/** One story sentence with a smoothly cross-fading karaoke highlight. */
function KaraSentence({
  s,
  active,
  hiBg,
  speed,
  gm,
  trail,
  onToggleGloss,
}: {
  s: string;
  active: boolean;
  hiBg: string;
  speed: number;
  gm: Map<string, string>;
  trail: boolean;
  onToggleGloss: (mr: string) => void;
}): React.JSX.Element {
  const v = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    v.value = withTiming(active ? 1 : 0, { duration: 350 });
  }, [active, v]);
  const anim = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(v.value, [0, 1], ['rgba(0,0,0,0)', hiBg]),
  }));
  return (
    <Animated.Text
      style={[anim, styles.sentenceHi]}
      onLongPress={() => {
        stopSpeak();
        void speak(s, speed);
      }}>
      {s.split(/\s+/).map((w, j, arr) => {
        const clean = w.replace(/[।.,?!]/g, '');
        const en = gm.get(clean) ?? gm.get(w);
        const glossed = en !== undefined;
        return (
          <Text key={j}>
            {glossed ? (
              <Text
                style={styles.glossed}
                onPress={() => onToggleGloss(gm.has(clean) ? clean : w)}
              >
                {w}
              </Text>
            ) : (
              w
            )}
            {j < arr.length - 1 ? ' ' : ''}
          </Text>
        );
      })}
      {trail ? ' ' : ''}
    </Animated.Text>
  );
}

function Reader({ story, onBack }: { story: Story; onBack: () => void }): React.JSX.Element {
  const { settings, award, dark, t } = useStore();
  const speed = settings.speed;
  const pal = palette(dark, t);
  const [showEn, setShowEn] = useState(false);
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [fb, setFb] = useState<{ ok: boolean; answer: string } | null>(null);
  const [streak, setStreak] = useState(0);
  const [done, setDone] = useState(false);
  const [earned, setEarned] = useState(0);
  const [glossOn, setGlossOn] = useState<string | null>(null);
  const gm = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of story.gloss ?? []) m.set(g.mr, g.en);
    return m;
  }, [story]);
  const sents = useMemo(() => splitSentences(story.text_mr), [story]);
  const mounted = useRef(true);
  const karaTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const playSeq = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      playSeq.current += 1;
      if (karaTimer.current) clearInterval(karaTimer.current);
      karaTimer.current = null;
      stopSpeak();
    };
  }, [story.id]);

  function clearKara(): void {
    if (karaTimer.current) {
      clearInterval(karaTimer.current);
      karaTimer.current = null;
    }
  }

  function readAlong(): void {
    if (playing) {
      playSeq.current += 1;
      stopSpeak();
      clearKara();
      setPlaying(false);
      setActive(-1);
      return;
    }
    const my = playSeq.current + 1;
    playSeq.current = my;
    setPlaying(true);
    clearKara();
    let i = 0;
    setActive(0);
    karaTimer.current = setInterval(() => {
      i += 1;
      if (!mounted.current || playSeq.current !== my || i >= sents.length) {
        clearKara();
        if (mounted.current && playSeq.current === my) {
          setPlaying(false);
          setActive(-1);
        }
        return;
      }
      setActive(i);
    }, KARA_MS);
    // NOTE: speak() resolves when TTS *starts*, so the timer above (not this
    // promise) owns end-of-playback: it clears the highlight on completion.
    void speak(story.text_mr, speed);
  }

  const questions = story.questions ?? [];
  const q: StoryQ | null = questions[qi] ?? null;
  const sq = useMemo(() => (q ? shuffleOptions(q.options, q.answer) : null), [q]);

  function answer(idx: number): void {
    if (fb || !q || !sq) return;
    const ok = idx === sq.answer;
    setPicked(idx);
    if (ok) setEarned((e) => e + XP_STORY_DONE);
    award('stories', ok, XP_STORY_DONE);
    setStreak((s) => (ok ? s + 1 : 0));
    setFb({ ok, answer: ok ? '' : (sq.options[sq.answer] ?? '') });
  }

  function nextQ(): void {
    setFb(null);
    setPicked(null);
    if (qi + 1 < questions.length) setQi(qi + 1);
    else setDone(true);
  }

  function toggleGloss(mr: string): void {
    setGlossOn((g) => (g === mr ? null : mr));
  }

  return (
    <ScrollView
        testID="story-reader"
        style={styles.flex}
        contentContainerStyle={{paddingBottom: 24}}
        showsVerticalScrollIndicator={false}>
      <View style={styles.row}>
        <Btn title="← सर्व गोष्टी" kind="secondary" small onPress={onBack} />
        <View style={[styles.chip, { backgroundColor: pal.chipBg }]}>
          <Text style={[styles.chipText, { color: pal.text }]}>L{story.level}</Text>
        </View>
        {playing && active >= 0 && (
          <Text style={[styles.small, { color: pal.muted }]}>
            {active + 1}/{sents.length}
          </Text>
        )}
      </View>
      <Gap h={8} />
      <ReadProgress active={active} total={sents.length} />
      <Gap />
      <StoryArt id={story.id} />
      <Gap />
      <Text style={[styles.h2, { color: pal.text }]}>
        {story.title_mr} <Text style={[styles.muted, { color: pal.muted }]}>{story.title_en}</Text>
      </Text>
      <Gap />
      <View style={styles.row}>
        <Btn
          title={playing ? '⏹ थांबा' : '▶ ऐका + वाचा (Read-along)'}
          kind="primary"
          small
          onPress={readAlong}
        />
        <Btn
          title={showEn ? '✓ English दाखवा' : 'English दाखवा'}
          kind="secondary"
          small
          onPress={() => setShowEn((v) => !v)}
        />
      </View>
      <Gap />
      <Text style={[styles.storyText, { color: pal.text }]} testID="story-text">
        {sents.map((s, i) => (
          <KaraSentence
            key={i}
            s={s}
            active={i === active}
            hiBg={pal.hiBg}
            speed={speed}
            gm={gm}
            trail={i < sents.length - 1}
            onToggleGloss={toggleGloss}
          />
        ))}
      </Text>
      <Text style={[styles.small, { color: pal.muted }]}>
        💡 शब्दावर टॅप = अर्थ · वाक्यावर long-press = ऐका
      </Text>
      {glossOn !== null && gm.get(glossOn) !== undefined && (
        <Animated.View
          key={glossOn}
          entering={FadeInDown.duration(220)}
          style={styles.glossWrap}>
          <Pressable
            onPress={() => setGlossOn(null)}
            style={[styles.glossPill, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Text style={[styles.body, styles.glossText, { color: pal.text }]} numberOfLines={3}>
              <Text style={styles.bold}>{glossOn}</Text>
              <Text style={[styles.small, { color: pal.muted }]}> = {gm.get(glossOn)}</Text>
            </Text>
            <Text style={[styles.small, { color: pal.muted }]}>✕</Text>
          </Pressable>
        </Animated.View>
      )}
      {showEn && (
        <Animated.View entering={FadeIn.duration(250)}>
          <Text style={[styles.muted, { color: pal.muted }]} testID="story-en">
            {story.text_en}
          </Text>
        </Animated.View>
      )}
      <Gap />
      {(story.gloss ?? []).length > 0 && (
        <Card>
          <Text style={[styles.h3, { color: pal.text }]}>शब्दार्थ ({(story.gloss ?? []).length} words)</Text>
          <View style={styles.chipRow}>
            {(story.gloss ?? []).map((g, idx) => (
              <Animated.View
                key={g.mr}
                entering={FadeIn.delay(Math.min(idx, 12) * 40).duration(250)}>
                <Pressable
                  testID={`gloss-${g.mr}`}
                  onPress={() => toggleGloss(g.mr)}
                  style={[styles.chip, { backgroundColor: pal.glossBg }]}
                >
                  <Text style={[styles.chipText, { color: pal.text }]}>
                    {glossOn === g.mr ? `${g.mr} = ${g.en}` : g.mr}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Card>
      )}
      <Gap />
      <Text style={[styles.h3, { color: pal.text }]}>प्रश्न — Quiz</Text>
      {questions.length === 0 && (
        <Text style={[styles.muted, { color: pal.muted }]}>या गोष्टीला प्रश्न नाहीत.</Text>
      )}
      {q !== null && sq !== null && !done && (
        <Animated.View
          key={`${story.id}-${qi}`}
          entering={FadeInDown.duration(350)}
          testID="story-quiz">
          <Text style={[styles.body, { color: pal.text }]}>
            <Text style={styles.bold}>{q.q_mr} </Text>
            <Text style={[styles.small, { color: pal.muted }]}>
              ({q.q_en}) · {qi + 1}/{questions.length}
            </Text>
          </Text>
          {sq.options.map((op, idx) => (
            <Animated.View
              key={`${qi}-${idx}`}
              entering={FadeInDown.delay(80 + idx * 70).duration(300)}>
              <Opt
                label={op}
                state={picked === idx ? (idx === sq.answer ? 'correct' : 'wrong') : 'idle'}
                disabled={fb !== null}
                onPress={() => answer(idx)}
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
      <Gap />
      <Card>
        <Text style={[styles.body, { color: pal.text }]}>
          चर्चा करा — Discuss 💬: {story.title_mr} आवडली का? आवडता भाग कोणता? / Did you like
          “{story.title_en}”? Which part was your favourite, and why? एका मित्राला ही गोष्ट दोन
          वाक्यांत सांगून दाखव!
        </Text>
      </Card>
      <Gap />
      {done && (
        <Animated.View key="story-done" entering={ZoomIn.springify().damping(16)}>
          <Celebrate
            title="अभिनंदन! Story complete!"
            sub={`+${earned} XP · ${story.title_mr} पूर्ण 🎊`}
            actionLabel="आणखी गोष्टी →"
            onAction={onBack}
          />
        </Animated.View>
      )}
    </ScrollView>
  );
}

export default function StoriesScreen({ navigation, route }: any): React.JSX.Element {
  void navigation;
  void route;
  const { dark, t, progress } = useStore();
  const pal = palette(dark, t);
  const storiesXP = progress.byMode.stories ?? 0;
  const [level, setLevel] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const levels = useMemo(
    () => [...new Set(stories.map((s) => s.level))].sort((a, b) => a - b),
    [],
  );
  const list = stories.filter((s) => level === 'all' || s.level === Number(level));
  const story = openId ? (stories.find((s) => s.id === openId) ?? null) : null;

  return (
    <Screen>
      <View style={styles.header}>
        <BookOpen size={22} color={pal.text} />
        <Text style={[styles.title, { color: pal.text }]}>गोष्टी — Stories</Text>
      </View>
      {story ? (
        <Reader story={story} onBack={() => setOpenId(null)} />
      ) : (
        <>
          <Text style={[styles.small, { color: pal.muted }]}>
            {stories.length} leveled tales with read-along audio, word meanings and quizzes.
            {storiesXP > 0 ? ` · ⭐ ${storiesXP} XP` : ''}
          </Text>
          <Gap />
          <View testID="level-filter">
            <Seg
              value={level}
              onChange={(v: string) => setLevel(v)}
              options={[
                { value: 'all', label: 'सर्व' },
                ...levels.map((l) => ({ value: String(l), label: `L${l}` })),
              ]}
            />
          </View>
          <Gap />
          <FlatList
            style={styles.flex}
            data={list}
            keyExtractor={(s) => s.id}
            testID="story-grid"
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).duration(350)}>
                <Pressable onPress={() => setOpenId(item.id)} testID={`story-${item.id}`}>
                  <Card>
                    <View style={styles.cardHead}>
                      <StoryArt id={item.id} size={64} />
                      <View style={[styles.chip, { backgroundColor: pal.chipBg }]}>
                        <Text style={[styles.chipText, { color: pal.text }]}>L{item.level}</Text>
                      </View>
                    </View>
                    <Text style={[styles.h3, { color: pal.text }]}>{item.title_mr}</Text>
                    <Text style={[styles.small, { color: pal.muted }]}>{item.title_en}</Text>
                    <Text style={[styles.small, { color: pal.text }]}>
                      {(item.questions ?? []).length} प्रश्न · {(item.gloss ?? []).length} शब्द
                    </Text>
                  </Card>
                </Pressable>
                <Gap />
              </Animated.View>
            )}
          />
        </>
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
  h2: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: '700',
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
  muted: {
    fontFamily: FONT,
    fontSize: 14,
  },
  storyText: {
    fontFamily: FONT,
    fontSize: 18,
    lineHeight: 30,
  },
  sentenceHi: {
    borderRadius: 4,
  },
  glossed: {
    fontFamily: FONT,
    textDecorationLine: 'underline',
  },
  glossWrap: {
    alignItems: 'center',
    paddingVertical: 8,
    width: '100%',
  },
  glossPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    maxWidth: '100%',
    alignSelf: 'center',
    flexShrink: 1,
  },
  glossText: {
    flexShrink: 1,
  },
  pbar: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
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
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: FONT,
    fontSize: 14,
  },
});
