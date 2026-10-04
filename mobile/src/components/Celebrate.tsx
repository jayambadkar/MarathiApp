import React from 'react';
import { StyleSheet, Text } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Btn, Card, Gap } from '../ui';
import { FONT } from '../theme';
import { useStore } from '../store';

export function Celebrate({
  title,
  sub,
  actionLabel,
  onAction,
}: {
  title: string;
  sub?: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  const {t} = useStore();
  return (
    <>
      <ConfettiCannon count={150} origin={{ x: -10, y: 0 }} autoStart={true} fadeOut={true} />
      <Card>
        <Text style={[styles.title, {color: t.ink}]}>{title}</Text>
        {sub ? (
          <>
            <Gap />
            <Text style={[styles.sub, {color: t.ink}]}>{sub}</Text>
          </>
        ) : null}
        {actionLabel && onAction ? (
          <>
            <Gap />
            <Btn title={actionLabel} onPress={onAction} />
          </>
        ) : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: FONT,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    fontFamily: FONT,
    fontSize: 15,
    textAlign: 'center',
  },
});
