import RNFS from 'react-native-fs';

const CACHE_DIR = `${RNFS.CachesDirectoryPath}/playlist-artwork`;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Ensure cache directory exists
const ensureCacheDir = async () => {
  try {
    const exists = await RNFS.exists(CACHE_DIR);
    if (!exists) {
      await RNFS.mkdir(CACHE_DIR);
    }
  } catch (error) {
    console.warn('Failed to create cache directory:', error);
  }
};

// Generate a safe filename from URL
const getFilenameFromUrl = (url: string): string => {
  const hash = url.split('').reduce((acc, char) => {
    const chr = char.charCodeAt(0);
    acc = (acc << 5) - acc + chr;
    return acc & acc;
  }, 0);
  return `artwork_${Math.abs(hash)}.jpg`;
};

// Check if cached image is still valid (less than 24 hours old)
const isCacheValid = async (filepath: string): Promise<boolean> => {
  try {
    const stat = await RNFS.stat(filepath);
    const fileAge = Date.now() - new Date(stat.mtime).getTime();
    return fileAge < CACHE_DURATION;
  } catch {
    return false;
  }
};

// Get cached image or download if needed
export const getCachedImage = async (url: string | null | undefined): Promise<string | null> => {
  if (!url) {
    return null;
  }

  try {
    await ensureCacheDir();

    const filename = getFilenameFromUrl(url);
    const filepath = `${CACHE_DIR}/${filename}`;

    // Check if cache exists and is valid
    const exists = await RNFS.exists(filepath);
    if (exists && (await isCacheValid(filepath))) {
      return `file://${filepath}`;
    }

    // Download and cache the image
    const downloadResult = await RNFS.downloadFile({
      fromUrl: url,
      toFile: filepath,
    }).promise;

    if (downloadResult.statusCode === 200) {
      return `file://${filepath}`;
    }

    return url; // Fallback to original URL if download fails
  } catch (error) {
    console.warn('Image cache error:', error);
    return url; // Fallback to original URL on error
  }
};

// Clear old cached images (optional cleanup function)
export const clearOldCache = async () => {
  try {
    const exists = await RNFS.exists(CACHE_DIR);
    if (!exists) {
      return;
    }

    const files = await RNFS.readDir(CACHE_DIR);
    const now = Date.now();

    for (const file of files) {
      const fileAge = now - new Date(file.mtime).getTime();
      if (fileAge > CACHE_DURATION) {
        await RNFS.unlink(file.path);
      }
    }
  } catch (error) {
    console.warn('Failed to clear old cache:', error);
  }
};

// Preload images for playlists
export const preloadPlaylistImages = async (playlists: Array<{ coverUrl?: string | null }>) => {
  try {
    await ensureCacheDir();
    
    // Download all images in parallel
    const promises = playlists
      .filter(p => p.coverUrl)
      .map(p => getCachedImage(p.coverUrl!));
    
    await Promise.all(promises);
  } catch (error) {
    console.warn('Failed to preload playlist images:', error);
  }
};

