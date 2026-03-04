export function notFoundHandler(_req, res) {
  res.status(404).json({ message: "Route not found" });
}

export function errorHandler(err, _req, res, _next) {
  const status = typeof err.status === "number" ? err.status : 500;
  const message = err.message || "Internal Server Error";

  if (status >= 500) {
    // Keep internals out of API responses while logging for observability.
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({ message });
}

