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
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Sprint" component={SprintsScreen} />
          <Stack.Screen name="Stories" component={StoriesScreen} />
          <Stack.Screen name="Drills" component={DrillsScreen} />
          <Stack.Screen name="Grammar" component={GrammarScreen} />
          <Stack.Screen name="Vocab" component={VocabScreen} />
          <Stack.Screen name="Progress" component={ProgressScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
