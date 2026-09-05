/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Qo'lda WebSocket auth tekshiruvi (docs/ROADMAP.md STEP-06).
 *
 *   BASE=http://localhost:3000 TOKEN=<access token> USER_ID=<own user id> node test/manual/ws.js
 *
 * Kutiladi:
 *   no token   → connect_error:UNAUTHORIZED (middleware ulanishni rad etadi)
 *   bad token  → connect_error:UNAUTHORIZED
 *   good token → connected, so'ng o'ziga yuborilgan xabar `receiveMessage` bilan qaytadi
 *   invalid payload → exception:[validatsiya xabarlari]
 */
const { io } = require('socket.io-client');

const base = process.env.BASE ?? 'http://localhost:3000';

function connect(auth, onConnected) {
  return new Promise((resolve) => {
    const socket = io(base, {
      auth,
      transports: ['websocket'],
      reconnection: false,
      timeout: 3000,
    });
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      socket.close();
      resolve(result);
    };
    socket.on('exception', (e) => done(`exception:${e.code ?? JSON.stringify(e)}`));
    socket.on('disconnect', (reason) => done(`disconnected:${reason}`));
    socket.on('connect_error', (e) => done(`connect_error:${e.message}`));
    socket.on('connect', () => {
      if (onConnected) {
        onConnected(socket, done);
      } else {
        setTimeout(() => done('connected'), 500);
      }
    });
    setTimeout(() => done('timeout'), 5000);
  });
}

(async () => {
  console.log('no token   ->', await connect({}));
  console.log('bad token  ->', await connect({ token: 'garbage.token.value' }));

  if (process.env.TOKEN && process.env.USER_ID) {
    const result = await connect({ token: process.env.TOKEN }, (socket, done) => {
      socket.on('receiveMessage', (msg) =>
        done(`connected+receiveMessage:${msg.content} sender=${msg.senderId === process.env.USER_ID ? 'me' : 'OTHER'}`),
      );
      socket.emit(
        'sendMessage',
        { receiverId: process.env.USER_ID, content: 'ping', senderId: 'spoofed-id' },
        (ack) => console.log('ack        ->', ack && ack.id ? 'message id ' + ack.id : JSON.stringify(ack)),
      );
    });
    console.log('good token ->', result);

    const invalid = await connect({ token: process.env.TOKEN }, (socket, done) => {
      socket.emit('sendMessage', { receiverId: 'not-a-uuid', content: '' }, (ack) => done(`ack:${JSON.stringify(ack)}`));
      socket.on('exception', (e) => done(`exception:${JSON.stringify(e).slice(0, 120)}`));
    });
    console.log('invalid payload ->', invalid);
  } else {
    console.log('(TOKEN/USER_ID berilmadi — good-token testi o\'tkazib yuborildi)');
  }
})();
