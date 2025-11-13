import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';

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
    background: '#000000',
    card: '#121212',
    primary: '#1db954',
    text: '#ffffff',
    border: '#282828',
    notification: '#1db954',
  },
};

const TAB_ICON_MAP: Record<keyof AppTabsParamList, string> = {
  Home: 'home',
  Library: 'layers',
  Search: 'search',
  Downloads: 'download',
  Settings: 'settings',
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
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: tabStyles.tabBar,
      tabBarItemStyle: tabStyles.tabItem,
      tabBarBackground: () => <View style={tabStyles.tabBackground} />,
      tabBarIcon: ({ focused }) => (
        <TabBarIcon
          label={route.name}
          iconName={TAB_ICON_MAP[route.name as keyof AppTabsParamList] ?? 'circle'}
          focused={focused}
        />
      ),
    })}
  >
    <Tabs.Screen name="Home" component={HomeScreen} />
    <Tabs.Screen name="Library" component={LibraryScreen} />
    <Tabs.Screen name="Search" component={SearchScreen} />
    <Tabs.Screen name="Downloads" component={DownloadsScreen} />
    <Tabs.Screen name="Settings" component={SettingsScreen} />
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

const tabStyles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    height: 84,
    paddingVertical: 10,
  },
  tabBackground: {
    flex: 1,
    backgroundColor: '#0d0d14',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabItem: {
    borderRadius: 999,
    paddingVertical: 10,
  },
  iconBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  iconBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c8297',
  },
  iconLabelActive: {
    color: '#ffffff',
  },
});

type TabBarIconProps = {
  label: string;
  iconName: string;
  focused: boolean;
};

const TabBarIcon = ({ label, iconName, focused }: TabBarIconProps) => (
  <View style={[tabStyles.iconBadge, focused && tabStyles.iconBadgeActive]}>
    <Icon name={iconName} size={18} color={focused ? '#ffffff' : '#7c8297'} />
    <Text style={[tabStyles.iconLabel, focused && tabStyles.iconLabelActive]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);
