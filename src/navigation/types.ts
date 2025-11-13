import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type PlaylistDetailParams = {
    playlistId: number;
    playlistName?: string | null;
    description?: string | null;
    coverUrl?: string | null;
    trackCount?: number | null;
  };

export type LibraryStackParamList = {
  LibraryMain: undefined;
  PlaylistDetail: PlaylistDetailParams;
};

export type AppTabsParamList = {
  Home: undefined;
  Library: NavigatorScreenParams<LibraryStackParamList> | undefined;
  Search: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  Tabs:
    | {
        screen?: keyof AppTabsParamList;
      }
    | undefined;
  NowPlaying: undefined;
  DownloadRequest: undefined;
};
