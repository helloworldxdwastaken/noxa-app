import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
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

import { requestDownloadAdd, searchLibrary, searchOnlineTracks } from '../../api/service';
import type { AppStackParamList, AppTabsParamList } from '../../navigation/types';
import type { RemoteTrack, Song } from '../../types/models';
import { playSong } from '../../services/player/PlayerService';
import ArtworkImage from '../../components/ArtworkImage';
import Icon from 'react-native-vector-icons/Feather';

type SearchMode = 'local' | 'online';
type OnlineSearchType = 'track' | 'artist' | 'album';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabsParamList, 'Search'>,
  NativeStackScreenProps<AppStackParamList>
>;

const SearchScreen: React.FC<Props> = () => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('local');
  const [onlineType, setOnlineType] = useState<OnlineSearchType>('track');

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
          onPress={() => downloadMutation.mutate(item)}
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
    <View style={styles.container}>
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
});

export default SearchScreen;
