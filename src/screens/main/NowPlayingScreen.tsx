import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Animated,
  GestureResponderEvent,
  ImageBackground,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import TrackPlayer, {
  Event,
  RepeatMode,
  Track,
  useProgress,
  useTrackPlayerEvents,
  State as TrackState,
} from 'react-native-track-player';
import Icon from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppStackParamList } from '../../navigation/types';
import { useCurrentTrack } from '../../hooks/useCurrentTrack';
import ArtworkImage from '../../components/ArtworkImage';
import { playSong, togglePlayback } from '../../services/player/PlayerService';
import { addTrackToPlaylist, deleteTrack, fetchPlaylists } from '../../api/service';
import type { Playlist, Song } from '../../types/models';
import { useLanguage } from '../../context/LanguageContext';
import { useAutoDownloadNewTracks } from '../../hooks/useAutoDownloadNewTracks';
import { useMiniPlayerVisibility } from '../../context/MiniPlayerContext';

const trackToSong = (playerTrack: Track): Song => ({
  id: Number(playerTrack.id),
  title: playerTrack.title ?? 'Unknown',
  artist: playerTrack.artist ?? 'Unknown Artist',
  album: playerTrack.album ?? undefined,
  duration: typeof playerTrack.duration === 'number' ? playerTrack.duration : undefined,
  albumCover: typeof playerTrack.artwork === 'string' ? playerTrack.artwork : undefined,
});

type Props = NativeStackScreenProps<AppStackParamList, 'NowPlaying'>;

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const NowPlayingScreen: React.FC<Props> = ({ navigation }) => {
  const { track, state } = useCurrentTrack();
  const { t } = useLanguage();
  const autoDownloadNewTrack = useAutoDownloadNewTracks();
  const { hide, show } = useMiniPlayerVisibility();
  const progress = useProgress(250);
  const [queue, setQueue] = useState<Track[]>([]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(RepeatMode.Queue);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [playlistPickerVisible, setPlaylistPickerVisible] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const actionSheetAnim = useRef(new Animated.Value(60)).current;
  const playlistSheetAnim = useRef(new Animated.Value(60)).current;
  const isPlaying = state === TrackState.Playing || state === TrackState.Buffering;
  const insets = useSafeAreaInsets();
  const glowAnim = useRef(new Animated.Value(isPlaying ? 1 : 0)).current;
  const shuffleBackupRef = useRef<Track[] | null>(null);
  const shuffleEnabledRef = useRef(false);
  const shuffleToggleInProgressRef = useRef(false);

  const loadQueue = useCallback(async () => {
    try {
      const currentQueue = await TrackPlayer.getQueue();
      setQueue(currentQueue);
    } catch {
      setQueue([]);
    }
  }, []);

  const handleSelectTrack = useCallback(
    async (target: Track) => {
      const targetIndex = queue.findIndex(item => item.id === target.id);
      if (targetIndex >= 0) {
        try {
          await TrackPlayer.skip(targetIndex);
          return;
        } catch {
          // fall back to manual playback reset below
        }
      }
      const song = trackToSong(target);
      const upcoming = queue
        .filter(item => item.id !== target.id)
        .map(item => trackToSong(item));
      await playSong(song, upcoming);
      await loadQueue();
    },
    [queue, loadQueue],
  );

  const loadPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    try {
      const list = await fetchPlaylists();
      setPlaylists(list);
    } catch (error) {
      console.error('Failed to load playlists', error);
    } finally {
      setLoadingPlaylists(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadQueue();
    }, [loadQueue]),
  );

  useTrackPlayerEvents([Event.PlaybackTrackChanged, Event.PlaybackQueueEnded], () => {
    loadQueue();
  });

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      hide();
      TrackPlayer.getRepeatMode()
        .then(mode => {
          if (mounted) {
            setRepeatMode(mode);
          }
        })
        .catch(() => {});
      return () => {
        mounted = false;
        show();
      };
    }, [hide, show]),
  );

  useEffect(() => {
    if ((actionsVisible || playlistPickerVisible) && playlists.length === 0 && !loadingPlaylists) {
      loadPlaylists();
    }
  }, [actionsVisible, playlistPickerVisible, playlists.length, loadingPlaylists, loadPlaylists]);

  const activeIndex = useMemo(
    () => queue.findIndex(item => item.id === track?.id),
    [queue, track?.id],
  );

  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: isPlaying ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [glowAnim, isPlaying]);

  useEffect(() => {
    if (actionsVisible) {
      actionSheetAnim.setValue(60);
      Animated.timing(actionSheetAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      actionSheetAnim.setValue(60);
    }
  }, [actionSheetAnim, actionsVisible]);

  useEffect(() => {
    if (playlistPickerVisible) {
      playlistSheetAnim.setValue(60);
      Animated.timing(playlistSheetAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      playlistSheetAnim.setValue(60);
    }
  }, [playlistPickerVisible, playlistSheetAnim]);

  const artworkAnimatedStyle = useMemo(
    () => ({
      transform: [
        {
          scale: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.92, 1],
          }),
        },
      ],
      shadowOpacity: glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.12, 0.28],
      }),
      shadowRadius: glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [12, 20],
      }),
    }),
    [glowAnim],
  );

  const duration = track?.duration ?? progress.duration;
  const position = progress.position;
  const progressPct = duration ? Math.min(100, (position / duration) * 100) : 0;
  const canShuffle = queue.length > 1;
  const backgroundSource = useMemo(() => {
    if (track?.artwork && typeof track.artwork === 'string') {
      return { uri: track.artwork };
    }
    return null;
  }, [track?.artwork]);

  const handleSkipNext = async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch {
      // ignore
    }
  };

  const handleSkipPrev = async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch {
      // ignore
    }
  };

  const handleRepeatToggle = async () => {
    const nextMode =
      repeatMode === RepeatMode.Off
        ? RepeatMode.Queue
        : repeatMode === RepeatMode.Queue
          ? RepeatMode.Track
          : RepeatMode.Off;
    setRepeatMode(nextMode);
    await TrackPlayer.setRepeatMode(nextMode);
  };

  const shuffleArray = useCallback((items: Track[]) => {
    const clone = [...items];
    for (let i = clone.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = clone[i];
      clone[i] = clone[j];
      clone[j] = temp;
    }
    return clone;
  }, []);

  useEffect(() => {
    shuffleEnabledRef.current = shuffleEnabled;
  }, [shuffleEnabled]);

  const handleShuffleToggle = useCallback(async () => {
    if (!track || !canShuffle || shuffleToggleInProgressRef.current) {
      return;
    }
    shuffleToggleInProgressRef.current = true;
    const currentPosition = position;
    const wasPlaying = isPlaying;
    try {
      if (!shuffleEnabledRef.current) {
        shuffleBackupRef.current = queue;
        const currentTrack = queue.find(item => item.id === track.id);
        const rest = queue.filter(item => item.id !== track.id);
        const shuffledRest = shuffleArray(rest);
        const newQueue = currentTrack ? [currentTrack, ...shuffledRest] : shuffledRest;
        await TrackPlayer.reset();
        await TrackPlayer.add(newQueue);
        if (currentTrack) {
          await TrackPlayer.skip(currentTrack.id);
          if (Number.isFinite(currentPosition) && currentPosition > 0) {
            await TrackPlayer.seekTo(currentPosition);
          }
        }
        if (wasPlaying) {
          await TrackPlayer.play();
        }
        setQueue(newQueue);
        shuffleEnabledRef.current = true;
        setShuffleEnabled(true);
      } else {
        const originalQueue = shuffleBackupRef.current ?? queue;
        await TrackPlayer.reset();
        await TrackPlayer.add(originalQueue);
        if (track) {
          await TrackPlayer.skip(track.id);
          if (Number.isFinite(currentPosition) && currentPosition > 0) {
            await TrackPlayer.seekTo(currentPosition);
          }
        }
        if (wasPlaying) {
          await TrackPlayer.play();
        }
        shuffleBackupRef.current = null;
        setQueue(originalQueue);
        shuffleEnabledRef.current = false;
        setShuffleEnabled(false);
      }
    } catch (error) {
      console.error('Failed to toggle shuffle', error);
    } finally {
      shuffleToggleInProgressRef.current = false;
    }
  }, [track, canShuffle, position, isPlaying, queue, shuffleArray]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 12,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 80) {
            navigation.goBack();
          }
        },
      }),
    [navigation],
  );

  const handleAddToPlaylist = async (playlistId: number) => {
    if (!track) {
      return;
    }
    try {
      await addTrackToPlaylist(playlistId, Number(track.id));
      Alert.alert('Added', 'Track added to playlist.');
      const playlistMeta = playlists.find(item => item.id === playlistId);
      autoDownloadNewTrack(playlistMeta, trackToSong(track));
      setActionsVisible(false);
      setPlaylistPickerVisible(false);
    } catch (error) {
      Alert.alert('Failed', error instanceof Error ? error.message : 'Unable to add to playlist');
    }
  };

  const handleDeleteTrack = async (permanent: boolean) => {
    if (!track) {
      return;
    }
    try {
      await deleteTrack(Number(track.id), permanent);
      Alert.alert('Removed', permanent ? 'Track deleted permanently.' : 'Track removed from library.');
      setActionsVisible(false);
    } catch (error) {
      Alert.alert('Failed', error instanceof Error ? error.message : 'Unable to delete track');
    }
  };

  const handleProgressGesture = useCallback(
    (event: GestureResponderEvent) => {
      if (!duration || progressBarWidth <= 0) {
        return;
      }
      const { locationX } = event.nativeEvent;
      const fraction = Math.min(Math.max(locationX / progressBarWidth, 0), 1);
      TrackPlayer.seekTo(duration * fraction);
    },
    [duration, progressBarWidth],
  );

  const content = (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Icon name="chevron-down" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('nowPlaying.title')}</Text>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setActionsVisible(true)}>
          <Icon name="more-vertical" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.artworkContainer}>
          <Animated.View style={[styles.artworkWrapper, styles.artworkGlowBase, artworkAnimatedStyle]}>
            {track ? (
              <ArtworkImage
                uri={track.artwork ?? undefined}
                size={300}
                fallbackLabel={track.title?.[0]?.toUpperCase()}
              />
            ) : (
              <View style={styles.placeholderArtwork}>
                <Icon name="music" size={64} color="#8aa4ff" />
              </View>
            )}
          </Animated.View>
        </View>

        <View style={styles.trackInfo}>
        <Text style={styles.trackTitle}>{track?.title ?? t('nowPlaying.placeholderTitle')}</Text>
        <Text style={styles.trackArtist}>{track?.artist ?? t('nowPlaying.placeholderArtist')}</Text>
          {track?.album ? <Text style={styles.trackAlbum}>{track.album}</Text> : null}
        </View>

        <View style={styles.progressSection}>
          <View
            style={styles.progressBar}
            onLayout={event => setProgressBarWidth(event.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onResponderGrant={handleProgressGesture}
            onResponderMove={handleProgressGesture}
            onResponderRelease={handleProgressGesture}
          >
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <View style={styles.progressTimes}>
            <Text style={styles.progressTime}>{formatTime(position)}</Text>
            <Text style={styles.progressTime}>{formatTime(duration)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={handleRepeatToggle}>
            <Icon
              name={repeatMode === RepeatMode.Track ? 'repeat' : 'repeat'}
              size={20}
              color={repeatMode === RepeatMode.Off ? '#6b7280' : '#1db954'}
            />
            {repeatMode === RepeatMode.Track ? (
              <View style={styles.repeatBadge}>
                <Text style={styles.repeatBadgeText}>1</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={handleSkipPrev}>
            <Icon name="skip-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playBtn} onPress={() => togglePlayback()}>
            {track ? (
              <Icon name={isPlaying ? 'pause' : 'play'} size={28} color="#050505" />
            ) : (
              <ActivityIndicator color="#050505" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={handleSkipNext}>
            <Icon name="skip-forward" size={28} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.controlBtn,
              !canShuffle && styles.disabledControl,
              shuffleEnabled && styles.shuffleActive,
            ]}
            onPress={handleShuffleToggle}
            disabled={!canShuffle}
          >
            <Icon name="shuffle" size={20} color={shuffleEnabled ? '#1db954' : '#ffffff'} />
          </TouchableOpacity>
        </View>

        <View style={styles.queueSection}>
          <Text style={styles.queueTitle}>{t('nowPlaying.upNext')}</Text>
          {queue.length === 0 ? (
            <Text style={styles.emptyQueue}>{t('nowPlaying.queueEmpty')}</Text>
          ) : (
            queue.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <TouchableOpacity
                  key={`${item.id}-${index}`}
                  style={styles.queueItem}
                  onPress={() => handleSelectTrack(item)}
                  disabled={isActive}
                >
                  <View style={[styles.queueArtwork, isActive && styles.queueArtworkActive]}>
                    <ArtworkImage
                      uri={typeof item.artwork === 'string' ? item.artwork : null}
                      size={42}
                      fallbackLabel={item.title?.[0]?.toUpperCase()}
                    />
                  </View>
                  <View style={styles.queueInfo}>
                    <Text
                      style={[styles.queueSongTitle, isActive && styles.queueSongTitleActive]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.queueSongArtist} numberOfLines={1}>
                      {item.artist}
                    </Text>
                  </View>
                  {isActive ? <Text style={styles.queueNow}>NOW</Text> : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={actionsVisible}
        animationType="fade"
        onRequestClose={() => setActionsVisible(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setActionsVisible(false)} />
        <Animated.View
          style={[
            styles.sheetContainer,
            { paddingBottom: insets.bottom + 16, transform: [{ translateY: actionSheetAnim }] },
          ]}
        >
          <Text style={styles.sheetTitle}>{track?.title ?? t('playlist.optionsTitle')}</Text>
          <View style={styles.sheetSection}>
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => {
                if (playlists.length === 0 && !loadingPlaylists) {
                  loadPlaylists();
                }
                setActionsVisible(false);
                setPlaylistPickerVisible(true);
              }}
            >
              <Icon name="plus-circle" size={18} color="#ffffff" />
              <Text style={styles.sheetActionText}>{t('common.addToPlaylist')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetAction} onPress={() => handleDeleteTrack(false)}>
              <Icon name="trash-2" size={18} color="#fbbf24" />
              <Text style={styles.sheetActionText}>{t('common.removeFromLibrary')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetAction} onPress={() => handleDeleteTrack(true)}>
              <Icon name="alert-triangle" size={18} color="#f87171" />
              <Text style={[styles.sheetActionText, styles.sheetDangerText]}>
                {t('common.deletePermanent')}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.sheetAction} onPress={() => setActionsVisible(false)}>
            <Icon name="x" size={18} color="#ffffff" />
            <Text style={styles.sheetActionText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
      <Modal
        transparent
        visible={playlistPickerVisible}
        animationType="fade"
        onRequestClose={() => setPlaylistPickerVisible(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setPlaylistPickerVisible(false)} />
        <Animated.View
          style={[
            styles.sheetContainer,
            { paddingBottom: insets.bottom + 16, transform: [{ translateY: playlistSheetAnim }] },
          ]}
        >
          <Text style={styles.sheetTitle}>{t('playlist.choosePlaylist')}</Text>
          {loadingPlaylists ? (
            <ActivityIndicator color="#ffffff" />
          ) : playlists.length === 0 ? (
            <Text style={styles.sheetEmpty}>{t('playlist.noOtherPlaylists')}</Text>
          ) : (
            <FlatList
              data={playlists}
              keyExtractor={item => `${item.id}`}
              style={styles.playlistList}
              contentContainerStyle={styles.playlistListContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.sheetAction}
                  onPress={() => handleAddToPlaylist(item.id)}
                >
                  <Icon name="folder-plus" size={18} color="#ffffff" />
                  <Text style={styles.sheetActionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity style={styles.sheetAction} onPress={() => setPlaylistPickerVisible(false)}>
            <Icon name="x" size={18} color="#f87171" />
            <Text style={[styles.sheetActionText, styles.sheetDangerText]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </View>
  );

  if (backgroundSource) {
    return (
      <ImageBackground source={backgroundSource} blurRadius={15} style={styles.backgroundImage}>
        <View style={styles.backdropOverlay} />
        {content}
      </ImageBackground>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,10,0.8)',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#12121b',
  },
  menuBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#12121b',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  spacer: {
    width: 40,
  },
  content: {
    padding: 24,
    gap: 32,
    paddingBottom: 120,
  },
  artworkContainer: {
    alignItems: 'center',
  },
  artworkWrapper: {
    width: 320,
    height: 320,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkGlowBase: {
    shadowColor: '#1db954',
  },
  placeholderArtwork: {
    width: 300,
    height: 300,
    borderRadius: 24,
    backgroundColor: '#1f1f2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    alignItems: 'center',
    gap: 6,
  },
  trackTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  trackArtist: {
    fontSize: 16,
    color: '#9090a5',
  },
  trackAlbum: {
    fontSize: 14,
    color: '#7a7a8c',
  },
  progressSection: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1f1f2e',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1db954',
  },
  progressTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTime: {
    fontSize: 12,
    color: '#9090a5',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  controlBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#101018',
  },
  disabledControl: {
    opacity: 0.5,
  },
  shuffleActive: {
    borderWidth: 1,
    borderColor: 'rgba(29,185,84,0.4)',
  },
  playBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1db954',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1db954',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  repeatBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1db954',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBadgeText: {
    color: '#050505',
    fontSize: 10,
    fontWeight: '700',
  },
  queueSection: {
    gap: 12,
  },
  queueTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1c1c23',
  },
  queueArtwork: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  queueArtworkActive: {
    borderWidth: 2,
    borderColor: '#1db954',
  },
  queueInfo: {
    flex: 1,
  },
  queueSongTitle: {
    color: '#ffffff',
    fontWeight: '600',
  },
  queueSongTitleActive: {
    color: '#1db954',
  },
  queueSongArtist: {
    color: '#9090a5',
    fontSize: 12,
  },
  queueNow: {
    fontSize: 10,
    color: '#1db954',
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#1db954',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  emptyQueue: {
    color: '#6b7280',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0d0d14',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  sheetTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSection: {
    gap: 12,
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
    color: '#6b7280',
    fontSize: 14,
  },
  playlistList: {
    maxHeight: 240,
  },
  playlistListContent: {
    gap: 8,
  },
});

export default NowPlayingScreen;
