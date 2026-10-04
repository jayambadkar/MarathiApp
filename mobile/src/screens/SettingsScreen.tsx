import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import { speak } from '../tts';
import { FONT } from '../theme';
import type { Theme } from '../theme';
import { Btn, Card, Gap, Screen, Seg, SwitchRow, TextField } from '../ui';

// Mirror of web/src/components/SettingsView.jsx copy + save semantics.
const DEFAULT_MODEL = 'muse-spark-1.3-contributor';

export default function SettingsScreen(_props: any): React.JSX.Element {
  const { settings, updateSettings, resetAll, t } = useStore();
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
    void speak('नमस्कार! मी मराठी शिकवते.', parseFloat(speed) || 1);
  }

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
          <Gap />
          <Btn title="सर्व डेटा पुसा" kind="secondary" onPress={resetAll} />
        </View>
        {msg ? (
          <>
            <Gap />
            <Text style={styles.msg}>{msg}</Text>
          </>
        ) : null}
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
  });
}
