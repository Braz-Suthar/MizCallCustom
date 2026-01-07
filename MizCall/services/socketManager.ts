import { io, Socket } from "socket.io-client";
import { AppState, AppStateStatus } from "react-native";

const SOCKET_URL = "https://custom.mizcall.com";

class SocketManager {
  private socket: Socket | null = null;
  private token: string | null = null;
  private isInitialized = false;
  private appStateListener: any = null;
  private latencyCallback: ((latency: number) => void) | null = null;
  private pingInterval: any = null;
  private statusCallback: ((connected: boolean) => void) | null = null;

  initialize(token: string) {
    // Don't reinitialize if already connected with same token
    if (this.socket?.connected && this.token === token) {
      console.log("[SocketManager] Already connected, skipping initialization");
      return this.socket;
    }

    // If token changed or not connected, disconnect old socket
    if (this.socket && (this.token !== token || !this.socket.connected)) {
      console.log("[SocketManager] Token changed or disconnected, reconnecting...");
      this.disconnect(false); // Don't fully cleanup, just disconnect
    }

    this.token = token;
    
    if (!this.isInitialized) {
      this.setupAppStateListener();
      this.isInitialized = true;
    }

    console.log("[SocketManager] Initializing Socket.IO connection...");

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
      autoConnect: true,
      forceNew: false, // Reuse existing connection
      auth: {
        token
      }
    });

    this.socket = socket;

    socket.on("connect", () => {
      console.log("[SocketManager] ✅ Connected:", socket.id);
      if (this.statusCallback) this.statusCallback(true);
      
      // Send auth message
      socket.emit("AUTH", { type: "AUTH", token });
      socket.emit("auth", { type: "auth", token });

      // Start automatic ping every 2 seconds
      this.startPingInterval();
    });

    socket.on("disconnect", (reason) => {
      console.log("[SocketManager] ⚠️  Disconnected:", reason);
      if (this.statusCallback) this.statusCallback(false);
      
      // Stop ping interval on disconnect
      this.stopPingInterval();
      
      // Only log, don't cleanup - let reconnection handle it
      if (reason === "io server disconnect") {
        // Server disconnected us, reconnect manually
        socket.connect();
      }
    });

    socket.on("connect_error", (error) => {
      console.log("[SocketManager] ❌ Connection error:", error.message);
      if (this.statusCallback) this.statusCallback(false);
    });

    socket.on("reconnect_attempt", (attempt) => {
      console.log(`[SocketManager] 🔄 Reconnect attempt ${attempt}`);
    });

    socket.on("reconnect", (attempt) => {
      console.log(`[SocketManager] ✅ Reconnected after ${attempt} attempts`);
      if (this.statusCallback) this.statusCallback(true);
      
      // Re-authenticate after reconnection
      if (this.token) {
        socket.emit("AUTH", { type: "AUTH", token: this.token });
        socket.emit("auth", { type: "auth", token: this.token });
      }

      // Restart ping interval
      this.startPingInterval();
    });

    socket.on("reconnect_error", (error) => {
      console.log("[SocketManager] ❌ Reconnect error:", error.message);
      if (this.statusCallback) this.statusCallback(false);
    });

    socket.on("reconnect_failed", () => {
      console.log("[SocketManager] ❌ Reconnect failed after all attempts");
      this.stopPingInterval();
      if (this.statusCallback) this.statusCallback(false);
    });

    // Handle PING message (for server-initiated pings)
    socket.on("PING", (data) => {
      console.log("[SocketManager] 📥 Received server PING, sending PONG");
      socket.emit("PONG", { type: "PONG", timestamp: data.timestamp });
    });

    // Handle PONG response (for client-initiated pings)
    socket.on("PONG", (data) => {
      console.log("[SocketManager] 📥 Received PONG response:", data);
      if (data.clientTimestamp) {
        const latency = Date.now() - data.clientTimestamp;
        console.log("[SocketManager] ⚡ Calculated latency:", latency, "ms");
        if (this.latencyCallback) {
          this.latencyCallback(latency);
        }
      }
    });

    // Handle latency updates from server
    socket.on("LATENCY_UPDATE", (data) => {
      console.log("[SocketManager] 📥 Received LATENCY_UPDATE:", data);
      if (this.latencyCallback) {
        this.latencyCallback(data.latency);
      }
    });

    return socket;
  }

  // Start automatic ping every 2 seconds
  private startPingInterval() {
    // Clear any existing interval
    this.stopPingInterval();

    console.log("[SocketManager] 📡 Starting automatic ping (every 2 seconds)");
    
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        const timestamp = Date.now();
        console.log("[SocketManager] 📤 Sending PING with timestamp:", timestamp);
        this.socket.emit("PING", { type: "PING", clientTimestamp: timestamp });
      } else {
        console.log("[SocketManager] ⚠️  Socket not connected, skipping ping");
      }
    }, 4000); // 2 seconds
  }

  // Stop ping interval
  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
      console.log("[SocketManager] Stopped automatic ping");
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Set callback for latency updates
  setLatencyCallback(callback: (latency: number) => void) {
    this.latencyCallback = callback;
  }

  setStatusCallback(callback: ((connected: boolean) => void) | null) {
    this.statusCallback = callback;
  }

  // Only disconnect when app is being closed, not when navigating
  private setupAppStateListener() {
    this.appStateListener = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log("[SocketManager] App state changed to:", nextAppState);
      
      // Don't disconnect on background - keep connection alive
      // Only disconnect if app is being terminated (which we can't detect)
      // The socket will auto-reconnect when app comes back to foreground
      
      if (nextAppState === 'active' && this.socket && !this.socket.connected && this.token) {
        console.log("[SocketManager] App came to foreground, ensuring connection...");
        this.socket.connect();
      }
    });
  }

  // Disconnect socket (only call when user logs out or app closes)
  disconnect(cleanup: boolean = true) {
    console.log("[SocketManager] Disconnecting socket...", cleanup ? "(with cleanup)" : "(temporary)");
    
    // Stop ping interval
    this.stopPingInterval();
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    if (cleanup) {
      this.token = null;
      this.latencyCallback = null;
      
      if (this.appStateListener) {
        this.appStateListener.remove();
        this.appStateListener = null;
      }
      
      this.isInitialized = false;
    }
  }

  // Cleanup on logout
  cleanup() {
    console.log("[SocketManager] Full cleanup...");
    this.disconnect(true);
  }
}

// Export singleton instance
export const socketManager = new SocketManager();

