import { StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useStore } from './store';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import SprintsScreen from './screens/SprintsScreen';
import StoriesScreen from './screens/StoriesScreen';
import DrillsScreen from './screens/DrillsScreen';
import GrammarScreen from './screens/GrammarScreen';
import VocabScreen from './screens/VocabScreen';
import ProgressScreen from './screens/ProgressScreen';
import SettingsScreen from './screens/SettingsScreen';
import HelpScreen from './screens/HelpScreen';

const Stack = createNativeStackNavigator();

export default function RootNav() {
  const { dark, t } = useStore();
  return (
    <>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <NavigationContainer
        theme={{
          ...DefaultTheme,
          dark,
          colors: { ...DefaultTheme.colors, background: t.bg, card: t.surface },
        }}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 250,
            contentStyle: { backgroundColor: t.bg },
          }}>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'मराठी शिका — Home' }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'गप्पा — Chat' }} />
          <Stack.Screen name="Sprint" component={SprintsScreen} options={{ title: 'वाचन स्प्रिंट — Sprint' }} />
          <Stack.Screen name="Stories" component={StoriesScreen} options={{ title: 'गोष्टी — Stories' }} />
          <Stack.Screen name="Drills" component={DrillsScreen} options={{ title: 'सराव — Drills' }} />
          <Stack.Screen name="Grammar" component={GrammarScreen} options={{ title: 'व्याकरण — Grammar' }} />
          <Stack.Screen name="Vocab" component={VocabScreen} options={{ title: 'शब्दसंग्रह — Vocab' }} />
          <Stack.Screen name="Progress" component={ProgressScreen} options={{ title: 'प्रगती — Progress' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'सेटिंग्ज — Settings' }} />
          <Stack.Screen name="Help" component={HelpScreen} options={{ title: 'मदत — Help' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
