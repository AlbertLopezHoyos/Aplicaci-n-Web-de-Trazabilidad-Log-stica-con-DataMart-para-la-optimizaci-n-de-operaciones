const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
