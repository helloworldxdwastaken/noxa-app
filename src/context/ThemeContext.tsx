import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AccentId = 'green' | 'purpleBlue' | 'appleRed';

export type AccentOption = {
  id: AccentId;
  name: string;
  colors: readonly string[];
  preview?: readonly string[];
  description: string;
  onPrimary: string;
};

const ACCENT_STORAGE_KEY = 'noxa.accent';

export const ACCENT_OPTIONS: Record<AccentId, AccentOption> = {
  green: {
    id: 'green',
    name: 'Green Solid',
    colors: ['#1db954'],
    description: 'settings.accentOptionGreen',
    onPrimary: '#050505',
  },
  purpleBlue: {
    id: 'purpleBlue',
    name: 'Purple & Blue',
    colors: ['#8b5cf6', '#38bdf8'],
    description: 'settings.accentOptionPurpleBlue',
    onPrimary: '#ffffff',
  },
  appleRed: {
    id: 'appleRed',
    name: 'Apple Music Red',
    colors: ['#ff2d55'],
    description: 'settings.accentOptionRed',
    onPrimary: '#ffffff',
  },
};

export type ThemeContextValue = {
  accentId: AccentId;
  accentOption: AccentOption;
  setAccent: (id: AccentId) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [accentId, setAccentId] = useState<AccentId>('green');

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const stored = await AsyncStorage.getItem(ACCENT_STORAGE_KEY);
        if (stored && (stored === 'green' || stored === 'purpleBlue' || stored === 'appleRed')) {
          if (mounted) {
            setAccentId(stored as AccentId);
          }
        }
      } catch (error) {
        console.warn('Failed to load accent preference', error);
      }
    };
    bootstrap().catch(error => console.warn('Failed to bootstrap accent', error));
    return () => {
      mounted = false;
    };
  }, []);

  const handleSetAccent = useCallback((id: AccentId) => {
    setAccentId(id);
    AsyncStorage.setItem(ACCENT_STORAGE_KEY, id).catch(error =>
      console.warn('Failed to save accent preference', error),
    );
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ accentId, accentOption: ACCENT_OPTIONS[accentId], setAccent: handleSetAccent }),
    [accentId, handleSetAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeAccent = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeAccent must be used within ThemeProvider');
  }
  return context;
};

export const accentOptionsList = Object.values(ACCENT_OPTIONS);
