import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { getItem, setItem } from '@/lib/storage';

const BIOMETRIC_ENABLED_KEY = 'swf_biometric_enabled';

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await getItem(BIOMETRIC_ENABLED_KEY)) === '1';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await setItem(BIOMETRIC_ENABLED_KEY, enabled ? '1' : '0');
}

/** Returns true only on an explicit successful authentication — every
 * failure path (cancel, lockout, not enrolled, etc.) returns false so
 * callers can treat "not unlocked" uniformly without inspecting error codes. */
export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Use password instead',
    });
    return result.success;
  } catch {
    return false;
  }
}
