// Native glue for the Android/iOS builds (Capacitor). Every call is a no-op in a plain browser.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const isNative = Capacitor.isNativePlatform();

// Called once the game has rendered its first frame
export async function initNative() {
  if (!isNative) return;
  try { await StatusBar.hide(); } catch (e) {}
  try { await SplashScreen.hide({ fadeOutDuration: 300 }); } catch (e) {}
}

// Vibration: the haptics engine on a device, navigator.vibrate on the web
export function vibrate(ms) {
  if (!isNative) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} return; }
  try {
    const style = ms >= 100 ? ImpactStyle.Heavy : ms >= 40 ? ImpactStyle.Medium : ImpactStyle.Light;
    Haptics.impact({ style: style });
  } catch (e) {}
}
