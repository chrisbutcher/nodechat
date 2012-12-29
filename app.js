// Chat message color values
var chat_colors = [
  '#BF381A',
  '#E9AF32',
  '#006666',
  '#006699',
  '#DF7782',
  '#E95D22',
  '#613D2D'
];

var lastColor;

// Initialize and congigure express / socket.io
var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , path = require('path');

var app = express()
  , nodeserver = require('http');
 
app.configure(function(){
  app.set('port', process.env.PORT || 1337);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);

server = nodeserver.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

io = require('socket.io').listen(server);

// Listen for connections, and handle them
io.sockets.on('connection', function (socket) {
  // By default, all users in the default room
  socket.join('default_room');

  var usersInRoom = '';

  // Collect names of all users when initially connecting
  for (var socketId in io.sockets.sockets) {
    io.sockets.sockets[socketId].get('nickname', function(err, nickname) {
        if (nickname != null){
          console.log('In channel: ' + nickname);
          usersInRoom += nickname + ', ';
        }
    });
  }

  // And emit it to the user who just joined
  if (usersInRoom.trim() != '') {
    usersInRoom = usersInRoom.substring(0, usersInRoom.length - 2)
    socket.emit('server_response', {
      message: 'Users in room: ' + usersInRoom, timestamp: getFormattedDate() });
  }

  // When a user first connects, store their nickname and assign them a text color
  socket.on('set user_data', function (user_data) {
      var new_user_color = new_color();

      socket.set('user_color', new_user_color);

      socket.set('nickname', user_data.user_name, function () {
        console.log(user_data.user_name + ' has logged in');

        io.sockets.in('default_room').emit('server_notice', { message:
          '<span class="badge badge-success">' + user_data.user_name +
            ' has logged in</span>', timestamp: getFormattedDate() });
    });
  });

  // Handle chat messages
  socket.on('chat_message', function (message_data) {     
    var user_color = '#000';
    var nickname = 'user';

    socket.get('user_color', function (err, col) {
      user_color = col;
    });   

    socket.get('nickname', function (err, nick) {
      nickname = nick;
    });

    console.log('Chat message by ' + nickname + ": " + message_data.message);

    io.sockets.in('default_room').emit('server_chat', {
      message: '<span style="color: ' + user_color + '"><b>&lt;' + nickname +
        '&gt;</b> ' + stripHtml(message_data.message) + '</span>', timestamp: getFormattedDate(),
        message_from: nickname });
  });

  // Handle users disconnecting
  socket.on('disconnect', function() {         
    io.sockets.sockets[socket.id].get('nickname', function(err, nickname) {
      if (nickname != null) {
        io.sockets.in('default_room').emit('server_notice', { message:
          '<span class="badge badge-important">' + nickname +
            ' has logged out</span>', timestamp: getFormattedDate() });
        console.log(nickname + ' (socket ID: ' + socket.id + ') disconnected');
      }
    });
  });
});

// Return a nicely formatted date + time
function getFormattedDate() {
    var date = new Date();
    var str = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() +
      ' ' +  date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
    return str;
}

// Return a color that wasn't just used
// TODO: Pick least recently used color,
// or generate random colors within parameters of readability
function new_color() {
  var color = Math.floor(Math.random() * chat_colors.length);  
  while (lastColor === color) {
    color = Math.floor(Math.random() * chat_colors.length);
  }
  lastColor = color;
  return chat_colors[color];
}

// Strip any HTML tags from chat messages
function stripHtml(html) {
  return html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}