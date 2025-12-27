import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import cookie from "cookie";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

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

  // JWT Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      // Try to get token from handshake auth
      let token = socket.handshake.auth?.token;

      // If not in auth, try cookies
      if (!token && socket.handshake.headers.cookie) {
        const cookies = cookie.parse(socket.handshake.headers.cookie);
        token = cookies.token;
      }

      if (!token) {
        console.log("Socket connection rejected: No token provided");
        return next(new Error("Authentication required"));
      }

      // Verify JWT
      const payload = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
      };

      // Attach user info to socket
      socket.userId = payload.id;
      socket.userEmail = payload.email;

      console.log(`Socket authenticated for user: ${payload.email}`);
      next();
    } catch (error) {
      console.log("Socket connection rejected: Invalid token");
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(
      `New socket connection: ${socket.id} (user: ${socket.userEmail})`
    );

    // Auto-join user's personal room
    if (socket.userId) {
      socket.join(`user_${socket.userId}`);
      console.log(`Socket ${socket.id} auto-joined room: user_${socket.userId}`);
    }

    // Validate that user can only join their own room
    socket.on("join_user_room", (userId: string) => {
      if (userId !== socket.userId) {
        console.log(
          `Socket ${socket.id} blocked from joining unauthorized room: user_${userId}`
        );
        return;
      }
      socket.join(`user_${userId}`);
    });

    socket.on("join_booking", (bookingId: string) => {
      // Note: Could add validation here to check if user has access to this booking
      console.log(`Socket ${socket.id} joining booking room: ${bookingId}`);
      socket.join(bookingId);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id} (user: ${socket.userEmail})`);
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
