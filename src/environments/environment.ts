// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // Gemini API Configuration
  // Get your API key from: https://makersuite.google.com/app/apikey
  gemini: {
    apiKey: 'YOUR_GEMINI_API_KEY_HERE'
  },
  // Supabase Configuration
  // Get your credentials from: https://supabase.com/dashboard/project/_/settings/api
  supabase: {
    url: 'https://qmspsfsqseizmheghldd.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtc3BzZnNxc2Vpem1oZWdobGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTQ3NDEsImV4cCI6MjA4Njc5MDc0MX0.zrrZKlz3TX4h-TK4DGbVnkXMOgMxVM_ApqaE4JPny34'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
