const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
