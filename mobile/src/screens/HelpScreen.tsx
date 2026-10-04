import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { useStore } from '../store';
import { FONT } from '../theme';
import type { Theme } from '../theme';
import { Card, Gap, Screen } from '../ui';

// Verbatim copy from web/src/components/HelpView.jsx TOPICS (HTML bodies).
const TOPICS: Array<{ id: string; mr: string; en: string; body: string }> = [
  {
    id: 'h-chat',
    mr: 'गप्पा',
    en: 'Chat Tutor',
    body: '<li>मराठीत किंवा इंग्रजीत संदेश लिहा, <b>पाठवा</b> दाबा. शिक्षक मराठीत उत्तर देईल आणि चुका सुधारेल.</li><li><b>Offline</b> (default): नियम-आधारित सराव — शब्द, वाक्यं, सुधारणा. <b>Online</b>: Settings मध्ये API Base + Key टाका; हवा तो Model वापरा.</li><li>प्रत्येक उत्तरावरचं <b>🔊</b> ते उत्तर मोठ्याने वाचतं. <b>🎤</b> ने बोला. <b>पुसा</b> गप्पा पुसतो.</li>',
  },
  {
    id: 'h-sprint',
    mr: 'वाचन स्प्रिंट',
    en: 'Reading Sprint',
    body: '<li>वेळ (30/60/120 सेकंद) + स्तर निवडा → <b>सुरू करा</b> → उतारा मोठ्याने वाचा → <b>झालं</b> दाबा.</li><li>निकालात Words, Time, <b>WPM</b> (words per minute) आणि लक्ष्य-तुलना दिसते. L1 लक्ष्य 40–60 WPM पासून सुरुवात, L4 पर्यंत 120–140.</li><li>नंतर आकलन-प्रश्न सोडवा. रोज 1–2 sprint = वेग + आत्मविश्वास.</li>',
  },
  {
    id: 'h-stories',
    mr: 'गोष्टी',
    en: 'Stories',
    body: '<li>स्तर filter (सर्व / L1–L4) → गोष्ट उघडा. वर animated scene दिसते.</li><li><b>▶ ऐका + वाचा</b> = read-along: गोष्ट मोठ्याने वाचली जाते, वाक्य हायलाइट होतं. शब्दांवर <b>टॅप</b> केल्यास अर्थ दिसतो.</li><li><b>गती</b> (0.6x–1.3x) बदला; <b>transliteration</b> चालू केल्यास roman लिपी दिसते.</li><li>Quiz पूर्ण केल्यास 🎉 celebration आणि +15 XP.</li>',
  },
  {
    id: 'h-drills',
    mr: 'सराव',
    en: 'Drills',
    body: '<li>Adaptive सराव: सलग 4 बरोबर → पातळी आपोआप वर जाते. तीन प्रकार फिरून येतात.</li><li><b>pack</b>: वाक्य-सराव — MCQ, fill-blank, EN↔MR भाषांतर, reorder, match. Reorder मध्ये शब्दांना क्रमाने टॅप करा (<b>पुसा</b> = clear).</li><li><b>speaking</b>: वाक्य ऐका, मग <b>🎤 बोला</b> (mic 10 सेकंदात उत्तर न दिल्यास पुढे जाता येतं). Mic नसल्यास <b>मी मोठ्याने म्हणालो</b> दाबा.</li><li><b>vocab</b>: शब्द-सराव — ऐका-ओळखा, बोला, लिहा. 💡 hint नेहमी वाचा.</li>',
  },
  {
    id: 'h-grammar',
    mr: 'व्याकरण',
    en: 'Grammar',
    body: '<li>Topic निवडा (लिंग, वचन, विभक्ती-योग्य अव्यय, वर्तमान/भूत/भविष्य काळ, विशेषण) → नियम + तक्ता + उदाहरणं वाचा → Quiz सोडवा.</li><li>प्रत्येक उत्तराचं <b>स्पष्टीकरण</b> वाचा — pattern तिथेच लक्षात राहतो.</li><li>गप्पांमध्ये Topic चा वापर करून सराव करा (उदा. शिक्षकाला विचारा: लिंग म्हणजे काय?).</li>',
  },
  {
    id: 'h-vocab',
    mr: 'शब्दसंग्रह',
    en: 'Vocab Quiz',
    body: '<li><b>EN → MR</b> किंवा <b>MR → EN</b> दिशा निवडा, पर्यायांमधून उत्तर द्या, <b>पुढचं</b> दाबा.</li><li>चुकलेले शब्द SRS मुळे पुन्हा-पुन्हा येतात (box 0–5: वरचा box = जास्त आठवण).</li><li>नामांजवळची लिंग-चिप लक्षात ठेवा: <b>पु.</b> = masculine, <b>स्त्री.</b> = feminine, <b>न.</b> = neuter.</li>',
  },
  {
    id: 'h-progress',
    mr: 'प्रगती',
    en: 'Progress',
    body: '<li>एकूण <b>XP</b>, रोजची <b>streak 🔥</b>, <b>अचूकता %</b> आणि प्रत्येक mode चा XP bar.</li><li>बरोबर उत्तर +10 XP, प्रयत्न +2 XP, story पूर्ण +5 bonus. रोज थोडा सराव = streak टिकते.</li><li><b>Reset progress</b> फक्त आकडे पुसतो; Settings/chat वेगळे राहतात.</li>',
  },
  {
    id: 'h-settings',
    mr: 'सेटिंग्ज',
    en: 'Settings',
    body: '<li><b>Model</b>: हवा तो model (default muse-spark-1.3-contributor). <b>API Base + Key</b>: रिकामं = offline tutor; भरल्यास online AI.</li><li><b>API Style</b>: chat/completions (सार्वत्रिक) किंवा responses (नवीन OpenAI style).</li><li><b>स्तर, Speed, Theme, transliteration</b> तुमच्या सोयीनुसार. <b>जतन करा</b> दाबायला विसरू नका. <b>🔊 चाचणी</b> आवाज तपासते.</li><li><b>सर्व डेटा पुसा</b> device वरील सगळं (settings, progress, chat) पुसून fresh सुरुवात देतो.</li>',
  },
  {
    id: 'h-tips',
    mr: 'टिप्स',
    en: 'Daily routine',
    body: '<li>शिफारस केलेली 15 मिनिटं: 1 sprint + 1 story + 10 drills + 5 vocab.</li><li>Voice features साठी mic परवानगी द्या (पहिल्यांदा विचारलं जाईल).</li><li>प्रत्येक पानावरचा <b>🔊 ऐका</b> मजकूर मोठ्याने वाचतो; वाचनाचा वेग Settings मध्ये बदला.</li><li>कठीण वाटल्यास स्तर खाली घ्या — सातत्य > अवघडपणा. Streak तुटू देऊ नका!</li>',
  },
];

function itemsOf(body: string): string[] {
  return body
    .split('</li>')
    .map((s) => s.replace('<li>', '').trim())
    .filter((s) => s.length > 0);
}

// Renders the <b>…</b> spans of one <li> line as bold nested Text.
function RichLine({ line, uid }: { line: string; uid: string }): React.JSX.Element {
  const { t } = useStore();
  const styles = makeStyles(t);
  const parts = line.split(/<\/?b>/);
  return (
    <Text style={styles.bullet}>
      {'• '}
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <Text key={`${uid}-${i}`} style={styles.bold}>
            {p}
          </Text>
        ) : (
          <Text key={`${uid}-${i}`} style={styles.plain}>
            {p}
          </Text>
        ),
      )}
    </Text>
  );
}

export default function HelpScreen(_props: any): React.JSX.Element {
  const [open, setOpen] = useState<string>('h-chat');
  const { t } = useStore();
  const styles = makeStyles(t);

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Card>
          <Text style={styles.h2}>मदत — How to use every part</Text>
          <Text style={styles.muted}>प्रत्येक भागासाठी सूचना — उघडण्यासाठी टॅप करा.</Text>
        </Card>
        <Gap />
        {TOPICS.map((t) => {
          const expanded = open === t.id;
          return (
            <Animated.View key={t.id} layout={Layout.springify()} style={styles.topic}>
              <Pressable
                onPress={() => setOpen(expanded ? '' : t.id)}
                accessibilityLabel={`${t.mr} ${t.en}`}
              >
                <Card>
                  <View style={styles.head}>
                    <Text style={styles.mr}>
                      {t.mr} <Text style={styles.en}>{t.en}</Text>
                    </Text>
                    <Text style={styles.chev}>{expanded ? '−' : '+'}</Text>
                  </View>
                  {expanded ? (
                    <Animated.View entering={FadeIn} exiting={FadeOut}>
                      <Gap />
                      {itemsOf(t.body).map((line, i) => (
                        <RichLine key={`${t.id}-${i}`} line={line} uid={`${t.id}-${i}`} />
                      ))}
                    </Animated.View>
                  ) : null}
                </Card>
              </Pressable>
            </Animated.View>
          );
        })}
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
  muted: {
    fontFamily: FONT,
    fontSize: 13,
    color: t.muted,
  },
  topic: {
    marginBottom: 12,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mr: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
    color: t.ink,
  },
  en: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: '400',
    color: t.muted,
  },
  chev: {
    fontFamily: FONT,
    fontSize: 22,
    fontWeight: '700',
    color: t.blue,
  },
  bullet: {
    fontFamily: FONT,
    fontSize: 14,
    marginBottom: 6,
    color: t.ink,
  },
  bold: {
    fontFamily: FONT,
    fontWeight: '700',
    color: t.ink,
  },
  plain: {
    fontFamily: FONT,
    color: t.ink,
  },
  });
}
