import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  State,
  Track,
} from 'react-native-track-player';

import { offlineManager } from '../offline/OfflineManager';
import { getStreamUrl } from '../../api/service';
import type { Song } from '../../types/models';

let isSetup = false;

export const setupPlayer = async () => {
  if (isSetup) {
    return;
  }
  await TrackPlayer.setupPlayer({
    autoHandleInterruptions: true,
    waitForBuffer: true,
  });
  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
      Capability.Stop,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    progressUpdateEventInterval: 1,
  });
  await TrackPlayer.setRepeatMode(RepeatMode.Queue);
  isSetup = true;
};

const resolveSongUrl = (song: Song) => {
  const offlineUri = offlineManager.localUri(song.id);
  if (offlineUri) {
    return offlineUri;
  }
  return getStreamUrl(song.id) ?? `https://stream.noxamusic.com/api/library/stream/${song.id}`;
};

export const songToTrack = (song: Song): Track => ({
  id: `${song.id}`,
  url: resolveSongUrl(song),
  title: song.title,
  artist: song.artist,
  album: song.album ?? undefined,
  artwork: offlineManager.artworkUri(song.id) ?? song.albumCover ?? undefined,
  duration: song.duration ?? undefined,
});

export const playSong = async (song: Song, queue: Song[] = []) => {
  await setupPlayer();
  await TrackPlayer.reset();
  const tracks = [song, ...queue].map(songToTrack);
  await TrackPlayer.add(tracks);
  await TrackPlayer.play();
};

export const updateNowPlaying = async (song: Song) => {
  const currentTrackId = await TrackPlayer.getCurrentTrack();
  if (currentTrackId != null && `${currentTrackId}` === `${song.id}`) {
    await TrackPlayer.updateMetadataForTrack(currentTrackId, songToTrack(song));
  }
};

export const togglePlayback = async () => {
  const state = await TrackPlayer.getState();
  if (state === State.Playing) {
    await TrackPlayer.pause();
  } else {
    await TrackPlayer.play();
  }
};

export const stopPlayback = async () => {
  await TrackPlayer.stop();
  await TrackPlayer.reset();
};

export const registerPlayerListeners = () => {
  TrackPlayer.addEventListener(Event.RemotePlay, TrackPlayer.play);
  TrackPlayer.addEventListener(Event.RemotePause, TrackPlayer.pause);
  TrackPlayer.addEventListener(Event.RemoteStop, stopPlayback);
  TrackPlayer.addEventListener(Event.RemoteNext, TrackPlayer.skipToNext);
  TrackPlayer.addEventListener(Event.RemotePrevious, TrackPlayer.skipToPrevious);
};

