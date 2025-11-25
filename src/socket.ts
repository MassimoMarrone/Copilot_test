import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: (_origin, callback) => {
        callback(null, true);
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("New socket connection:", socket.id);

    socket.on("join_user_room", (userId: string) => {
      console.log(`Socket ${socket.id} joining user room: user_${userId}`);
      socket.join(`user_${userId}`);
    });

    socket.on("join_booking", (bookingId: string) => {
      console.log(`Socket ${socket.id} joining booking room: ${bookingId}`);
      socket.join(bookingId);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
