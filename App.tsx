import React from 'react';
import { StatusBar } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { enableScreens } from 'react-native-screens';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { OfflineProvider } from './src/context/OfflineContext';
import { LanguageProvider } from './src/context/LanguageContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

enableScreens();
(FeatherIcon as unknown as { loadFont?: () => void }).loadFont?.();

const App = () => (
  <SafeAreaProvider>
    <StatusBar barStyle="light-content" backgroundColor="#0b0b0f" />
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflineProvider>
          <LanguageProvider>
            <AppNavigator />
          </LanguageProvider>
        </OfflineProvider>
      </AuthProvider>
    </QueryClientProvider>
  </SafeAreaProvider>
);

export default App;
