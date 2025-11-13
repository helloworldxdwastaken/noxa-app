import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import type { AppStackParamList } from '../../navigation/types';
import { useCurrentTrack } from '../../hooks/useCurrentTrack';
import ArtworkImage from '../../components/ArtworkImage';
import { togglePlayback } from '../../services/player/PlayerService';

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
  const progress = useProgress(250);
  const [queue, setQueue] = useState<Track[]>([]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(RepeatMode.Queue);

  const isPlaying = state === TrackState.Playing || state === TrackState.Buffering;

  const loadQueue = useCallback(async () => {
    try {
      const currentQueue = await TrackPlayer.getQueue();
      setQueue(currentQueue);
    } catch {
      setQueue([]);
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
      TrackPlayer.getRepeatMode()
        .then(mode => {
          if (mounted) {
            setRepeatMode(mode);
          }
        })
        .catch(() => {});
      return () => {
        mounted = false;
      };
    }, []),
  );

  const activeIndex = useMemo(
    () => queue.findIndex(item => item.id === track?.id),
    [queue, track?.id],
  );

  const glowStyles = useMemo(
    () => [
      styles.artworkWrapper,
      isPlaying ? styles.artworkGlowOn : styles.artworkGlowOff,
    ],
    [isPlaying],
  );

  const duration = track?.duration ?? progress.duration;
  const position = progress.position;
  const progressPct = duration ? Math.min(100, (position / duration) * 100) : 0;

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Icon name="chevron-down" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.artworkContainer}>
          <View style={glowStyles}>
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
          </View>
        </View>

        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle}>{track?.title ?? 'Nothing playing'}</Text>
          <Text style={styles.trackArtist}>{track?.artist ?? '—'}</Text>
          {track?.album ? <Text style={styles.trackAlbum}>{track.album}</Text> : null}
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
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
          <View style={[styles.controlBtn, styles.disabledControl]}>
            <Icon name="shuffle" size={20} color="#6b7280" />
          </View>
        </View>

        <View style={styles.queueSection}>
          <Text style={styles.queueTitle}>Up Next</Text>
          {queue.length === 0 ? (
            <Text style={styles.emptyQueue}>Queue is empty</Text>
          ) : (
            queue.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <View key={`${item.id}-${index}`} style={styles.queueItem}>
                  <View style={[styles.queueArtwork, isActive && styles.queueArtworkActive]}>
                    {item.title ? (
                      <Text style={styles.queueIcon}>{item.title[0]?.toUpperCase()}</Text>
                    ) : (
                      <Icon name="music" size={18} color="#8aa4ff" />
                    )}
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
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeBtn: {
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
    padding: 10,
    backgroundColor: '#11111b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkGlowOn: {
    shadowColor: '#1db954',
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  artworkGlowOff: {
    shadowColor: '#111827',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
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
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#15151f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueArtworkActive: {
    backgroundColor: '#1db95422',
  },
  queueIcon: {
    color: '#8aa4ff',
    fontWeight: '600',
    fontSize: 18,
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
});

export default NowPlayingScreen;
