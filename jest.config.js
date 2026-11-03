// Jest configuration for the Expo app (SDK 56, jest-expo preset).
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/src/**/*.test.{ts,tsx}"],
  modulePathIgnorePatterns: ["<rootDir>/tests/", "<rootDir>/functions/"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|firebase|@firebase/.*)",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/navigation/**",
    "!src/screens/**",
  ],
};