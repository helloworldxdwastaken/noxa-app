import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import type { SupportedLanguage } from '../../i18n/translations';
import { accentOptionsList, useThemeAccent } from '../../context/ThemeContext';
import { useAccentColor } from '../../hooks/useAccentColor';

const SettingsScreen: React.FC = () => {
  const {
    state: { baseUrl },
    updateServerUrl,
    logout,
  } = useAuth();

  const [serverUrl, setServerUrl] = useState(baseUrl);
  const { t, language, setLanguage } = useLanguage();
  const { accentId, setAccent } = useThemeAccent();
  const { primary } = useAccentColor();

  const handleSaveServer = async () => {
    if (!serverUrl.trim()) {
      Alert.alert(t('common.error'), t('settings.serverInvalid'));
      return;
    }
    try {
      await updateServerUrl(serverUrl.trim());
      Alert.alert(t('common.ok'), t('settings.serverSuccess'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error');
      Alert.alert(t('common.error'), message);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 12 }]}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.serverTitle')}</Text>
          <Text style={styles.sectionSubtitle}>{t('settings.serverSubtitle')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('settings.serverPlaceholder')}
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={[styles.button, { backgroundColor: primary }]} onPress={handleSaveServer}>
            <Text style={styles.buttonText}>{t('settings.saveServer')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.languageTitle')}</Text>
          <Text style={styles.sectionSubtitle}>{t('settings.languageSubtitle')}</Text>
          <View style={styles.languageToggle}>
            {(['en', 'es'] as SupportedLanguage[]).map(option => {
              const isActive = language === option;
              const flag = option === 'en' ? '🇺🇸' : '🇪🇸';
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.languageBtn, isActive && styles.languageBtnActive]}
                  onPress={() => setLanguage(option)}
                >
                  <Text
                    style={[
                      styles.languageBtnLabel,
                      isActive && styles.languageBtnLabelActive,
                    ]}
                  >
                    {`${flag} ${option === 'en' ? t('settings.english') : t('settings.spanish')}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.accentTitle')}</Text>
          <Text style={styles.sectionSubtitle}>{t('settings.accentSubtitle')}</Text>
          <View style={styles.accentOptions}>
            {accentOptionsList.map(option => {
              const isActive = accentId === option.id;
              const label = t(option.description as any);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.accentOption,
                    isActive && [styles.accentOptionActive, { borderColor: primary }],
                  ]}
                  onPress={() => setAccent(option.id)}
                >
                  <View style={[styles.accentSwatch, isActive && { borderColor: primary }]}>
                    {option.colors.map((color, index) => (
                      <View
                        key={`${option.id}-${color}-${index}`}
                        style={[
                          styles.accentSwatchSegment,
                          index === 0 && styles.accentSwatchSegmentLeft,
                          index === option.colors.length - 1 && styles.accentSwatchSegmentRight,
                          { backgroundColor: color },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.accentLabel, isActive && { color: primary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.accountTitle')}</Text>
          <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleLogout}>
            <Text style={styles.buttonText}>{t('settings.signOut')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#000000',
  },
  scrollContent: {
    gap: 24,
  },
  section: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    color: '#9090a5',
  },
  input: {
    backgroundColor: '#282828',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
  },
  languageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  languageBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  languageBtnActive: {
    backgroundColor: '#ffffff',
  },
  languageBtnLabel: {
    fontWeight: '600',
    color: '#9090a5',
  },
  languageBtnLabelActive: {
    color: '#050505',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#f87171',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  accentOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accentOption: {
    flexGrow: 1,
    minWidth: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  accentOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  accentSwatch: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  accentSwatchSegment: {
    flex: 1,
    height: 26,
  },
  accentSwatchSegmentLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  accentSwatchSegmentRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  accentLabel: {
    color: '#d1d5db',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default SettingsScreen;
