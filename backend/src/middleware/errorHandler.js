function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate entry' });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid id: ${err.value}` });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = { notFoundHandler, errorHandler };
