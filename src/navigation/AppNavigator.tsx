import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import MiniPlayer from '../components/MiniPlayer';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import SplashScreen from '../screens/common/SplashScreen';
import DownloadRequestScreen from '../screens/main/DownloadRequestScreen';
import DownloadsScreen from '../screens/main/DownloadsScreen';
import HomeScreen from '../screens/main/HomeScreen';
import LibraryScreen from '../screens/main/LibraryScreen';
import NowPlayingScreen from '../screens/main/NowPlayingScreen';
import PlaylistDetailScreen from '../screens/main/PlaylistDetailScreen';
import SearchScreen from '../screens/main/SearchScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import type { AppStackParamList, AppTabsParamList, AuthStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tabs = createBottomTabNavigator<AppTabsParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0b0b0f',
    card: '#161621',
    primary: '#4b67ff',
    text: '#ffffff',
    border: '#1f1f2b',
    notification: '#4b67ff',
  },
};

const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'fade',
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Signup" component={SignupScreen} />
  </AuthStack.Navigator>
);

const AppTabsNavigator = () => (
  <Tabs.Navigator
    screenOptions={{
      headerTitleAlign: 'center',
      tabBarStyle: {
        backgroundColor: '#161621',
        borderTopWidth: 0,
        height: 64,
        paddingBottom: 12,
        paddingTop: 12,
      },
      tabBarActiveTintColor: '#ffffff',
      tabBarInactiveTintColor: '#9090a5',
      tabBarLabelStyle: tabLabelStyles.label,
    }}
  >
    <Tabs.Screen
      name="Home"
      component={HomeScreen}
      options={{
        title: 'Home',
      }}
    />
    <Tabs.Screen
      name="Library"
      component={LibraryScreen}
      options={{
        title: 'Library',
      }}
    />
    <Tabs.Screen
      name="Search"
      component={SearchScreen}
      options={{
        title: 'Search',
      }}
    />
    <Tabs.Screen
      name="Downloads"
      component={DownloadsScreen}
      options={{
        title: 'Downloads',
      }}
    />
    <Tabs.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        title: 'Settings',
      }}
    />
  </Tabs.Navigator>
);

const AppStackNavigator = () => (
  <>
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <AppStack.Screen name="Tabs" component={AppTabsNavigator} />
      <AppStack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
      <AppStack.Screen name="DownloadRequest" component={DownloadRequestScreen} />
      <AppStack.Screen
        name="NowPlaying"
        component={NowPlayingScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </AppStack.Navigator>
    <MiniPlayer />
  </>
);

const AppNavigator = () => {
  const {
    state: { isBootstrapped, user },
  } = useAuth();

  if (!isBootstrapped) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {user ? <AppStackNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;

const tabLabelStyles = StyleSheet.create({
  label: {
    fontSize: 12,
  },
});

