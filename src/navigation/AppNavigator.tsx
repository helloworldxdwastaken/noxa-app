import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { BlurView } from '@react-native-community/blur';

import { useAuth } from '../context/AuthContext';
import MiniPlayer from '../components/MiniPlayer';
import { useCurrentTrack } from '../hooks/useCurrentTrack';
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
import { useLanguage } from '../context/LanguageContext';
import type {
  AppStackParamList,
  AppTabsParamList,
  AuthStackParamList,
  LibraryStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tabs = createBottomTabNavigator<AppTabsParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();

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
    <Tabs.Screen
      name="Library"
      component={LibraryStackNavigator}
      options={{ unmountOnBlur: true }}
    />
    <Tabs.Screen name="Search" component={SearchScreen} />
    <Tabs.Screen name="Settings" component={SettingsScreen} />
  </Tabs.Navigator>
);

const LibraryStackNavigator = () => (
  <LibraryStack.Navigator screenOptions={{ headerShown: false }}>
    <LibraryStack.Screen name="LibraryMain" component={LibraryScreen} />
    <LibraryStack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
  </LibraryStack.Navigator>
);

const MINI_PLAYER_BASE_HEIGHT = 94;
const MINI_PLAYER_EXTRA_PADDING = 15;
const MINI_PLAYER_TOTAL_SPACER = MINI_PLAYER_BASE_HEIGHT + MINI_PLAYER_EXTRA_PADDING;

const AppStackNavigator = () => {
  const { track } = useCurrentTrack();
  const spacerHeight = track ? MINI_PLAYER_TOTAL_SPACER : 0;

  return (
    <View style={tabStyles.appContainer}>
      <View style={tabStyles.stackArea}>
        <AppStack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <AppStack.Screen name="Tabs" component={AppTabsNavigator} />
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
      </View>
      <View pointerEvents="none" style={[tabStyles.miniPlayerSpacer, { height: spacerHeight }]} />
      <MiniPlayer />
    </View>
  );
};

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
  appContainer: {
    flex: 1,
  },
  stackArea: {
    flex: 1,
  },
  customContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBackground: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(13,13,20,0.45)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 4,
    gap: 6,
    minHeight: 64,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
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
    borderRadius: 999,
    backgroundColor: 'rgba(13,13,20,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  miniPlayerSpacer: {
    width: '100%',
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
  const { t } = useLanguage();
  const searchRoute = state.routes.find(route => route.name === 'Search');
  const mainRoutes = state.routes.filter(route => route.name !== 'Search');
  const labelMap: Record<string, string> = {
    Home: t('tabs.Home'),
    Library: t('tabs.Library'),
    Search: t('tabs.Search'),
    Settings: t('tabs.Settings'),
  };

  const handlePress = (routeName: string, key: string, isFocused: boolean) => {
    const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const searchRouteIndex = searchRoute ? state.routes.findIndex(r => r.key === searchRoute.key) : -1;
  const isSearchFocused = searchRouteIndex === state.index;

  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <View style={[tabStyles.customContainer, { paddingBottom: bottomPadding }]}>
      <View style={tabStyles.tabBackground}>
        <BlurView
          pointerEvents="none"
          style={tabStyles.blurLayer}
          blurType="dark"
          blurAmount={20}
          reducedTransparencyFallbackColor="rgba(5,5,10,0.92)"
        />
        {mainRoutes.map(route => {
          const routeIndex = state.routes.findIndex(r => r.key === route.key);
          const isFocused = state.index === routeIndex;
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => handlePress(route.name, route.key, isFocused)}
              style={tabStyles.tabButton}
            >
              <TabBarIcon
                label={labelMap[route.name] ?? route.name}
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
          <BlurView
            pointerEvents="none"
            style={tabStyles.blurLayer}
            blurType="dark"
            blurAmount={20}
            reducedTransparencyFallbackColor="rgba(5,5,10,0.92)"
          />
          <Icon name="search" size={24} color="#1db954" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
