import cluster from "cluster";
import os from "os";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";

const numCPUs = os.cpus().length;
const PORT = 3000;

if (cluster.isPrimary) {
  console.log(`[Primary] Process ${process.pid} is running`);
  console.log(`[Primary] Scaling up horizontally. Forking to ${numCPUs} CPU cores...`);

  // Shared Master State (Simulating Central Redis Store)
  const matchState = {
    isPredicting: false,
    ballNumber: 5.4,
    countdown: 0,
    squads: { "RCB": 0, "KKR": 0 },
    liveScore: { team: "RCB", runs: 45, wickets: 0 }
  };

  let predictionBuffer: any[] = [];

  // Cron Job: Batch insert predictions every 5 seconds
  setInterval(() => {
    if (predictionBuffer.length > 0) {
      console.log(`[Primary Cron] Bulk inserting ${predictionBuffer.length} predictions into Postgres...`);
      predictionBuffer = [];
    }
  }, 5000);

  // Auto live engine: triggers a ball every 30 seconds
  function triggerNextBall() {
    if (matchState.isPredicting) return;
    
    matchState.isPredicting = true;
    matchState.countdown = 20;
    
    let nextBall = +(matchState.ballNumber + 0.1).toFixed(1);
    if ((nextBall * 10) % 10 >= 6) {
      nextBall = Math.floor(nextBall) + 1.0;
    }
    matchState.ballNumber = nextBall;
    
    // Broadcast message to all workers
    for (const id in cluster.workers) {
      cluster.workers[id]?.send({ 
        type: "broadcast", 
        event: "new_ball_ready", 
        data: { ballNumber: matchState.ballNumber, countdown: 20 } 
      });
    }

    const timer = setInterval(() => {
      matchState.countdown--;
      for (const id in cluster.workers) {
        cluster.workers[id]?.send({ type: "broadcast", event: "countdown_tick", data: matchState.countdown });
      }
      
      if (matchState.countdown <= 0) {
        clearInterval(timer);
        matchState.isPredicting = false;
        
        const outcomes = ["DOT", "SINGLE", "BOUNDARY", "WICKET"];
        const actual = outcomes[Math.floor(Math.random() * outcomes.length)];
        
        if (actual === "SINGLE") matchState.liveScore.runs += 1;
        else if (actual === "BOUNDARY") matchState.liveScore.runs += 4;
        else if (actual === "WICKET") matchState.liveScore.wickets += 1;

        if (actual === "BOUNDARY" || actual === "WICKET") {
          console.log(`[PubSub] Broadcasting match event to all connected instances: ${actual}`);
          for (const id in cluster.workers) {
            cluster.workers[id]?.send({ type: "broadcast", event: "match_event_pubsub", data: { type: actual } });
          }
        }
        
        for (const id in cluster.workers) {
          cluster.workers[id]?.send({ 
            type: "broadcast", 
            event: "ball_result", 
            data: { actual, liveScore: matchState.liveScore } 
          });
        }
      }
    }, 1000);
  }

  setInterval(() => {
    if (!matchState.isPredicting) {
      triggerNextBall();
    }
  }, 30000);

  // IPC Message Broker
  const handleWorkerMessage = (msg: any) => {
    if (msg.type === "trigger_next_ball") {
      triggerNextBall();
    } else if (msg.type === "user_prediction") {
      const { socketId, squad, outcome, amount } = msg.data;
      if (!matchState.isPredicting) return;
      
      predictionBuffer.push({ socketId, squad, outcome, amount, timestamp: Date.now() });
      matchState.squads[squad as keyof typeof matchState.squads] = (matchState.squads[squad as keyof typeof matchState.squads] || 0) + amount;
      
      // Sync squads to all workers
      for (const id in cluster.workers) {
        cluster.workers[id]?.send({ 
          type: "broadcast", 
          event: "squad_points_update", 
          data: matchState.squads 
        });
      }
    } else if (msg.type === "get_initial_state" && msg.workerId) {
      cluster.workers[msg.workerId]?.send({
        type: "initial_state",
        data: matchState
      });
    }
  };

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    worker.on("message", handleWorkerMessage);
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`[Primary] Worker ${worker.process.pid} died. Forking replacement...`);
    const newWorker = cluster.fork();
    newWorker.on("message", handleWorkerMessage);
  });

} else {
  // Worker Process
  async function startWorker() {
    const app = express();
    const httpServer = createServer(app);
    // Enforcing websocket to avoid sticky session requirement for clustering
    const io = new Server(httpServer, {
      cors: { origin: "*" },
      transports: ["websocket"]
    });

    let currentMatchState: any = null;

    // Listen to IPC from Primary
    process.on("message", (msg: any) => {
      if (msg.type === "broadcast") {
        io.emit(msg.event, msg.data);
      } else if (msg.type === "initial_state") {
        currentMatchState = msg.data;
      }
    });

    // Request initial state on worker start
    if (cluster.worker) {
      process.send?.({ type: "get_initial_state", workerId: cluster.worker.id });
    }

    io.on("connection", (socket) => {
      // Small timeout to allow state to sync if not already present
      setTimeout(() => {
        if (currentMatchState) {
          socket.emit("match_state", currentMatchState);
        } else {
          // Fallback fetch
          process.send?.({ type: "get_initial_state", workerId: cluster.worker?.id });
        }
      }, 100);

      socket.on("user_prediction", ({ squad, outcome, amount }) => {
        // Send up to primary to be batched and update global state
        process.send?.({ type: "user_prediction", data: { socketId: socket.id, squad, outcome, amount } });
      });
    });

    // Expose Admin Webhook
    app.post("/api/admin/next-ball", (req, res) => {
      process.send?.({ type: "trigger_next_ball" });
      res.json({ success: true, message: "Started prediction window via IPC" });
    });

    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", workerId: process.pid });
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
      console.log(`[Worker ${process.pid}] Listening on http://localhost:${PORT}`);
    });
  }

  startWorker();
}
