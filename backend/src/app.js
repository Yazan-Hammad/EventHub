const express = require('express');
const cors = require('cors');
const v1Routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/v1', v1Routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
