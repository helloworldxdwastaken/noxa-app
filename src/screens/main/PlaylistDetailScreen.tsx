import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';

import {
  deletePlaylist,
  fetchPlaylistTracks,
  removeTrackFromPlaylist,
  updatePlaylist,
  fetchPlaylists,
} from '../../api/service';
import { useOffline } from '../../context/OfflineContext';
import type { AppStackParamList } from '../../navigation/types';
import type { Playlist, Song } from '../../types/models';
import ArtworkImage from '../../components/ArtworkImage';

type Props = NativeStackScreenProps<AppStackParamList, 'PlaylistDetail'>;

const PlaylistDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { playlistId, playlistName: initialName, description: initialDescription, coverUrl: initialCover } = route.params;
  const queryClient = useQueryClient();
  const { state: offlineState, downloadPlaylist, removePlaylist, isPlaylistDownloaded } = useOffline();

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(initialName ?? '');
  const [descInput, setDescInput] = useState(initialDescription ?? '');

  const { data: tracks = [], isLoading, refetch } = useQuery({
    queryKey: ['playlists', playlistId, 'tracks'],
    queryFn: () => fetchPlaylistTracks(playlistId),
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

  useEffect(() => {
    if (!isEditing) {
      setNameInput(derivedName);
      setDescInput(derivedDesc);
    }
  }, [derivedName, derivedDesc, isEditing]);

  const displayName = isEditing ? nameInput : derivedName;
  const displayDesc = isEditing ? descInput : derivedDesc;

  const updateMutation = useMutation({
    mutationFn: () => updatePlaylist(playlistId, { name: nameInput, description: descInput }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsEditing(false);
      Alert.alert('Success', 'Playlist updated');
    },
    onError: () => Alert.alert('Error', 'Failed to update playlist'),
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
    if (tracks.length === 0) {
      Alert.alert('No Tracks', 'Add tracks to this playlist before downloading.');
      return;
    }
    const playlistPayload: Playlist = {
      id: playlistId,
      name: derivedName,
      description: derivedDesc,
      coverUrl: derivedCover,
      trackCount: derivedTrackCount ?? tracks.length,
    };
    await downloadPlaylist(playlistPayload, tracks);
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

  const renderTrack = ({ item, index }: { item: Song; index: number }) => (
    <TouchableOpacity style={styles.trackRow} onLongPress={() => handleRemoveTrack(item)}>
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
      <Text style={styles.trackDuration}>
        {item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : '--:--'}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.loadingText}>Loading playlist…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
              onPress={() => updateMutation.mutate()}
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
            <TouchableOpacity style={styles.actionBtn} onPress={() => setIsEditing(false)}>
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
              <TouchableOpacity style={styles.actionBtn} onPress={handleRemoveOffline}>
                <View style={styles.actionContent}>
                  <Icon name="check-circle" size={16} color="#ffffff" />
                  <Text style={styles.actionText}>Remove Offline</Text>
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
        data={tracks}
        renderItem={renderTrack}
        keyExtractor={item => `${item.id}`}
        contentContainerStyle={tracks.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <View style={styles.centered}>
            <View style={styles.emptyIconCircle}>
              <Icon name="music" size={32} color="#8aa4ff" />
            </View>
            <Text style={styles.emptyText}>No tracks in this playlist yet.</Text>
          </View>
        }
      />
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
  emptyContainer: {
    flexGrow: 1,
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
});

export default PlaylistDetailScreen;
