module.exports = {
  input: ['src/**/*.{js,jsx}'], // Path to your source files
  output: './public/locales/$LOCALE/translation.json', // Path to your translation files
  options: {
    debug: true,  // Enable debug messages
    func: {
      list: ['t', 'i18n.t'], // These are the translation function names
      extensions: ['.js', '.jsx'], // Extensions to scan
    },
    lngs: ['en', 'fr', 'es'], // Languages you want to support
    defaultLng: 'en',  // Default language
    resource: {
      en: './public/locales/en/translation.json',
      fr: './public/locales/fr/translation.json',
      es: './public/locales/es/translation.json',
    },
    ns: ['translation'], // Namespace for your translations
    defaultNs: 'translation',
    keySeparator: false,  // If you don't use nested keys, set this to false
    saveMissing: true, // Save missing translations
    jsonIndent: 2, // Indentation level for the JSON files
    useKeysAsDefaultValue: true, // Use the keys as default translation values
  },
};
