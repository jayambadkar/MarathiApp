import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import { listMarathiVoices, speak } from '../tts';
import type { MarathiVoice } from '../tts';
import { FONT } from '../theme';
import type { Theme } from '../theme';
import { Btn, Card, Gap, Screen, Seg, SwitchRow, TextField } from '../ui';

// Mirror of web/src/components/SettingsView.jsx copy + save semantics.
const DEFAULT_MODEL = 'muse-spark-1.3-contributor';

const DAILY_GOALS = [
  { label: '10 XP', value: '10' },
  { label: '25 XP', value: '25' },
  { label: '50 XP', value: '50' },
  { label: '100 XP', value: '100' },
];

export default function SettingsScreen(_props: any): React.JSX.Element {
  const { settings, updateSettings, resetAll, resetProgress, t } = useStore();
  const styles = makeStyles(t);
  const [model, setModel] = useState<string>(settings.model ?? '');
  const [apiBase, setApiBase] = useState<string>(settings.apiBase ?? '');
  const [apiStyle, setApiStyle] = useState<string>(settings.apiStyle ?? 'chat');
  const [apiKey, setApiKey] = useState<string>(settings.apiKey ?? '');
  const [level, setLevel] = useState<string>(String(settings.level ?? 1));
  const [speed, setSpeed] = useState<string>(String(settings.speed ?? 1));
  const [theme, setTheme] = useState<'light' | 'dark'>(settings.theme);
  const [translit, setTranslit] = useState<boolean>(Boolean(settings.translit));
  const [msg, setMsg] = useState<string>('');
  const [voices, setVoices] = useState<MarathiVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState<boolean>(true);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  useEffect(() => {
    let live = true;
    setVoicesLoading(true);
    void listMarathiVoices().then(found => {
      if (!live) return;
      setVoices(found);
      setVoicesLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  function save(): void {
    updateSettings({
      model: (model || '').trim() || DEFAULT_MODEL,
      apiBase: (apiBase || '').trim(),
      apiStyle,
      apiKey: (apiKey || '').trim(),
      level: parseInt(level, 10) || 1,
      speed: parseFloat(speed) || 1,
      theme,
      translit,
    });
    setMsg('जतन झालं ✓');
  }

  function testVoice(): void {
    void speak('नमस्कार! मी मराठी शिकवते.', parseFloat(speed) || 1, settings.voice);
  }

  function onResetProgress(): void {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    resetProgress();
    setMsg('प्रगती पुसली ✓');
  }

  function onClearAll(): void {
    setConfirmReset(false);
    resetAll();
    setMsg('सर्व डेटा पुसला ✓');
  }

  const selectedVoice = settings.voice ?? '';

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Card>
          <Text style={styles.h2}>सेटिंग्ज — Settings</Text>
          <Gap />
          <Text style={styles.label}>Model</Text>
          <TextField value={model} onChange={(v: string) => { setModel(v); setMsg(''); }} />
          <Gap />
          <Text style={styles.label}>API Base (OpenAI-compatible)</Text>
          <TextField
            value={apiBase}
            onChange={(v: string) => { setApiBase(v); setMsg(''); }}
            placeholder="https://api.example.com/v1"
          />
          <Gap />
          <Text style={styles.label}>API Style</Text>
          <Seg options={['chat', 'responses']} value={apiStyle} onChange={(v: string) => { setApiStyle(v); setMsg(''); }} />
          <Gap />
          <Text style={styles.label}>API Key</Text>
          <TextField
            value={apiKey}
            onChange={(v: string) => { setApiKey(v); setMsg(''); }}
            placeholder="(रिकामं = offline)"
            secure
          />
          <Gap />
          <Text style={styles.label}>स्तर Level</Text>
          <Seg options={['1', '2', '3', '4']} value={level} onChange={(v: string) => { setLevel(v); setMsg(''); }} />
          <Gap />
          <Text style={styles.label}>Speed</Text>
          <Seg options={['0.6', '1', '1.3']} value={speed} onChange={(v: string) => { setSpeed(v); setMsg(''); }} />
          <Gap />
          <Text style={styles.label}>Theme</Text>
          <Seg options={['light', 'dark']} value={theme} onChange={(v: string) => { setTheme(v === 'dark' ? 'dark' : 'light'); setMsg(''); }} />
          <Gap />
          <SwitchRow
            label="transliteration दाखवा"
            value={translit}
            onChange={(v: boolean) => { setTranslit(v); setMsg(''); }}
          />
        </Card>
        <Gap />
        <View style={styles.btnRow}>
          <Btn title="जतन करा (Save)" onPress={save} />
          <Gap />
          <Btn title="🔊 चाचणी" kind="secondary" onPress={testVoice} />
        </View>
        {msg ? (
          <>
            <Gap />
            <Text style={styles.msg}>{msg}</Text>
          </>
        ) : null}
        <Gap />
        <Card>
          <Text style={styles.h3}>Appearance</Text>
          <Gap h={8} />
          <View testID="settings-appearance">
            <Seg
              options={['light', 'dark']}
              value={settings.theme}
              onChange={(v: string) => {
                const next = v === 'dark' ? 'dark' : 'light';
                setTheme(next);
                setMsg('');
                updateSettings({ theme: next });
              }}
            />
          </View>
        </Card>
        <Gap />
        <Card>
          <Text style={styles.h3}>Voice — आवाज</Text>
          <Gap h={8} />
          <View testID="settings-voice-list">
            {voicesLoading ? (
              <Text style={styles.muted} testID="settings-voice-loading">
                आवाज शोधत आहे…
              </Text>
            ) : (
              <>
                <VoiceRow
                  testID="settings-voice-default"
                  name="System default"
                  lang="प्रणाली आवाज"
                  selected={selectedVoice === ''}
                  onPress={() => updateSettings({ voice: undefined })}
                  styles={styles}
                />
                {voices.length === 0 ? (
                  <Text style={styles.muted} testID="settings-voice-empty">
                    मराठी आवाज सापडला नाही — प्रणाली आवाज वापरला जाईल.
                  </Text>
                ) : (
                  voices.map(v => (
                    <VoiceRow
                      key={v.id}
                      testID={`settings-voice-${v.id}`}
                      name={v.name}
                      lang={v.lang}
                      selected={selectedVoice === v.id}
                      onPress={() => updateSettings({ voice: v.id })}
                      styles={styles}
                    />
                  ))
                )}
              </>
            )}
          </View>
          <Gap h={8} />
          <Btn title="🔊 आवाज ऐका" kind="secondary" onPress={testVoice} />
        </Card>
        <Gap />
        <Card>
          <Text style={styles.h3}>Daily goal — रोजचं ध्येय</Text>
          <Gap h={8} />
          <View testID="settings-daily-goal">
            <Seg
              options={DAILY_GOALS}
              value={String(settings.dailyGoalXp ?? 25)}
              onChange={(v: string) => updateSettings({ dailyGoalXp: parseInt(v, 10) || 25 })}
            />
          </View>
        </Card>
        <Gap />
        <Card>
          <Text style={styles.h3}>Data — डेटा</Text>
          <Gap h={8} />
          <View testID="settings-reset-progress">
            <Btn
              title={confirmReset ? 'खात्री आहे? पुन्हा दाबा' : 'प्रगती रीसेट करा'}
              kind="secondary"
              onPress={onResetProgress}
            />
          </View>
          <Gap h={8} />
          <View testID="settings-clear-data">
            <Btn title="सर्व डेटा पुसा" kind="danger" onPress={onClearAll} />
          </View>
        </Card>
        <Gap />
        <Card>
          <View testID="settings-about">
            <Text style={styles.h3}>About — माहिती</Text>
            <Gap h={8} />
            <Text style={styles.about}>मराठी शिका — Marathi Learning App</Text>
            <Text style={styles.muted}>आवृत्ती Version 1.0</Text>
            <Text style={styles.muted}>
              React Native · {Platform.OS} {String(Platform.Version)}
            </Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

function VoiceRow({
  testID,
  name,
  lang,
  selected,
  onPress,
  styles,
}: {
  testID: string;
  name: string;
  lang: string;
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}): React.JSX.Element {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.voiceRow, selected && styles.voiceRowSelected]}>
      <View style={styles.voiceText}>
        <Text style={styles.voiceName}>{name}</Text>
        <Text style={styles.muted}>{lang}</Text>
      </View>
      {selected ? <Text style={styles.check}>✓</Text> : null}
    </Pressable>
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
  h3: {
    fontFamily: FONT,
    fontSize: 17,
    fontWeight: '700',
    color: t.ink,
  },
  label: {
    fontFamily: FONT,
    fontSize: 14,
    marginBottom: 4,
    color: t.ink,
  },
  btnRow: {
    flexDirection: 'column',
  },
  msg: {
    fontFamily: FONT,
    fontSize: 14,
    color: t.muted,
  },
  muted: {
    fontFamily: FONT,
    fontSize: 14,
    color: t.muted,
  },
  about: {
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: '600',
    color: t.ink,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: t.surface,
  },
  voiceRowSelected: {
    borderColor: t.blueBorder,
    backgroundColor: t.blueBg,
  },
  voiceText: {
    flex: 1,
    gap: 2,
  },
  voiceName: {
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: '600',
    color: t.ink,
  },
  check: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '700',
    color: t.blueInk,
  },
  });
}
