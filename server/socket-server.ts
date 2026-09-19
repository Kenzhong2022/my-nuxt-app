import 'dotenv/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomUUID } from 'node:crypto';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket';

// ---------- 从环境变量读端口 ----------
const PORT = Number(process.env.SOCKET_PORT) || 5555;
const CORS_ORIGIN = process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000';

const httpServer = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    credentials: true,
  },
});

// ---------- 连接逻辑 ----------
io.on('connection', (socket) => {
  console.log('[Server] connected:', socket.id);

  // 广播：有新用户加入
  io.emit('user-joined', {
    id: socket.id,
    name: `用户-${socket.id.slice(0, 4)}`,
  });

  // 收到消息 → 广播给所有人
  socket.on('send-message', (data) => {
    const msg = {
      id: randomUUID(),
      userId: socket.id,
      text: data.text,
      timestamp: Date.now(),
    };
    io.emit('new-message', msg);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Server] disconnected:', socket.id, reason);
  });
});

// ---------- 启动 ----------
httpServer.listen(PORT, () => {
  console.log(`[Socket] server running at http://localhost:${PORT}`);
  console.log(`[Socket] CORS origin: ${CORS_ORIGIN}`);
});
