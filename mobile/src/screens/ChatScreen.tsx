import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MessageCircle } from 'lucide-react-native';
import { useStore } from '../store';
import { FONT } from '../theme';
import { Btn, Card, Gap, HearBtn, Screen, TextField, XPBadge } from '../ui';
import { speak, stopSpeak } from '../tts';
import { listenOnce, voiceAvailable } from '../voice';

const XP_CHAT_MSG = 2;

interface ChatSettings {
  apiBase?: string;
  apiKey?: string;
  apiStyle?: string;
  model?: string;
  speed?: number;
}

interface Msg {
  id: string;
  role: 'user' | 'tutor';
  text: string;
  corrected?: string;
}

const SEED: Msg[] = [
  {
    id: 'msg-0',
    role: 'tutor',
    text: 'नमस्कार! 🙏 मी तुझा मराठी मित्र. मराठीत काहीतरी लिहा — मी मदत करेन! (Hello! I am your Marathi buddy. Write something in Marathi!)',
  },
];

// --- Offline rule engine (faithful port of web/src/lib/chat.js) ---

const GREETINGS = ['नमस्कार', 'नमस्ते', 'hello', 'hi', 'hey', 'ram ram'];

const SMALL_TALK: { k: string[]; r: string }[] = [
  {
    k: ['नाव', 'name'],
    r: 'माझं नाव मराठी मित्र आहे! 🤖 तुझं नाव काय? (My name is Marathi Mitra! What is your name?)',
  },
  {
    k: ['कसा आहेस', 'कशी आहेस', 'कसे आहात', 'how are you'],
    r: 'मी छान आहे, धन्यवाद! 😊 तू कसा/कशी आहेस? (I am well, thank you! How are you?)',
  },
  {
    k: ['धन्यवाद', 'thank'],
    r: 'अगदी स्वागत आहे! 🙏 (You are most welcome!)',
  },
  {
    k: ['bye', 'निरोप', 'भेटू'],
    r: 'पुन्हा भेटू! 👋 सराव करत राहा. (See you again! Keep practicing.)',
  },
];

const WORD_HELP: { k: string[]; r: string }[] = [
  { k: ['पाणी', 'water'], r: '💧 पाणी = water. वाक्य: "मला पाणी हवं आहे." (I want water.)' },
  { k: ['जेवण', 'food', 'जेवायला'], r: '🍛 जेवण = food/meal. वाक्य: "जेवण तयार आहे." (The meal is ready.)' },
  { k: ['शाळा', 'school'], r: '🏫 शाळा = school. वाक्य: "मी शाळेत जातो/जाते." (I go to school.)' },
  { k: ['मांजर', 'cat'], r: '🐱 मांजर = cat. वाक्य: "मांजर दूध पितं." (The cat drinks milk.)' },
  { k: ['पुस्तक', 'book'], r: '📖 पुस्तक = book. वाक्य: "हे माझं पुस्तक आहे." (This is my book.)' },
];

function offlineReply(input: string): { text: string; corrected: string } {
  const t = (input || '').trim();
  const low = t.toLowerCase();
  if (!t) return { text: 'काहीतरी लिहा — मी मराठीत उत्तर देईन! ✍️', corrected: '' };
  if (GREETINGS.some((g) => low.startsWith(g)))
    return {
      text: 'नमस्कार! 🙏 मी तुझा मराठी शिक्षक आहे. मराठीत काहीतरी विचार! (Hello! I am your Marathi tutor. Ask me something in Marathi!)',
      corrected: '',
    };
  for (const s of SMALL_TALK) {
    if (s.k.some((k) => low.includes(k.toLowerCase()))) return { text: s.r, corrected: '' };
  }
  for (const w of WORD_HELP) {
    if (w.k.some((k) => low.includes(k.toLowerCase()))) return { text: w.r, corrected: '' };
  }
  // Gender-verb nudge: मी जाते (f.) vs मी जातो (m.) — remind, don't scold
  if (/मी .*ते\b/.test(t) && !/मी (जाते|करते|बोलते|शिकते|राहते|घेते)/.test(t)) {
    return {
      text: 'छान प्रयत्न! 👏 लक्षात ठेव: "मी" सोबत क्रियापद बदलतं — मुलगा म्हणतो "मी जातो", मुलगी म्हणते "मी जाते". तुझं वाक्य पुन्हा लिहून पाहा! (Nice try! Remember verb gender with मी.)',
      corrected: '',
    };
  }
  if (/[ऀ-ॿ]/.test(t)) {
    // contains Devanagari — praise + follow-up question
    const follows = [
      'छान! 🌟 आणखी एक वाक्य लिहा — आज तू काय केलंस? (Great! Write one more sentence — what did you do today?)',
      'खूप छान! 🎉 "मला ___ आवडतं" वापरून एक वाक्य बनव. (Very nice! Make a sentence with "I like ___".)',
      'शाब्बास! 👏 आता हेच वाक्य प्रश्नात बदल: शेवटी "का?" जोड. (Bravo! Now turn it into a question with "का?".)',
    ];
    return { text: follows[t.length % follows.length] ?? follows[0] ?? '', corrected: '' };
  }
  return {
    text: 'मराठीत लिहायचा प्रयत्न कर! 💪 उदाहरण: "माझं नाव ___ आहे." (Try writing in Marathi! Example: "My name is ___".)',
    corrected: '',
  };
}

function isOnline(s: ChatSettings): boolean {
  return Boolean(s.apiBase && s.apiKey);
}

function systemPrompt(): string {
  return 'You are a friendly Marathi tutor for beginners. Always reply with Marathi (Devanagari) first, then a short English gloss in parentheses. Correct mistakes gently, then ask one follow-up question. Keep replies under 60 words.';
}

async function llmReply(s: ChatSettings, messages: Msg[]): Promise<string> {
  const base = (s.apiBase ?? '').replace(/\/+$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${s.apiKey ?? ''}`,
  };
  const model = s.model || 'muse-spark-1.3-contributor';
  if ((s.apiStyle || 'chat') === 'responses') {
    const input = messages
      .map((m) => `${m.role === 'user' ? 'Learner' : 'Tutor'}: ${m.text}`)
      .join('\n');
    const res = await fetch(`${base}/responses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, instructions: systemPrompt(), input }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as {
      output_text?: string;
      output?: { content?: { text?: string }[] }[];
    };
    return (
      data.output_text ||
      data.output?.map((o) => o.content?.map((c) => c.text).join('')).join('') ||
      '(रिकामं उत्तर)'
    );
  }
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt() },
        ...messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
      ],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content || '(रिकामं उत्तर)';
}

// --- Screen ---



export default function ChatScreen({ navigation, route }: any): React.JSX.Element {
  void navigation;
  void route;
  const { settings, award, t } = useStore();
  const cs = settings as unknown as ChatSettings;
  const pal = {
    text: t.ink,
    muted: t.muted,
    userBg: t.green,
    userText: '#fff',
    tutorBg: t.surface2,
    chipBg: t.surface2,
  };
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [micMsg, setMicMsg] = useState('');
  const [listening, setListening] = useState(false);
  const idRef = useRef(1);
  const online = isOnline(cs);

  useEffect(
    () => () => {
      stopSpeak();
    },
    [],
  );

  async function send(text: string): Promise<void> {
    const clean = (text || '').trim();
    if (!clean || busy) return;
    setDraft('');
    setMicMsg('');
    const next: Msg[] = [...msgs, { id: `msg-${idRef.current++}`, role: 'user', text: clean }];
    setMsgs(next);
    award('chat', true, XP_CHAT_MSG);
    setBusy(true);
    try {
      let reply: string;
      let corrected = '';
      if (online) {
        try {
          reply = await llmReply(cs, next.slice(-12));
        } catch {
          const off = offlineReply(clean);
          reply = `${off.text}\n\n(⚠️ online API failed — offline tutor answered.)`;
          corrected = off.corrected;
        }
      } else {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 350);
        });
        const off = offlineReply(clean);
        reply = off.text;
        corrected = off.corrected;
      }
      setMsgs((m) => [...m, { id: `msg-${idRef.current++}`, role: 'tutor', text: reply, corrected }]);
    } finally {
      setBusy(false);
    }
  }

  async function mic(): Promise<void> {
    if (listening) return;
    if (!voiceAvailable()) {
      setMicMsg('या डिव्हाइसवर voice input नाही.');
      return;
    }
    setListening(true);
    setMicMsg('🎤 ऐकतोय… बोला!');
    try {
      const transcript = await listenOnce('mr-IN', 8000);
      if (transcript) {
        setDraft(transcript);
        setMicMsg('');
      } else {
        setMicMsg('काही ऐकू आलं नाही — पुन्हा प्रयत्न करा.');
      }
    } catch (e: unknown) {
      const code = (e as { code?: string } | null)?.code;
      setMicMsg(
        code === 'unsupported'
          ? 'या डिव्हाइसवर voice input नाही.'
          : code === 'timeout'
            ? 'वेळ संपली — पुन्हा प्रयत्न करा.'
            : 'काही ऐकू आलं नाही — पुन्हा प्रयत्न करा.',
      );
    } finally {
      setListening(false);
    }
  }

  function clear(): void {
    stopSpeak();
    setMsgs(SEED);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <MessageCircle size={22} color={pal.text} />
        <Text style={[styles.title, { color: pal.text }]} numberOfLines={1}>
          गप्पा <Text style={[styles.small, { color: pal.muted }]}>Chat Tutor</Text>
        </Text>
        <View style={[styles.chip, styles.noShrink, { backgroundColor: pal.chipBg }]} testID="chat-net">
          <Text style={[styles.chipText, { color: pal.text }]}>
            {online ? `online · ${cs.apiStyle || 'chat'}` : 'offline tutor'}
          </Text>
        </View>
        <View style={styles.noShrink}>
          <XPBadge />
        </View>
      </View>
      <Text style={[styles.small, { color: pal.muted }]}>
        {online
          ? `Online AI (${cs.model}) — corrections + conversation.`
          : 'Offline tutor — greetings, word help, gentle corrections. Add API key in Settings for online AI.'}
      </Text>
      <Gap />
      <FlatList
        style={styles.flex}
        data={[...msgs].reverse()}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        inverted
        testID="chat-log"
        contentContainerStyle={styles.log}
        renderItem={({ item, index }) => {
          const i = msgs.length - 1 - index;
          const mine = item.role === 'user';
          return (
            <Animated.View entering={FadeIn.duration(200)}>
              <Pressable
                testID={`chat-msg-${i}`}
                style={[
                  styles.bubble,
                  mine
                    ? [styles.mine, { backgroundColor: pal.userBg }]
                    : [styles.theirs, { backgroundColor: pal.tutorBg }],
                ]}
                onLongPress={() => {
                  stopSpeak();
                  void speak(item.text, settings.speed);
                }}>
                <Text style={[styles.body, { color: mine ? pal.userText : pal.text }]}>
                  {item.text}
                </Text>
                {!mine && (
                  <View style={styles.hearRow} testID={`chat-speak-${i}`}>
                    <HearBtn text={item.text} />
                  </View>
                )}
              </Pressable>
              {item.corrected !== undefined && item.corrected !== '' && (
                <Card>
                  <Text style={[styles.body, { color: pal.text }]}>✏️ {item.corrected}</Text>
                </Card>
              )}
            </Animated.View>
          );
        }}
      />
      {busy && (
        <Text style={[styles.small, { color: pal.muted }]} testID="chat-typing">
          लिहितोय…
        </Text>
      )}
      {micMsg !== '' && (
        <Text style={[styles.small, { color: pal.muted }]} testID="chat-mic-msg">
          {micMsg}
        </Text>
      )}
      <Gap />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <TextField
              value={draft}
              onChange={setDraft}
              placeholder="मराठीत लिहा… (write in Marathi)"
              onSubmit={() => send(draft)}
            />
          </View>
          <Btn title="🎤" kind="secondary" small onPress={() => void mic()} />
          <View style={styles.noShrink}>
            <Btn title="पाठवा →" kind="primary" disabled={busy || draft.trim() === ''} onPress={() => void send(draft)} />
          </View>
          <Btn title="पुसा" kind="secondary" small onPress={clear} />
        </View>
      </KeyboardAvoidingView>
      <Gap />
      <Text style={[styles.small, { color: pal.muted }]}>
        +{XP_CHAT_MSG} XP per message · history kept for this session only
      </Text>
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
  body: {
    fontFamily: FONT,
    fontSize: 16,
  },
  small: {
    fontFamily: FONT,
    fontSize: 13,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: FONT,
    fontSize: 13,
  },
  log: {
    gap: 8,
  },
  bubble: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '88%',
  },
  mine: {
    alignSelf: 'flex-end',
  },
  theirs: {
    alignSelf: 'flex-start',
  },
  hearRow: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  form: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    flexBasis: 120,
    minWidth: 120,
  },
  noShrink: {
    flexShrink: 0,
  },
});
