export const DOWNLOAD_LINKS = {
  android: import.meta.env.VITE_ANDROID_STORE_URL || 'https://play.google.com/store',
  ios: import.meta.env.VITE_IOS_STORE_URL || 'https://apps.apple.com',
  windows: import.meta.env.VITE_WINDOWS_DOWNLOAD_URL || '#descargas-windows',
}
