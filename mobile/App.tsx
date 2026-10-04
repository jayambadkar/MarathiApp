import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStore } from './src/store';
import RootNav from './src/navigation';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppStore>
          <RootNav />
        </AppStore>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
