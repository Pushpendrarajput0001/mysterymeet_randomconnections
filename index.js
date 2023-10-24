const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const APP_ID = '597485051f49479da36b3d1b61abb99f';
const APP_CERTIFICATE = '642f32f94e674cad98496e01c1a4198e';
const expirationTimeInSeconds = 3600;

const connectedUsers = [];

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.get('/pairing-info', (req, res) => {
  // Here, you can generate the pairing information and send it as a JSON response.
  const channelName = generateUniqueChannelName();
  const uid = Math.floor(Math.random() * 1000000);
  const token = generateAgoraToken(uid, channelName, RtcRole.PUBLISHER);
  res.json({ channelName, uid, token });
});


io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Generate a unique UID for the user
  const uid = Math.floor(Math.random() * 1000000);

  // Notify the user about their UID
  socket.emit('uid', uid);

  // Store the user with their socket
  connectedUsers.push({ uid, socket });

  // Pair users when there are at least two connected
  if (connectedUsers.length >= 2) {
    const user1 = connectedUsers[0];
    const user2 = connectedUsers[1];

    // Generate a unique channel name
    const channelName = generateUniqueChannelName();

    const token1 = generateAgoraToken(user1.uid, channelName, RtcRole.PUBLISHER);
    const token2 = generateAgoraToken(user2.uid, channelName, RtcRole.PUBLISHER);

    user1.socket.emit('pair', { channelName, token: token1 });
    user2.socket.emit('pair', { channelName, token: token2 });

    // Remove paired users
    connectedUsers.splice(0, 2);
  }

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    connectedUsers = connectedUsers.filter(user => user.socket !== socket);
  });
});

function generateAgoraToken(uid, channelName, role) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  return RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );
}

function generateUniqueChannelName() {
  return 'channel_' + Math.random().toString(36).substring(7);
}

const port = process.env.PORT || 3000;

server.listen(3000, '192.168.29.149', () => {
  console.log(`Server is running on http://192.168.29.149:3000`);
});

