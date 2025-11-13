import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import {
  deletePlaylist,
  fetchPlaylistTracks,
  removeTrackFromPlaylist,
  reorderPlaylist,
  updatePlaylist,
  fetchPlaylists,
} from '../../api/service';
import { useOffline } from '../../context/OfflineContext';
import { useConnectivity } from '../../hooks/useConnectivity';
import type { AppStackParamList, AppTabsParamList } from '../../navigation/types';
import type { Playlist, Song } from '../../types/models';
import ArtworkImage from '../../components/ArtworkImage';
import { playSong } from '../../services/player/PlayerService';

type Props = NativeStackScreenProps<AppStackParamList, 'PlaylistDetail'>;
const ROW_HEIGHT = 76;
const TAB_SHORTCUTS: Array<{ key: keyof AppTabsParamList; label: string; icon: string }> = [
  { key: 'Home', label: 'Home', icon: 'home' },
  { key: 'Library', label: 'Library', icon: 'layers' },
  { key: 'Search', label: 'Search', icon: 'search' },
  { key: 'Settings', label: 'Settings', icon: 'settings' },
];

const PlaylistDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { playlistId, playlistName: initialName, description: initialDescription, coverUrl: initialCover } = route.params;
  const queryClient = useQueryClient();
  const { state: offlineState, downloadPlaylist, removePlaylist, isPlaylistDownloaded } =
    useOffline();
  const connectivity = useConnectivity();
  const insets = useSafeAreaInsets();

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(initialName ?? '');
  const [descInput, setDescInput] = useState(initialDescription ?? '');
  const [orderedTracks, setOrderedTracks] = useState<Song[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);

  const orderedTracksRef = useRef<Song[]>([]);
  const dragIndexRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);

  const { data: tracks = [], isLoading, refetch } = useQuery({
    queryKey: ['playlists', playlistId, 'tracks'],
    queryFn: () => fetchPlaylistTracks(playlistId),
    enabled: !connectivity.isOffline,
  });

  const { data: playlistMeta } = useQuery({
    queryKey: ['playlists', playlistId, 'meta'],
    queryFn: async () => {
      const list = await fetchPlaylists();
      return list.find(item => item.id === playlistId);
    },
  });

  const derivedName = playlistMeta?.name ?? initialName ?? 'Untitled Playlist';
  const derivedDesc = playlistMeta?.description ?? initialDescription ?? '';
  const derivedCover = playlistMeta?.coverUrl ?? initialCover ?? null;
  const derivedTrackCount = playlistMeta?.trackCount ?? route.params.trackCount ?? tracks.length;
  const playlistProgress = offlineState.downloadProgress[playlistId] ?? 0;
  const isDownloading = offlineState.activePlaylists.includes(playlistId);
  const isDownloaded = isPlaylistDownloaded(playlistId);

  const offlineTracks = useMemo(() => {
    if (!connectivity.isOffline) {
      return [];
    }
    const entry = offlineState.playlists[playlistId];
    if (!entry) {
      return [];
    }
    return entry.songIds
      .map(id => offlineState.tracks[id]?.song)
      .filter((song): song is Song => Boolean(song));
  }, [connectivity.isOffline, offlineState.playlists, offlineState.tracks, playlistId]);

  const baseTracks = connectivity.isOffline ? offlineTracks : tracks;

  useEffect(() => {
    if (!isEditing) {
      setNameInput(derivedName);
      setDescInput(derivedDesc);
    }
  }, [derivedName, derivedDesc, isEditing]);

  useEffect(() => {
    if (!orderDirty || !isEditing) {
      setOrderedTracks(baseTracks);
      orderedTracksRef.current = baseTracks;
    }
  }, [baseTracks, orderDirty, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setOrderedTracks(baseTracks);
      orderedTracksRef.current = baseTracks;
      setOrderDirty(false);
      setDraggingIndex(null);
      dragIndexRef.current = null;
      dragOffsetRef.current = 0;
    }
  }, [isEditing, baseTracks]);

  useEffect(() => {
    orderedTracksRef.current = orderedTracks;
  }, [orderedTracks]);

  const displayName = isEditing ? nameInput : derivedName;
  const displayDesc = isEditing ? descInput : derivedDesc;

  const updateMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = nameInput.trim() || 'Untitled Playlist';
      const hasMetaChanges =
        trimmedName !== (derivedName ?? '') || (descInput ?? '') !== (derivedDesc ?? '');
      const operations: Array<Promise<void>> = [];
      if (hasMetaChanges) {
        operations.push(updatePlaylist(playlistId, { name: trimmedName, description: descInput }));
      }
      if (orderDirty) {
        const orders = orderedTracksRef.current.map((track, index) => ({
          musicId: track.id,
          position: index + 1,
        }));
        operations.push(reorderPlaylist(playlistId, orders));
      }
      if (operations.length === 0) {
        return false;
      }
      await Promise.all(operations);
      return true;
    },
    onSuccess: changed => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlists', playlistId, 'tracks'] });
      setIsEditing(false);
      setOrderDirty(false);
      setDraggingIndex(null);
      dragIndexRef.current = null;
      dragOffsetRef.current = 0;
      if (changed) {
        Alert.alert('Success', 'Playlist updated');
      }
    },
    onError: error =>
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update playlist'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePlaylist(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      navigation.goBack();
    },
    onError: () => Alert.alert('Error', 'Failed to delete playlist'),
  });

  const removeTrackMutation = useMutation({
    mutationFn: (musicId: number) => removeTrackFromPlaylist(playlistId, musicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists', playlistId, 'tracks'] });
      refetch();
    },
    onError: () => Alert.alert('Error', 'Failed to remove track'),
  });

  const handleDelete = () => {
    Alert.alert('Delete Playlist', 'Are you sure you want to delete this playlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  const handleRemoveTrack = (song: Song) => {
    Alert.alert('Remove Track', `Remove "${song.title}" from this playlist?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeTrackMutation.mutate(song.id) },
    ]);
  };

  const handleDownloadOffline = async () => {
    if (baseTracks.length === 0) {
      Alert.alert('No Tracks', 'Add tracks to this playlist before downloading.');
      return;
    }
    const playlistPayload: Playlist = {
      id: playlistId,
      name: derivedName,
      description: derivedDesc,
      coverUrl: derivedCover,
      trackCount: derivedTrackCount ?? baseTracks.length,
    };
    await downloadPlaylist(playlistPayload, baseTracks);
    Alert.alert('Download Started', 'Playlist is being downloaded for offline playback.');
  };

  const handleRemoveOffline = async () => {
    Alert.alert('Remove Offline', 'Delete this playlist from offline cache?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removePlaylist(playlistId);
        },
      },
    ]);
  };

  const handlePlaySong = useCallback(
    (song: Song) => {
      const queue = baseTracks.filter(track => track.id !== song.id);
      playSong(song, queue).catch(error => console.error('Failed to start playback', error));
    },
    [baseTracks],
  );

  const startDrag = (index: number) => {
    if (!isEditing) {
      return;
    }
    dragIndexRef.current = index;
    dragOffsetRef.current = 0;
    setDraggingIndex(index);
  };

  const finishDrag = () => {
    dragIndexRef.current = null;
    dragOffsetRef.current = 0;
    setDraggingIndex(null);
  };

  const shiftTrack = useCallback((from: number, to: number) => {
    setOrderedTracks(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      orderedTracksRef.current = next;
      return next;
    });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: () => dragIndexRef.current !== null,
      onMoveShouldSetPanResponder: () => dragIndexRef.current !== null,
      onPanResponderMove: (_, gesture) => {
        if (dragIndexRef.current === null) {
          return;
        }
        const threshold = ROW_HEIGHT * 0.6;
        const delta = gesture.dy - dragOffsetRef.current;
        if (delta > threshold && dragIndexRef.current < orderedTracksRef.current.length - 1) {
          const newIndex = dragIndexRef.current + 1;
          shiftTrack(dragIndexRef.current, newIndex);
          dragIndexRef.current = newIndex;
          dragOffsetRef.current += ROW_HEIGHT;
          setDraggingIndex(newIndex);
          setOrderDirty(true);
        } else if (delta < -threshold && dragIndexRef.current > 0) {
          const newIndex = dragIndexRef.current - 1;
          shiftTrack(dragIndexRef.current, newIndex);
          dragIndexRef.current = newIndex;
          dragOffsetRef.current -= ROW_HEIGHT;
          setDraggingIndex(newIndex);
          setOrderDirty(true);
        }
      },
      onPanResponderRelease: () => finishDrag(),
      onPanResponderTerminate: () => finishDrag(),
    }),
  ).current;

  const handleSave = () => {
    if (updateMutation.isPending) {
      return;
    }
    updateMutation.mutate();
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setNameInput(derivedName);
    setDescInput(derivedDesc);
    setOrderedTracks(tracks);
    orderedTracksRef.current = tracks;
    setOrderDirty(false);
    finishDrag();
  };

  const displayedTracks = isEditing ? orderedTracks : baseTracks;

  const renderTrack = ({ item, index }: { item: Song; index: number }) => (
    <TouchableOpacity
      style={[
        styles.trackRow,
        isEditing && draggingIndex === index && styles.draggingRow,
      ]}
      onPress={!isEditing ? () => handlePlaySong(item) : undefined}
      onLongPress={!isEditing ? () => handleRemoveTrack(item) : undefined}
      activeOpacity={isEditing ? 0.85 : 0.6}
    >
      <Text style={styles.trackNumber}>{index + 1}</Text>
      <ArtworkImage
        uri={item.albumCover}
        size={48}
        fallbackLabel={item.title?.[0]?.toUpperCase()}
      />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      {offlineState.tracks[item.id] ? (
        <Icon name="check-circle" size={16} color="#4ade80" style={styles.downloadedIcon} />
      ) : null}
      <Text style={styles.trackDuration}>
        {item.duration
          ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}`
          : '--:--'}
      </Text>
      {isEditing ? (
        <TouchableOpacity
          style={styles.dragHandle}
          onLongPress={() => startDrag(index)}
          delayLongPress={120}
        >
          <Icon name="move" size={18} color="#9ca3af" />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );

  const waitingForRemote = !connectivity.isOffline && isLoading && baseTracks.length === 0;

  if (waitingForRemote) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.loadingText}>Loading playlist…</Text>
      </View>
    );
  }

  const handleTabShortcut = (tab: keyof AppTabsParamList) => {
    navigation.navigate('Tabs', { screen: tab });
  };

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + 12 }]}
      {...(isEditing ? panResponder.panHandlers : {})}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-left" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.coverWrapper}>
            <ArtworkImage
              uri={derivedCover ?? tracks[0]?.albumCover ?? null}
              size={84}
              fallbackLabel={displayName?.[0]?.toUpperCase()}
            />
          </View>
          <View style={styles.headerInfo}>
            {isEditing ? (
              <>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                onChangeText={setNameInput}
                placeholder="Playlist name"
                placeholderTextColor="#606072"
              />
              <TextInput
                style={styles.descInput}
                value={descInput}
                onChangeText={setDescInput}
                placeholder="Description (optional)"
                placeholderTextColor="#606072"
              />
            </>
          ) : (
            <>
              <Text style={styles.playlistName}>{displayName}</Text>
              {displayDesc ? <Text style={styles.playlistDesc}>{displayDesc}</Text> : null}
              <Text style={styles.trackCount}>{derivedTrackCount} songs</Text>
            </>
          )}
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleSave}
              disabled={updateMutation.isPending}
            >
              <View style={styles.actionContent}>
                <Icon
                  name="save"
                  size={16}
                  color={updateMutation.isPending ? '#a3a3b3' : '#ffffff'}
                />
                <Text style={styles.actionText}>
                  {updateMutation.isPending ? 'Saving…' : 'Save'}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCancelEditing}>
              <View style={styles.actionContent}>
                <Icon name="x" size={16} color="#ffffff" />
                <Text style={styles.actionText}>Cancel</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setNameInput(derivedName);
                setDescInput(derivedDesc);
                setIsEditing(true);
              }}
            >
              <View style={styles.actionContent}>
                <Icon name="edit-3" size={16} color="#ffffff" />
                <Text style={styles.actionText}>Edit</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
              <View style={styles.actionContent}>
                <Icon name="trash-2" size={16} color="#ff6b6b" />
                <Text style={styles.actionTextDanger}>Delete</Text>
              </View>
            </TouchableOpacity>
            {isDownloading ? (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDisabled]} disabled>
                <View style={styles.actionContent}>
                  <Icon name="download" size={16} color="#ffffff" />
                  <Text style={styles.actionText}>{`Downloading ${Math.round(playlistProgress * 100)}%`}</Text>
                </View>
              </TouchableOpacity>
            ) : isDownloaded ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSuccess]}
                onPress={handleRemoveOffline}
              >
                <View style={styles.actionContent}>
                  <Icon name="check-circle" size={16} color="#050505" />
                  <Text style={styles.actionTextOnBright}>Downloaded</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.actionBtn} onPress={handleDownloadOffline}>
                <View style={styles.actionContent}>
                  <Icon name="download" size={16} color="#ffffff" />
                  <Text style={styles.actionText}>Save Offline</Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Tracks */}
      <FlatList
        data={displayedTracks}
        renderItem={renderTrack}
        keyExtractor={item => `${item.id}`}
        scrollEnabled={!isEditing || draggingIndex === null}
        contentContainerStyle={[
          displayedTracks.length === 0 && styles.emptyContainer,
          styles.listContentPadding,
        ]}
        ListEmptyComponent={
          <View style={styles.centered}>
            <View style={styles.emptyIconCircle}>
              <Icon name="music" size={32} color="#8aa4ff" />
            </View>
            <Text style={styles.emptyText}>No tracks in this playlist yet.</Text>
          </View>
        }
      />
      <View style={[styles.tabShortcutContainer, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.tabShortcutBackground}>
          {TAB_SHORTCUTS.map(item => {
            const isActive = item.key === 'Library';
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.tabShortcutBtn, isActive && styles.tabShortcutBtnActive]}
                onPress={() => handleTabShortcut(item.key)}
              >
                <Icon name={item.icon} size={18} color={isActive ? '#1db954' : '#7c8297'} />
                <Text
                  style={[styles.tabShortcutLabel, isActive && styles.tabShortcutLabelActive]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#e6e6f2',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  coverWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    gap: 8,
    flex: 1,
  },
  playlistName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  playlistDesc: {
    fontSize: 14,
    color: '#9090a5',
  },
  trackCount: {
    fontSize: 14,
    color: '#9090a5',
  },
  nameInput: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#121212',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  descInput: {
    fontSize: 14,
    color: '#ffffff',
    backgroundColor: '#121212',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexWrap: 'wrap',
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#121212',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnSuccess: {
    backgroundColor: '#1db954',
  },
  actionTextOnBright: {
    color: '#050505',
    fontSize: 14,
    fontWeight: '600',
  },
  actionTextDanger: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#282828',
    minHeight: 76,
  },
  draggingRow: {
    backgroundColor: '#11111b',
  },
  trackNumber: {
    width: 24,
    color: '#9090a5',
    fontSize: 14,
  },
  trackInfo: {
    flex: 1,
    gap: 4,
  },
  trackTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  trackArtist: {
    color: '#9090a5',
    fontSize: 13,
  },
  trackDuration: {
    color: '#9090a5',
    fontSize: 14,
  },
  downloadedIcon: {
    marginRight: 8,
  },
  dragHandle: {
    padding: 8,
    marginLeft: 4,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  listContentPadding: {
    paddingBottom: 120,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#15151f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#9090a5',
    fontSize: 16,
  },
  tabShortcutContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabShortcutBackground: {
    flexDirection: 'row',
    backgroundColor: '#0d0d14',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 6,
    justifyContent: 'space-between',
    gap: 8,
  },
  tabShortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 10,
  },
  tabShortcutBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabShortcutLabel: {
    color: '#7c8297',
    fontSize: 12,
    fontWeight: '600',
  },
  tabShortcutLabelActive: {
    color: '#ffffff',
  },
});

export default PlaylistDetailScreen;
