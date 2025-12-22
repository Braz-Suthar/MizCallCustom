// Network endpoints used by the client.
// Override via --dart-define when needed.
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://custom.mizcall.com',
);

const String defaultWsUrl = String.fromEnvironment(
  'WS_URL',
  defaultValue: 'wss://custom.mizcall.com/ws',
);

