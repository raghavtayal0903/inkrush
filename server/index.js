import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3001;

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (request, response) => {
  response.json({ status: "ok" });
});

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on("join-room", ({ roomCode, playerName }, acknowledge) => {
    const safeRoomCode = roomCode?.trim().toUpperCase();
    const safePlayerName = playerName?.trim();

    if (!safeRoomCode || !safePlayerName) {
      acknowledge?.({ error: "A room code and player name are required." });
      return;
    }

    const players = rooms.get(safeRoomCode) ?? [];
    const player = { id: socket.id, name: safePlayerName, score: 0 };

    rooms.set(safeRoomCode, [...players, player]);
    socket.join(safeRoomCode);
    socket.data.roomCode = safeRoomCode;

    io.to(safeRoomCode).emit("room-updated", rooms.get(safeRoomCode));
    acknowledge?.({ roomCode: safeRoomCode, player });
  });

  socket.on("disconnect", () => {
    const { roomCode } = socket.data;

    if (roomCode) {
      const remainingPlayers = (rooms.get(roomCode) ?? []).filter(
        (player) => player.id !== socket.id,
      );

      if (remainingPlayers.length === 0) {
        rooms.delete(roomCode);
      } else {
        rooms.set(roomCode, remainingPlayers);
        io.to(roomCode).emit("room-updated", remainingPlayers);
      }
    }

    console.log(`Player disconnected: ${socket.id}`);
  });
});

httpServer.listen(port, () => {
  console.log(`INKrush server is running on http://localhost:${port}`);
});
