require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const { initDb } = require('./database');
const videoRoutes = require('./routes/videoRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Thiết lập view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Khởi tạo database
initDb();

// Routes
app.use('/', videoRoutes);

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
}); 