import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://www.renewedmindsglobalconsult.com",
        "https://renewedmindsglobalconsult.com",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized yet");
  return io;
};