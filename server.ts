import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  // Mocking Redis state with an in-memory map for the prototype
  // In production, we'd use 'redis.createClient()'
  const matchState = {
    isPredicting: false,
    ballNumber: 1.1,
    countdown: 0,
    squads: {
      "RCB": 0,
      "CSK": 0
    }
  };

  const predictions = new Map();

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    // Send initial state
    socket.emit("match_state", matchState);
    
    // Accept prediction
    socket.on("user_prediction", ({ squad, outcome, amount }) => {
      if (!matchState.isPredicting) return;
      
      predictions.set(socket.id, { squad, outcome, amount });
      
      // Update real-time tug-of-war for the squad
      matchState.squads[squad] = (matchState.squads[squad] || 0) + amount;
      
      io.emit("squad_points_update", matchState.squads);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // Admin webhook to simulate a new ball being bowled
  app.post("/api/admin/next-ball", (req, res) => {
    matchState.isPredicting = true;
    matchState.countdown = 20;
    matchState.ballNumber = +(matchState.ballNumber + 0.1).toFixed(1);
    
    // Broadcast prediction window opens
    io.emit("new_ball_ready", {
      ballNumber: matchState.ballNumber,
      countdown: 20
    });

    // Simulate countdown
    const timer = setInterval(() => {
      matchState.countdown--;
      io.emit("countdown_tick", matchState.countdown);
      
      if (matchState.countdown <= 0) {
        clearInterval(timer);
        matchState.isPredicting = false;
        
        // Pick a random outcome for the demo
        const outcomes = ["DOT", "SINGLE", "BOUNDARY", "WICKET"];
        const actual = outcomes[Math.floor(Math.random() * outcomes.length)];
        
        // Payout evaluation could go here
        predictions.clear();
        
        io.emit("ball_result", { actual });
      }
    }, 1000);

    res.json({ success: true, message: "Started next ball prediction window" });
  });

  // API router
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
