// production-socket.js
// Blueprint for PitchPulse Backend scaling with Redis Streams & Pub/Sub
import { Server } from "socket.io";
import { createClient } from "redis";

export async function setupWebSocketEngine(httpServer) {
  // Setup Socket.IO with Redis adapter for horizontal scaling across instances
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || "*" }
  });

  // Dedicated Redis clients for various operations to avoid blocking
  const redisPubSub = createClient({ url: process.env.REDIS_URL });
  const redisState = createClient({ url: process.env.REDIS_URL });
  
  await Promise.all([redisPubSub.connect(), redisState.connect()]);

  // 1. Listen for new match state injected from the core event processors
  // (e.g. from an administrative source or sports data API)
  await redisPubSub.subscribe("admin:new_ball", async (message) => {
    const data = JSON.parse(message);
    const { matchId, ballNumber } = data;
    
    // Set state in fast-cache with expiration (TTL)
    await redisState.hSet(`match:${matchId}:state`, {
      isPredicting: "true",
      ballNumber: ballNumber.toString(),
      countdown: "20"
    });
    
    // Broadcast to all clients in the match room
    io.to(`match_${matchId}`).emit("new_ball_ready", {
      ballNumber,
      countdown: 20
    });
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    socket.on("join_match", async ({ matchId }) => {
      socket.join(`match_${matchId}`);
      
      // Fetch initial state from Redis cache O(1)
      const state = await redisState.hGetAll(`match:${matchId}:state`);
      const rcbPoints = await redisState.get(`match:${matchId}:squad:RCB`) || 0;
      const cskPoints = await redisState.get(`match:${matchId}:squad:CSK`) || 0;
      
      socket.emit("match_state", {
        isPredicting: state.isPredicting === "true",
        ballNumber: state.ballNumber ? parseFloat(state.ballNumber) : 0,
        countdown: state.countdown ? parseInt(state.countdown, 10) : 0,
        squads: { RCB: parseInt(rcbPoints), CSK: parseInt(cskPoints) }
      });
    });

    // 2. High-concurrency event ingestion
    socket.on("user_prediction", async ({ matchId, squad, outcome, amount }) => {
      // Validate prediction window is still open O(1)
      const isPredicting = await redisState.hGet(`match:${matchId}:state`, "isPredicting");
      if (isPredicting !== "true") return;

      // Instead of writing to Postgres directly, stream it to Redis Streams
      // to handle the massive burst of writes asynchronously via workers
      const pipeline = redisState.multi();
      
      // Stream for durable, async ingestion into Postgres (Prisma)
      pipeline.xAdd(`match:${matchId}:predictions_stream`, "*", {
        userId: socket.data.userId || socket.id,
        squad,
        outcome,
        amount: amount.toString(),
        timestamp: Date.now().toString()
      });

      // Increment live squad points (Tug-of-War UI) atomically
      pipeline.incrBy(`match:${matchId}:squad:${squad}`, amount);
      
      await pipeline.exec();
    });

    socket.on("disconnect", () => {
      // Cleanup
    });
  });

  // Dedicated worker process loops to update all clients about Squad Points continuously
  // (Alternatively: Push updates selectively or throttle emission)
  setInterval(async () => {
    // Demo implementation for a specific active match
    const matchId = "active_match_id";
    const rcbPoints = await redisState.get(`match:${matchId}:squad:RCB`) || 0;
    const cskPoints = await redisState.get(`match:${matchId}:squad:CSK`) || 0;
    
    io.to(`match_${matchId}`).emit("squad_points_update", {
      RCB: parseInt(rcbPoints),
      CSK: parseInt(cskPoints)
    });
  }, 1000);

}
