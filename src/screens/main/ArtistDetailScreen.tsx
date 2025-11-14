import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import type { LibraryStackParamList } from '../../navigation/types';
import { playSong } from '../../services/player/PlayerService';
import type { Song } from '../../types/models';
import ArtworkImage from '../../components/ArtworkImage';
import { addTrackToPlaylist, deleteTrack, fetchPlaylists } from '../../api/service';
import { useLanguage } from '../../context/LanguageContext';
import { useConnectivity } from '../../hooks/useConnectivity';

type Props = NativeStackScreenProps<LibraryStackParamList, 'ArtistDetail'>;

type AlbumGroup = {
  id: string;
  title: string;
  songs: Song[];
  artwork?: string | null;
};

const ArtistDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { artistName, songs } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const connectivity = useConnectivity();

  const [trackMenuVisible, setTrackMenuVisible] = useState(false);
  const [playlistPickerVisible, setPlaylistPickerVisible] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Song | null>(null);
  const [addingPlaylistId, setAddingPlaylistId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: playlists = [] } = useQuery({
    queryKey: ['playlists'],
    queryFn: fetchPlaylists,
    enabled: !connectivity.isOffline,
  });

  const albums = useMemo<AlbumGroup[]>(() => {
    const grouped = songs.reduce((acc, track) => {
      const title = track.album || t('library.unknownAlbum');
      if (!acc[title]) {
        acc[title] = {
          id: `${title}-${track.id}`,
          title,
          songs: [],
          artwork: track.albumCover ?? null,
        };
      }
      acc[title].songs.push(track);
      if (!acc[title].artwork && track.albumCover) {
        acc[title].artwork = track.albumCover;
      }
      return acc;
    }, {} as Record<string, AlbumGroup>);

    return Object.values(grouped).sort((a, b) => a.title.localeCompare(b.title));
  }, [songs, t]);

  const handlePlayAlbum = (albumSongs: Song[]) => {
    if (!albumSongs.length) {
      return;
    }
    const [first, ...rest] = albumSongs;
    playSong(first, rest).catch(error => {
      console.warn('Failed to start album playback', error);
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('common.error'));
    });
  };

  const openTrackMenu = (track: Song) => {
    setSelectedTrack(track);
    setTrackMenuVisible(true);
  };

  const closeTrackMenu = () => {
    setTrackMenuVisible(false);
    setSelectedTrack(null);
  };

  const handleAddToPlaylist = async (playlistId: number) => {
    if (!selectedTrack) {
      return;
    }
    try {
      setAddingPlaylistId(playlistId);
      await addTrackToPlaylist(playlistId, selectedTrack.id);
      Alert.alert(t('common.ok'), t('common.addedToPlaylist'));
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('common.unableToAddTrack'));
    } finally {
      setAddingPlaylistId(null);
      setPlaylistPickerVisible(false);
      setSelectedTrack(null);
    }
  };

  const handleDeleteTrack = async (permanent: boolean) => {
    if (!selectedTrack) {
      return;
    }
    Alert.alert(
      permanent ? t('common.deletePermanent') : t('common.removeFromLibrary'),
      permanent ? t('playlist.deleteConfirm') : t('playlist.removePrompt', { track: selectedTrack.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: permanent ? t('common.deletePermanent') : t('common.removeFromLibrary'),
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteTrack(selectedTrack.id, permanent);
              Alert.alert(t('common.ok'), permanent ? t('common.deleted') : t('common.removed'));
            } catch (error) {
              Alert.alert(t('common.error'), error instanceof Error ? error.message : t('common.error'));
            } finally {
              setDeleting(false);
              closeTrackMenu();
            }
          },
        },
      ],
    );
  };

  const renderTrack = (track: Song, index: number) => (
    <TouchableOpacity
      key={`${track.id}-${index}`}
      style={styles.trackRow}
      onPress={() => playSong(track, songs.filter(s => s.id !== track.id)).catch(err => {
        Alert.alert(t('common.error'), err instanceof Error ? err.message : t('common.error'));
      })}
    >
      <View style={styles.trackMeta}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {track.title ?? t('library.unknownTrack')}
        </Text>
        <Text style={styles.trackSubtitle} numberOfLines={1}>
          {track.album ?? t('library.unknownAlbum')}
        </Text>
      </View>
      <View style={styles.trackActions}>
        <Text style={styles.trackDuration}>
          {track.duration ? `${Math.floor(track.duration / 60)}:${`${track.duration % 60}`.padStart(2, '0')}` : '--:--'}
        </Text>
        <TouchableOpacity style={styles.trackMenuBtn} onPress={() => openTrackMenu(track)}>
          <Icon name="more-vertical" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{artistName}</Text>
            <Text style={styles.subtitle}>
              {t('playlist.trackCount', { count: songs.length })} • {albums.length}{' '}
              {t('library.albums').toLowerCase()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('library.albums')}</Text>
          <View style={styles.albumGrid}>
            {albums.map(album => (
              <TouchableOpacity
                key={album.id}
                style={styles.albumCard}
                onPress={() =>
                  navigation.navigate('AlbumDetail', {
                    artistName,
                    albumTitle: album.title,
                    songs: album.songs,
                  })
                }
              >
                <ArtworkImage
                  uri={album.artwork}
                  size={120}
                  fallbackLabel={album.title[0]?.toUpperCase() ?? 'A'}
                />
                <Text style={styles.albumTitle} numberOfLines={2}>
                  {album.title}
                </Text>
                <Text style={styles.albumSubtitle}>
                  {t('playlist.trackCount', { count: album.songs.length })}
                </Text>
                <TouchableOpacity
                  style={styles.playAlbumBtn}
                  onPress={() => handlePlayAlbum(album.songs)}
                >
                  <Icon name="play" size={16} color="#050505" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('library.tracks')}</Text>
          <View style={styles.trackList}>{songs.map(renderTrack)}</View>
        </View>
      </ScrollView>

      <Modal transparent visible={trackMenuVisible} animationType="fade" onRequestClose={closeTrackMenu}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeTrackMenu} />
          <View style={styles.dialogCard}>
            <Text style={styles.sheetTitle}>{selectedTrack?.title ?? t('common.trackActions')}</Text>
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => {
                setTrackMenuVisible(false);
                setPlaylistPickerVisible(true);
              }}
            >
              <Icon name="plus-circle" size={18} color="#ffffff" />
              <Text style={styles.sheetActionText}>{t('common.addToPlaylist')}</Text>
            </TouchableOpacity>
            {!connectivity.isOffline ? (
              <>
                <TouchableOpacity
                  style={styles.sheetAction}
                  onPress={() => handleDeleteTrack(false)}
                  disabled={deleting}
                >
                  <Icon name="minus-circle" size={18} color="#fbbf24" />
                  <Text style={styles.sheetActionText}>{t('common.removeFromLibrary')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sheetAction}
                  onPress={() => handleDeleteTrack(true)}
                  disabled={deleting}
                >
                  <Icon name="trash-2" size={18} color="#f87171" />
                  <Text style={[styles.sheetActionText, styles.sheetDangerText]}>
                    {t('common.deletePermanent')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity style={styles.sheetAction} onPress={closeTrackMenu}>
              <Icon name="x" size={18} color="#ffffff" />
              <Text style={styles.sheetActionText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={playlistPickerVisible}
        animationType="fade"
        onRequestClose={() => setPlaylistPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setPlaylistPickerVisible(false)}
          />
          <View style={[styles.dialogCard, { maxHeight: '70%' }]}>
            <Text style={styles.sheetTitle}>{t('playlist.choosePlaylist')}</Text>
            {playlists.length === 0 ? (
              <Text style={styles.sheetEmpty}>{t('search.noPlaylistsAction')}</Text>
            ) : (
              <ScrollView style={styles.playlistScroll} contentContainerStyle={styles.playlistList}>
                {playlists.map(playlist => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.sheetAction}
                    onPress={() => handleAddToPlaylist(playlist.id)}
                    disabled={addingPlaylistId === playlist.id}
                  >
                    {addingPlaylistId === playlist.id ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Icon name="folder-plus" size={18} color="#ffffff" />
                    )}
                    <Text style={styles.sheetActionText}>{playlist.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => {
                setPlaylistPickerVisible(false);
                setSelectedTrack(null);
              }}
            >
              <Icon name="x" size={18} color="#ffffff" />
              <Text style={styles.sheetActionText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030303',
  },
  content: {
    paddingHorizontal: 20,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    color: '#9090a5',
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  albumCard: {
    width: '47%',
    backgroundColor: '#121212',
    borderRadius: 18,
    padding: 12,
    gap: 8,
  },
  albumTitle: {
    color: '#ffffff',
    fontWeight: '600',
  },
  albumSubtitle: {
    color: '#9090a5',
    fontSize: 12,
  },
  playAlbumBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1db954',
  },
  trackList: {
    borderRadius: 20,
    backgroundColor: '#090909',
    padding: 4,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1b1b1b',
  },
  trackMeta: {
    flex: 1,
    gap: 4,
  },
  trackTitle: {
    color: '#ffffff',
    fontWeight: '600',
  },
  trackSubtitle: {
    color: '#9090a5',
    fontSize: 12,
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackDuration: {
    color: '#9090a5',
    fontSize: 12,
  },
  trackMenuBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  dialogCard: {
    backgroundColor: '#050505',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 16,
  },
  sheetTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  sheetActionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  sheetDangerText: {
    color: '#f87171',
  },
  sheetEmpty: {
    color: '#9090a5',
    fontSize: 14,
  },
  playlistScroll: {
    maxHeight: 260,
  },
  playlistList: {
    gap: 8,
  },
});

export default ArtistDetailScreen;
