// Wraps an async route handler so rejected promises reach errorHandler via next().
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
