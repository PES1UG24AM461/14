// 404 for unknown API routes.
export function notFound(req, res) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

// Consistent JSON errors; never expose stack traces (SAD 4.3.2, 4.5).
export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
}
