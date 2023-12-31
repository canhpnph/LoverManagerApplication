require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser')
var session = require('express-session');
const { createServer } = require("http");
const { Server } = require("socket.io");



var indexRouter = require('./routes/index');
// var loverRouter = require('./routes/lover');
// var userRouter = require('./routes/user');
var apiRouter = require('./routes/api');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });

const loggedInDevices = {};
// Lưu trữ danh sách các mã token FCM đã đăng nhập
const loggedInTokens = new Set();

io.on("connection", (socket) => {
  console.log("User connected to socket.io in http://localhost:3001/");

  socket.on("connect user", function (user) {
    console.log("Connected user : " + user);
    io.emit('connect user', user);
  })

  socket.on('on typing', function (typing) {
    console.log("Typing.... ");
    io.emit('on typing', typing);
  });

  socket.on('chat message', function (msg) {
    console.log("Message " + msg['message']);
    io.emit('chat message', msg);
  });

  socket.on('loginSuccess', function (user) {
    const { _id, tokenFCM } = user;

    const existingDevice = loggedInDevices[_id];
    if (existingDevice && existingDevice !== tokenFCM) {
      // Gửi thông báo tới thiết bị đang đăng nhập trước đó để đăng xuất
      socket.broadcast.to(existingDevice).emit('logout', { message: 'Tài khoản của bạn vừa mới đăng nhập ở điện thoại khác' });
    }

    loggedInDevices[_id] = tokenFCM;
    socket.join(tokenFCM);

  });

  socket.on('disconnect', function () {
    // Tìm và xóa thông tin người dùng khi client ngắt kết nối
    for (const [_id, deviceToken] of Object.entries(loggedInDevices)) {
      if (deviceToken === socket.id) {
        delete loggedInDevices[_id];
        break;
      }
    }
  });

});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//sesison đặt trước router
app.set('trust proxy', 1) // trust first proxy

app.use(session({
  secret: process.env.KEY_SESSION, // chuỗi ký tự đặc biệt để Session mã hóa, tự viết
  resave: false,
  saveUninitialized: false
}));

app.use('/', indexRouter);
app.use('/api', apiRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);

  if (req.originalUrl.indexOf('/api') == 0) {
    res.json({
      message: err.message
    });
  } else {
    res.render('error');
  }

  res.render('error');
});


httpServer.listen(3001);


module.exports = app;
