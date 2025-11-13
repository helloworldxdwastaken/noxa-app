export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type AppTabsParamList = {
  Home: undefined;
  Library: undefined;
  Search: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  PlaylistDetail: {
    playlistId: number;
    playlistName?: string | null;
    description?: string | null;
    coverUrl?: string | null;
    trackCount?: number | null;
  };
  NowPlaying: undefined;
  DownloadRequest: undefined;
};
