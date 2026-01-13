import promClient from "prom-client";

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics for MizCall
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const activeCallsGauge = new promClient.Gauge({
  name: 'mizcall_active_calls_total',
  help: 'Total number of active calls',
  registers: [register],
});

const totalHostsGauge = new promClient.Gauge({
  name: 'mizcall_total_hosts',
  help: 'Total number of registered hosts',
  registers: [register],
});

const totalUsersGauge = new promClient.Gauge({
  name: 'mizcall_total_users',
  help: 'Total number of users',
  registers: [register],
});

const activeUsersGauge = new promClient.Gauge({
  name: 'mizcall_active_users',
  help: 'Total number of active users',
  registers: [register],
});

const totalCallsCounter = new promClient.Counter({
  name: 'mizcall_total_calls',
  help: 'Total number of calls made',
  registers: [register],
});

const failedLoginsCounter = new promClient.Counter({
  name: 'mizcall_failed_logins_total',
  help: 'Total number of failed login attempts',
  labelNames: ['role'],
  registers: [register],
});

// Middleware to track HTTP request duration
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
};

// Update metrics from database
export const updateMetrics = async (queryFn) => {
  try {
    // Active calls
    const activeCalls = await queryFn("SELECT COUNT(*) FROM rooms WHERE status = 'started'");
    activeCallsGauge.set(parseInt(activeCalls.rows[0].count));

    // Total hosts
    const totalHosts = await queryFn("SELECT COUNT(*) FROM hosts");
    totalHostsGauge.set(parseInt(totalHosts.rows[0].count));

    // Total users
    const totalUsers = await queryFn("SELECT COUNT(*) FROM users");
    totalUsersGauge.set(parseInt(totalUsers.rows[0].count));

    // Active users
    const activeUsers = await queryFn("SELECT COUNT(*) FROM users WHERE enabled = true");
    activeUsersGauge.set(parseInt(activeUsers.rows[0].count));
  } catch (error) {
    console.error('[Metrics] Failed to update:', error);
  }
};

export { 
  register, 
  httpRequestDuration, 
  activeCallsGauge, 
  totalHostsGauge, 
  totalUsersGauge,
  activeUsersGauge,
  totalCallsCounter,
  failedLoginsCounter,
};
