import crypto from "crypto";

/**
 * Structured request logging and correlation ID middleware.
 * Attaches X-Request-Id to every request and logs method, route, status code, and latency.
 * Strictly avoids logging authorization headers, tokens, passwords, or PII.
 */
export const requestLogger = (req, res, next) => {
  // Generate or forward standard request correlation ID
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);

  const startHrTime = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsedHrTime = process.hrtime.bigint() - startHrTime;
    const durationMs = (Number(elapsedHrTime) / 1e6).toFixed(2);

    const clientIp = req.ip || req.socket?.remoteAddress || "-";
    const statusCode = res.statusCode;
    const method = req.method;
    const path = req.originalUrl || req.url;

    // Suppress verbose logging for internal health probes during testing unless degraded
    if ((path === "/health" || path === "/ready" || path === "/api/health" || path === "/api/ready") && statusCode < 400) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      method,
      path: path.split("?")[0], // exclude sensitive query strings from logs
      statusCode,
      durationMs: `${durationMs}ms`,
      clientIp: clientIp.replace(/^::ffff:/, "")
    };

    if (statusCode >= 500) {
      console.error(`[ERROR] [${logEntry.requestId}] ${logEntry.method} ${logEntry.path} ${logEntry.statusCode} - ${logEntry.durationMs}`);
    } else if (statusCode >= 400) {
      console.warn(`[WARN]  [${logEntry.requestId}] ${logEntry.method} ${logEntry.path} ${logEntry.statusCode} - ${logEntry.durationMs}`);
    } else {
      console.log(`[INFO]  [${logEntry.requestId}] ${logEntry.method} ${logEntry.path} ${logEntry.statusCode} - ${logEntry.durationMs}`);
    }
  });

  next();
};

export default requestLogger;

