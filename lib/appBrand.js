// lib/appBrand.js
// Feste Angaben zum Betreiber der WebApp (nicht die User-Firmendaten)

export const BRAND = {
  appName: 'BuZiness',
  tagline: 'Schnell erfassen, sicher Verwalten.',
  // Logo-Datei in /public/brand-logo.png ablegen (siehe unten)
  logoPath: '/brand-logo.png',

  // Anbieterkennzeichnung (Impressum) – ANPASSEN:
  companyName: 'BuZiness Software UG (haftungsbeschränkt)',
  street: 'Musterstraße 12',
  zipCity: '12345 Musterstadt',
  country: 'Deutschland',
  email: 'support@buziness.app',
  phone: '+49 30 1234567',
  website: 'https://buziness.app',
  hrb: 'HRB 123456 (AG Musterstadt)',
  vatId: 'DE123456789',

  // Footer-Zusatz (optional)
  footerNote: '© ' + new Date().getFullYear() + ' BuZiness. Alle Rechte vorbehalten.'
};
