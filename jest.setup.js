// Jest global setup: mock native modules that cannot initialize in the test
// environment so component tests can import feature components safely.

jest.mock("expo-video", () => ({
  useVideoPlayer: () => ({}),
  VideoView: () => null,
}));

jest.mock("expo-glass-effect", () => ({
  GlassView: () => null,
  isGlassEffectAPIAvailable: () => false,
}));

jest.mock("expo-blur", () => ({
  BlurView: () => null,
}));