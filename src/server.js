const express = require('express');
const bodyParser = require('body-parser');
const viewEngine = require('./config/viewEngine');
const connectDB = require('./config/connectDB');

const baiviet = require('./routes/baivietRouter'); 
const userRoutes = require('./routes/user');
const uploadRouter = require('./routes/uploadRouter');
const uploadAudio = require('./routes/uploadAudio');
const uploadVideo = require('./routes/uploadVideo');
const wordRouter = require('./routes/word');
const aiSuggestRouter = require('./routes/aiSuggest');
const tiktokRouter = require('./routes/tiktokRouter');
const imageRoutes = require('./routes/imageRoutes');
const shortUrlRoutes  = require('./routes/shortUrlRoutes');
const auth_Routes = require('./routes/auth.routes');
const thongBaoRoutes  = require('./routes/thongBaoRoutes');
const fileRouter  = require('./routes/fileRouter');
const findOrCreate  = require('./routes/findOrCreate');

const cors = require('cors');
const path = require('path');
const cleanUploads = require('./utils/cleanUploads');
const cron = require('node-cron');
const { startCrawler } = require('./services/Crawler/crawlerService');

require("dotenv").config();


let app = express();
let port = process.env.PORT || 6969;

connectDB();

// Cài đặt CORS
const allowedOrigins = [
    'http://localhost:3070',     
    'https://dantri24h.com',  
    'http://localhost:3010',     
    'https://ktquiz.com',
    'https://tinhay.vercel.app',
    'https://tinhay-admin.vercel.app'
];

app.use(cors({
    origin: true,
    credentials: true,    
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'upload-type'],
}));
app.options('*', cors());
app.set('trust proxy', true);

const cookieParser = require('cookie-parser');
const multer = require('multer');
app.use(cookieParser());



// Config bodyParser
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

// Đặt thư mục public/uploads làm public để có thể truy cập
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// Config app
viewEngine(app);

const routes = [  
    { path: '/api/bai-viet', router: baiviet },
    { path: '/api/user', router: userRoutes },
    { path: '/api/upload', router: uploadRouter },
    { path: '/api/audio', router: uploadAudio },
    { path: '/api/video', router: uploadVideo },
    { path: '/api/word', router: wordRouter },
    { path: '/api/chatgpt', router: aiSuggestRouter },
    { path: '/api/auth', router: auth_Routes },
    { path: '/api/tiktok', router: tiktokRouter },
    { path: '/api/images', router: imageRoutes },
    { path: '/api/url', router: shortUrlRoutes  },
    { path: '/api/thongbao', router: thongBaoRoutes  },
    { path: '/api/convert', router: fileRouter  },
    { path: '/api/nguoi-dung', router: findOrCreate  },
    { path: '/api/crawler', router: require('./routes/crawlerRouter') },
];
  
routes.forEach(route => app.use(route.path, route.router));

// Route public redirect (ngoài API)
app.use("/s", shortUrlRoutes);

// Sử dụng uploadRouter
app.use("/api/upload", uploadRouter); // Đặt đường dẫn cho upload

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// Lịch cron: Quét tin tự động (mặc định 6 tiếng 1 lần)
cron.schedule("0 */6 * * *", () => {
    console.log("🤖 Đang bắt đầu quét tin tự động...");
    startCrawler();
});

// Lịch cron: "*/5 * * * *" = 5 phút 1 lần
// cron.schedule("*/10 * * * *", () => {
//   console.log("🧹 Đang dọn thư mục uploads...");
//   cleanUploads();
// });

app.listen(port, "0.0.0.0" ,() => {
    console.log("backend nodejs is running on the port:", port, `\n http://localhost:${port}`);
});
