const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token'); // Install 'agora-access-token' if not already done

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const APP_ID = '597485051f49479da36b3d1b61abb99f'; // Replace with your Agora App ID
const APP_CERTIFICATE = '642f32f94e674cad98496e01c1a4198e'; // Replace with your Agora App Certificate
const expirationTimeInSeconds = 3600;

const connectedUsers = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Generate a unique UID for the user
  const uid = Math.floor(Math.random() * 1000000);
  connectedUsers[socket.id] = { uid, socket };

  // Notify the user about their UID
  socket.emit('uid', uid);

  // Pair users when there are at least two connected
  if (Object.keys(connectedUsers).length >= 2) {
    const users = Object.values(connectedUsers);
    const user1 = users[0];
    const user2 = users[1];

    // Generate a unique channel name
    const channelName = generateUniqueChannelName();

    const token1 = generateAgoraToken(user1.uid, channelName, RtcRole.PUBLISHER);
    const token2 = generateAgoraToken(user2.uid, channelName, RtcRole.PUBLISHER);

    user1.socket.emit('pair', { channelName, token: token1 });
    user2.socket.emit('pair', { channelName, token: token2 });

    // Remove paired users
    delete connectedUsers[user1.socket.id];
    delete connectedUsers[user2.socket.id];
  }

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete connectedUsers[socket.id];
  });
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
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
