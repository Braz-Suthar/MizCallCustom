import winston from "winston";
import { query } from "./db.js";

// Custom format for database logging
const dbFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Database transport
class DatabaseTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const { timestamp, level, message, service, metadata, hostId, userId, adminId, ipAddress } = info;

    query(
      `INSERT INTO system_logs (timestamp, level, service, message, metadata, host_id, user_id, admin_id, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        timestamp || new Date(),
        level,
        service || 'backend',
        message,
        metadata ? JSON.stringify(metadata) : null,
        hostId || null,
        userId || null,
        adminId || null,
        ipAddress || null,
      ]
    ).catch((err) => {
      console.error('[Logger] Failed to write to database:', err);
    });

    callback();
  }
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: dbFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Database transport for admin panel
    new DatabaseTransport(),
  ],
});

// Helper functions
export const logInfo = (message, service = 'backend', metadata = {}) => {
  logger.info({ message, service, metadata });
};

export const logWarn = (message, service = 'backend', metadata = {}) => {
  logger.warn({ message, service, metadata });
};

export const logError = (message, service = 'backend', metadata = {}) => {
  logger.error({ message, service, metadata });
};

export const logDebug = (message, service = 'backend', metadata = {}) => {
  logger.debug({ message, service, metadata });
};

// Log admin action
export const logAdminAction = (adminId, action, metadata = {}, ipAddress = null) => {
  logger.info({
    message: `Admin action: ${action}`,
    service: 'admin',
    adminId,
    metadata,
    ipAddress,
  });
};

// Log host action
export const logHostAction = (hostId, action, metadata = {}) => {
  logger.info({
    message: `Host action: ${action}`,
    service: 'host',
    hostId,
    metadata,
  });
};

// Log user action
export const logUserAction = (userId, action, metadata = {}) => {
  logger.info({
    message: `User action: ${action}`,
    service: 'user',
    userId,
    metadata,
  });
};

export default logger;
