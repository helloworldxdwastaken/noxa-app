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

import { useAuth } from '../../context/AuthContext';

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

  const handleSaveServer = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid server address.');
      return;
    }
    try {
      await updateServerUrl(serverUrl.trim());
      Alert.alert('Success', 'Server URL updated.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update server URL';
      Alert.alert('Error', message);
    }
  };

  const handleSaveAdmin = async () => {
    if (!adminUser || !adminPass) {
      await setAdminCredentials(null);
      setRememberAdmin(false);
      Alert.alert('Admin cleared', 'Admin credentials removed.');
      return;
    }
    try {
      await setAdminCredentials({ username: adminUser.trim(), password: adminPass }, rememberAdmin);
      Alert.alert('Saved', 'Admin credentials updated.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to store admin credentials';
      Alert.alert('Error', message);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server</Text>
        <Text style={styles.sectionSubtitle}>Point the app to your Noxa Music backend.</Text>
        <TextInput
          style={styles.input}
          placeholder="https://stream.noxamusic.com"
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.button} onPress={handleSaveServer}>
          <Text style={styles.buttonText}>Save Server URL</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Console</Text>
        <Text style={styles.sectionSubtitle}>
          Store credentials to unlock admin-only actions from the app.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Admin username"
          autoCapitalize="none"
          value={adminUser}
          onChangeText={setAdminUser}
        />
        <TextInput
          style={styles.input}
          placeholder="Admin password"
          secureTextEntry
          value={adminPass}
          onChangeText={setAdminPass}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Remember on this device</Text>
          <Switch value={rememberAdmin} onValueChange={setRememberAdmin} />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSaveAdmin}>
          <Text style={styles.buttonText}>Save Admin Credentials</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleLogout}>
          <Text style={styles.buttonText}>Sign Out</Text>
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
});

export default SettingsScreen;
