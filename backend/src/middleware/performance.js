import { query } from "../services/db.js";

export const performanceMiddleware = (req, res, next) => {
  const start = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to track response time
  res.end = function(...args) {
    const duration = Date.now() - start;
    
    // Save to database (async, don't block response)
    const endpoint = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    
    // Only track API endpoints (not static files)
    if (endpoint && !endpoint.startsWith('/uploads') && !endpoint.startsWith('/public')) {
      query(
        `INSERT INTO api_performance_metrics (endpoint, method, duration_ms, status_code)
         VALUES ($1, $2, $3, $4)`,
        [endpoint, method, duration, statusCode]
      ).catch(err => {
        console.error('[Performance] Failed to save metric:', err);
      });
    }

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
};
