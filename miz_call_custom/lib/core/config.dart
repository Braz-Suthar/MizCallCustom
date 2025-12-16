// Network endpoints used by the client.
// Override via --dart-define when needed.
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

const String defaultWsUrl = String.fromEnvironment(
  'WS_URL',
  defaultValue: 'ws://10.0.2.2:3000/ws',
);

