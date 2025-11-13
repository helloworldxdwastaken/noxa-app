import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import type { SupportedLanguage } from '../../i18n/translations';

const SettingsScreen: React.FC = () => {
  const {
    state: { baseUrl, adminCredentials },
    updateServerUrl,
    setAdminCredentials,
    logout,
  } = useAuth();

  const [serverUrl, setServerUrl] = useState(baseUrl);
  const [adminUser, setAdminUser] = useState(adminCredentials?.username ?? '');
  const [adminPass, setAdminPass] = useState(adminCredentials?.password ?? '');
  const [rememberAdmin, setRememberAdmin] = useState(Boolean(adminCredentials));
  const { t, language, setLanguage } = useLanguage();

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

  const handleSaveAdmin = async () => {
    if (!adminUser || !adminPass) {
      await setAdminCredentials(null);
      setRememberAdmin(false);
      Alert.alert(t('common.ok'), t('settings.adminCleared'));
      return;
    }
    try {
      await setAdminCredentials({ username: adminUser.trim(), password: adminPass }, rememberAdmin);
      Alert.alert(t('common.ok'), t('settings.adminSaved'));
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
        <TouchableOpacity style={styles.button} onPress={handleSaveServer}>
          <Text style={styles.buttonText}>{t('settings.saveServer')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.adminTitle')}</Text>
        <Text style={styles.sectionSubtitle}>{t('settings.adminSubtitle')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('settings.adminUser')}
          autoCapitalize="none"
          value={adminUser}
          onChangeText={setAdminUser}
        />
        <TextInput
          style={styles.input}
          placeholder={t('settings.adminPass')}
          secureTextEntry
          value={adminPass}
          onChangeText={setAdminPass}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('settings.remember')}</Text>
          <Switch value={rememberAdmin} onValueChange={setRememberAdmin} />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSaveAdmin}>
          <Text style={styles.buttonText}>{t('settings.saveAdmin')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.languageTitle')}</Text>
        <Text style={styles.sectionSubtitle}>{t('settings.languageSubtitle')}</Text>
        <View style={styles.languageToggle}>
          {(['en', 'es'] as SupportedLanguage[]).map(option => {
            const isActive = language === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.languageBtn, isActive && styles.languageBtnActive]}
                onPress={() => setLanguage(option)}
              >
                <Text
                  style={[styles.languageBtnText, isActive && styles.languageBtnTextActive]}
                >
                  {option === 'en' ? t('settings.english') : t('settings.spanish')}
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#000000',
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    color: '#e6e6f2',
  },
  button: {
    backgroundColor: '#1db954',
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
  languageToggle: {
    flexDirection: 'row',
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
    padding: 4,
    gap: 4,
  },
  languageBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  languageBtnActive: {
    backgroundColor: '#1db954',
  },
  languageBtnText: {
    color: '#9090a5',
    fontWeight: '600',
  },
  languageBtnTextActive: {
    color: '#050505',
  },
});

export default SettingsScreen;
