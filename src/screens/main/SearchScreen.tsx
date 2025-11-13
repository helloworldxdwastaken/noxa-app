import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  fetchPlaylists,
  requestDownloadAdd,
  searchLibrary,
  searchOnlineTracks,
  addTrackToPlaylist,
} from '../../api/service';
import type { AppStackParamList, AppTabsParamList } from '../../navigation/types';
import type { RemoteTrack, Song } from '../../types/models';
import { playSong } from '../../services/player/PlayerService';
import ArtworkImage from '../../components/ArtworkImage';
import Icon from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SearchMode = 'local' | 'online';
type OnlineSearchType = 'track' | 'artist' | 'album';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabsParamList, 'Search'>,
  NativeStackScreenProps<AppStackParamList>
>;

const SearchScreen: React.FC<Props> = () => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('local');
  const [onlineType, setOnlineType] = useState<OnlineSearchType>('track');
  const [downloadOptionsTrack, setDownloadOptionsTrack] = useState<RemoteTrack | null>(null);
  const [playlistPickerTrack, setPlaylistPickerTrack] = useState<RemoteTrack | null>(null);
  const { data: playlists = [] } = useQuery({ queryKey: ['playlists'], queryFn: fetchPlaylists });

  const { data: localResults, isFetching: localFetching } = useQuery({
    queryKey: ['library', 'search', query],
    queryFn: () => searchLibrary(query.trim()),
    enabled: mode === 'local' && query.trim().length > 1,
  });

  const { data: onlineResults, isFetching: onlineFetching } = useQuery({
    queryKey: ['music', 'search', query, onlineType],
    queryFn: () => searchOnlineTracks(query.trim(), onlineType),
    enabled: mode === 'online' && query.trim().length > 1,
  });

  const localSongs = useMemo(() => (Array.isArray(localResults) ? localResults : []), [localResults]);
  const results = mode === 'local' ? localSongs : onlineResults;
  const isFetching = mode === 'local' ? localFetching : onlineFetching;

  const downloadMutation = useMutation<void, Error, RemoteTrack>({
    mutationFn: (track: RemoteTrack) =>
      requestDownloadAdd(track.title, track.artistName, track.albumTitle ?? undefined),
    onSuccess: () => {
      Alert.alert('Download queued', 'Track added to the download queue.');
    },
    onError: error => {
      const message = error instanceof Error ? error.message : 'Failed to queue download.';
      Alert.alert('Download failed', message);
    },
  });

  const handlePlayLocalSong = useCallback(
    (song: Song) => {
      const queue = localSongs.filter(entry => entry.id !== song.id);
      playSong(song, queue).catch(error => console.error('Failed to play song', error));
    },
    [localSongs],
  );

  const renderLocalItem = useCallback(
    ({ item }: { item: Song }) => (
      <TouchableOpacity style={styles.resultRow} onPress={() => handlePlayLocalSong(item)}>
        <ArtworkImage uri={item.albumCover} size={56} fallbackLabel={item.title?.[0]?.toUpperCase()} />
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [handlePlayLocalSong],
  );

  const renderOnlineItem = useCallback(
    ({ item }: { item: RemoteTrack }) => (
      <View style={styles.resultRow}>
        <ArtworkImage uri={item.image} size={56} fallbackLabel={item.title?.[0]?.toUpperCase()} />
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {item.artistName}
          </Text>
          {item.albumTitle && <Text style={styles.resultAlbum}>{item.albumTitle}</Text>}
        </View>
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={() => {
            Keyboard.dismiss();
            setDownloadOptionsTrack(item);
          }}
          disabled={downloadMutation.isPending && downloadMutation.variables?.id === item.id}
        >
          {downloadMutation.isPending && downloadMutation.variables?.id === item.id ? (
            <ActivityIndicator color="#050505" size="small" />
          ) : (
            <Icon name="download" size={16} color="#050505" />
          )}
        </TouchableOpacity>
      </View>
    ),
    [downloadMutation],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <TextInput
        style={styles.searchInput}
        placeholder={mode === 'local' ? 'Search your library' : 'Search online catalog'}
        placeholderTextColor="#606072"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      {/* Search Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'local' && styles.modeBtnActive]}
          onPress={() => setMode('local')}
        >
          <Text style={[styles.modeBtnText, mode === 'local' && styles.modeBtnTextActive]}>
            Local
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'online' && styles.modeBtnActive]}
          onPress={() => setMode('online')}
        >
          <Text style={[styles.modeBtnText, mode === 'online' && styles.modeBtnTextActive]}>
            Online
          </Text>
        </TouchableOpacity>
      </View>

      {/* Online Search Type Filters */}
      {mode === 'online' && (
        <View style={styles.typeFilters}>
          <TouchableOpacity
            style={[styles.typeChip, onlineType === 'track' && styles.typeChipActive]}
            onPress={() => setOnlineType('track')}
          >
            <Text style={[styles.typeChipText, onlineType === 'track' && styles.typeChipTextActive]}>
              Songs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeChip, onlineType === 'artist' && styles.typeChipActive]}
            onPress={() => setOnlineType('artist')}
          >
            <Text
              style={[styles.typeChipText, onlineType === 'artist' && styles.typeChipTextActive]}
            >
              Artists
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeChip, onlineType === 'album' && styles.typeChipActive]}
            onPress={() => setOnlineType('album')}
          >
            <Text style={[styles.typeChipText, onlineType === 'album' && styles.typeChipTextActive]}>
              Albums
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isFetching ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      ) : mode === 'local' ? (
        <FlatList<Song>
          data={(results as Song[]) ?? []}
          keyExtractor={item => `${item.id}`}
          renderItem={renderLocalItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            (!results || results.length === 0) && styles.emptyContainer
          }
          ListEmptyComponent={
            query.trim().length <= 1 ? (
              <View style={styles.centered}>
                <View style={styles.emptyIcon}>
                  <Icon name="search" size={24} color="#8aa4ff" />
                </View>
                <Text style={styles.emptyTitle}>Search for music</Text>
                <Text style={styles.emptyText}>
                  {mode === 'local'
                    ? 'Find songs in your library'
                    : 'Discover millions of tracks online'}
                </Text>
              </View>
            ) : (
              <View style={styles.centered}>
                <View style={styles.emptyIcon}>
                  <Icon name="slash" size={24} color="#f87171" />
                </View>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptyText}>Try different keywords or check your spelling</Text>
              </View>
            )
          }
        />
      ) : (
        <FlatList<RemoteTrack>
          data={(results as RemoteTrack[]) ?? []}
          keyExtractor={item => `${item.id}`}
          renderItem={renderOnlineItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            (!results || results.length === 0) && styles.emptyContainer
          }
          ListEmptyComponent={
            query.trim().length <= 1 ? (
              <View style={styles.centered}>
                <View style={styles.emptyIcon}>
                  <Icon name="search" size={24} color="#8aa4ff" />
                </View>
                <Text style={styles.emptyTitle}>Search for music</Text>
                <Text style={styles.emptyText}>Discover millions of tracks online</Text>
              </View>
            ) : (
              <View style={styles.centered}>
                <View style={styles.emptyIcon}>
                  <Icon name="slash" size={24} color="#f87171" />
                </View>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptyText}>Try different keywords or check your spelling</Text>
              </View>
            )
          }
        />
      )}
      {downloadOptionsTrack ? (
        <View style={styles.dialogOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setDownloadOptionsTrack(null)} />
          <View style={styles.dialogContainer}>
            <Text style={styles.sheetTitle}>Choose an action</Text>
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => {
                downloadMutation.mutate(downloadOptionsTrack);
                setDownloadOptionsTrack(null);
              }}
            >
              <Icon name="download" size={18} color="#ffffff" />
              <View style={styles.sheetActionTextGroup}>
                <Text style={styles.sheetActionText}>Download</Text>
                <Text style={styles.sheetActionSubtext}>Save to offline downloads</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => {
                if (playlists.length === 0) {
                  Alert.alert('No playlists found', 'Create a playlist first in your library.');
                  setDownloadOptionsTrack(null);
                  return;
                }
                setDownloadOptionsTrack(null);
                setPlaylistPickerTrack(downloadOptionsTrack);
              }}
            >
              <Icon name="plus-circle" size={18} color="#1db954" />
              <View style={styles.sheetActionTextGroup}>
                <Text style={[styles.sheetActionText, styles.sheetActionAccent]}>
                  Download & add to playlist
                </Text>
                <Text style={styles.sheetActionSubtext}>Choose where to store this track</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setDownloadOptionsTrack(null)}>
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {playlistPickerTrack ? (
        <View style={styles.dialogOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setPlaylistPickerTrack(null)} />
          <View style={[styles.dialogContainer, styles.playlistDialog]}>
            <Text style={styles.sheetTitle}>Select playlist</Text>
            {playlists.length === 0 ? (
              <Text style={styles.sheetEmpty}>Create a playlist first.</Text>
            ) : (
              <ScrollView
                style={styles.playlistScroll}
                contentContainerStyle={styles.playlistList}
                showsVerticalScrollIndicator
              >
                {playlists.map(playlist => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.sheetAction}
                    onPress={() => {
                      downloadMutation.mutate(playlistPickerTrack);
                      addTrackToPlaylist(playlist.id, Number(playlistPickerTrack.id)).catch(error => {
                        console.error('Failed to add track', error);
                        Alert.alert('Unable to add track', 'Please try again later.');
                      });
                      setPlaylistPickerTrack(null);
                    }}
                  >
                    <Icon name="folder-plus" size={18} color="#ffffff" />
                    <Text style={styles.sheetActionText}>{playlist.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setPlaylistPickerTrack(null)}>
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    gap: 12,
  },
  searchInput: {
    backgroundColor: '#121212',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#121212',
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#1db954',
  },
  modeBtnText: {
    color: '#9090a5',
    fontSize: 14,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  typeFilters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#121212',
  },
  typeChipActive: {
    backgroundColor: '#1a1a1a',
  },
  typeChipText: {
    color: '#9090a5',
    fontSize: 13,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#ffffff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1f1f2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  emptyText: {
    fontSize: 14,
    color: '#9090a5',
    textAlign: 'center',
  },
  loadingText: {
    color: '#e6e6f2',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#282828',
  },
  resultInfo: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultSubtitle: {
    color: '#9090a5',
    fontSize: 14,
  },
  resultAlbum: {
    color: '#7a7a8c',
    fontSize: 12,
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1db954',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dialogContainer: {
    width: '88%',
    backgroundColor: '#0d0d14',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  playlistDialog: {
    maxHeight: '70%',
  },
  playlistScroll: {
    maxHeight: 260,
  },
  playlistList: {
    gap: 8,
  },
  sheetTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  sheetActionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  sheetActionTextGroup: {
    flex: 1,
    gap: 2,
  },
  sheetActionSubtext: {
    color: '#8a8aa1',
    fontSize: 12,
  },
  sheetActionAccent: {
    color: '#1db954',
  },
  sheetEmpty: {
    color: '#8a8aa1',
    fontSize: 14,
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#1c1c23',
  },
  dialogCancelBtn: {
    marginTop: 4,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#272738',
  },
  dialogCancelText: {
    color: '#d6d6e4',
    fontWeight: '600',
  },
});

export default SearchScreen;
