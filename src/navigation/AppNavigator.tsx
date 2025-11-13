import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import { useAuth } from '../context/AuthContext';
import MiniPlayer from '../components/MiniPlayer';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import SplashScreen from '../screens/common/SplashScreen';
import DownloadRequestScreen from '../screens/main/DownloadRequestScreen';
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
  <Tabs.Navigator screenOptions={{ headerShown: false }} tabBar={customTabBarRenderer}>
    <Tabs.Screen name="Home" component={HomeScreen} />
    <Tabs.Screen name="Library" component={LibraryScreen} />
    <Tabs.Screen name="Search" component={SearchScreen} />
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
    <View style={tabStyles.miniPlayerSpacer} pointerEvents="box-none" />
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
  customContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabBackground: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0d0d14',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 4,
    gap: 6,
    minHeight: 64,
    alignItems: 'center',
  },
  iconBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  iconBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButton: {
    flex: 1,
  },
  iconLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c8297',
  },
  iconLabelActive: {
    color: '#ffffff',
  },
  searchBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  miniPlayerSpacer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});

type TabBarIconProps = {
  label: string;
  iconName: string;
  focused: boolean;
};

const TabBarIcon = ({ label, iconName, focused }: TabBarIconProps) => (
  <View style={[tabStyles.iconBadge, focused && tabStyles.iconBadgeActive]}>
    <Icon name={iconName} size={18} color={focused ? '#1db954' : '#7c8297'} />
    <Text style={[tabStyles.iconLabel, focused && tabStyles.iconLabelActive]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const customTabBarRenderer = (props: BottomTabBarProps) => <CustomTabBar {...props} />;

const CustomTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const searchRoute = state.routes.find(route => route.name === 'Search');
  const mainRoutes = state.routes.filter(route => route.name !== 'Search');

  const handlePress = (routeName: string, key: string, isFocused: boolean) => {
    const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const searchRouteIndex = searchRoute ? state.routes.findIndex(r => r.key === searchRoute.key) : -1;
  const isSearchFocused = searchRouteIndex === state.index;

  return (
    <View style={[tabStyles.customContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}> 
      <View style={tabStyles.tabBackground}>
        {mainRoutes.map(route => {
          const routeIndex = state.routes.findIndex(r => r.key === route.key);
          const isFocused = state.index === routeIndex;
          return (
            <TouchableOpacity
              key={route.key}
             accessibilityRole="button"
             accessibilityState={isFocused ? { selected: true } : {}}
             onPress={() => handlePress(route.name, route.key, isFocused)}
              style={[tabStyles.tabButton]}
            >
              <TabBarIcon
                label={route.name}
                iconName={TAB_ICON_MAP[route.name as keyof AppTabsParamList] ?? 'circle'}
                focused={isFocused}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      {searchRoute ? (
        <TouchableOpacity
          style={tabStyles.searchBubble}
          onPress={() => handlePress(searchRoute.name, searchRoute.key, isSearchFocused)}
        >
          <Icon name="search" size={24} color="#1db954" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
