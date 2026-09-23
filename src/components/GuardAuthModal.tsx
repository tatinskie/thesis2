import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type Props = {
  visible: boolean;
  isGuardMode: boolean;
  onClose: () => void;
  onAuthenticateSuccess: () => void;
  onDeactivateGuardMode: () => void;
};

const GUARD_PIN = '1234'; // Replace with your guard PIN

export default function GuardAuthModal({
  visible,
  isGuardMode,
  onClose,
  onAuthenticateSuccess,
  onDeactivateGuardMode,
}: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleVerifyPin = () => {
    if (pin === GUARD_PIN) {
      setPin('');
      setError('');
      onClose();
      onAuthenticateSuccess();
    } else {
      setError('Incorrect PIN. Try again.');
    }
  };

  const handleDeactivate = () => {
    setPin('');
    setError('');
    onClose();
    onDeactivateGuardMode();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {isGuardMode ? (
            /* ACTIVE GUARD MODE VIEW */
            <View style={{ alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="shield-check"
                size={48}
                color="#FF3B30"
              />
              <Text style={styles.title}>Guard Mode Active</Text>
              <Text style={styles.sub}>
                You are currently managing campus hazard paths.
              </Text>

              <TouchableOpacity
                style={styles.deactivateBtn}
                onPress={handleDeactivate}
              >
                <Text style={styles.deactivateText}>Deactivate Guard Mode</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Back to Map</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* PIN AUTHENTICATION VIEW */
            <View>
              <Text style={styles.title}>Guard Authentication</Text>
              <Text style={styles.sub}>Enter PIN to manage blocked paths</Text>

              <TextInput
                style={styles.input}
                value={pin}
                onChangeText={(text) => {
                  setPin(text);
                  setError('');
                }}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                placeholderTextColor="#8E8E93"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity style={styles.authBtn} onPress={handleVerifyPin}>
                <Text style={styles.authBtnText}>Authorize</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
    textAlign: 'center',
    marginTop: 8,
  },
  sub: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginVertical: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 14,
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 8,
    marginVertical: 12,
    fontWeight: '700',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  authBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  authBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  deactivateBtn: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  deactivateText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  cancelText: { color: '#8E8E93', fontWeight: '600', fontSize: 13 },
});