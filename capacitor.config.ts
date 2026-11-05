import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grobaltech.tidori',
  appName: 'Tidori Ministries',
  webDir: 'dist',
  server: {
    // The Android app always loads the live Tidori website and its current sections.
    url: 'https://tidori-ministries.grobaltechtechnologies.workers.dev',
    cleartext: false,
    allowNavigation: [
      'tidori-ministries.grobaltechtechnologies.workers.dev',
      '*.supabase.co',
      'pay.pesapal.com',
    ],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
