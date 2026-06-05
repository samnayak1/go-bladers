import axios from "axios";
import https from "https";
import { parseStringPromise } from "xml2js";
import { StreamService } from "./stream.service";




export class StreamCleanupService {
  private interval: NodeJS.Timeout | null = null;
  private streamService: StreamService;

  private trackedStreams: Set<string> = new Set(); // track active streams

  constructor() {
    this.streamService = new StreamService();
  
  }

  private async getActiveRtmpStreams(): Promise<string[]> {
    try {
      const response = await axios.get("http://rtmp:80/stat", {
        maxRedirects: 0,
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });
      const parsed = await parseStringPromise(response.data);

      const streams = parsed?.rtmp?.server?.[0]?.application
        ?.find((app: any) => app.name?.[0] === "stream")
        ?.live?.[0]?.stream;

      if (!streams) return [];

      return streams.map((s: any) => s.name?.[0]).filter(Boolean);
    } catch (err: any) {
      console.error("Failed to fetch rtmp stat:", err.message);
      return [];
    }
  }

  private async handleStreamStarted(streamKey: string): Promise<void> {
    try {
      console.log(`Stream started: ${streamKey}`);
      await this.streamService.startStream(streamKey);
    } catch (err: any) {
      console.error(`Failed to start stream ${streamKey}:`, err.message);
    }
  }

  private async handleStreamEnded(streamKey: string): Promise<void> {
    try {
      
      await this.streamService.endStream(streamKey);
    } catch (err: any) {
      console.error(`Failed to end stream ${streamKey}:`, err.message);
    }
  }

  private async cleanupDeadStreams(): Promise<void> {
    try {
      const activeRtmpStreams = await this.getActiveRtmpStreams();
      console.log("Active RTMP streams:", activeRtmpStreams);

      // detect new streams
      for (const streamKey of activeRtmpStreams) {
        if (!this.trackedStreams.has(streamKey)) {
          this.trackedStreams.add(streamKey);
          await this.handleStreamStarted(streamKey);
        }
      }

      // detect ended streams
      for (const streamKey of this.trackedStreams) {
        if (!activeRtmpStreams.includes(streamKey)) {
   
          this.trackedStreams.delete(streamKey);
          await this.handleStreamEnded(streamKey);
        }
      }
    } catch (err: any) {
      console.error("cleanupDeadStreams error:", err.message);
    }
  }

  start(intervalMs: number = 30000): void {
    console.log(`Starting stream cleanup every ${intervalMs / 1000}s`);
    this.interval = setInterval(async () => {
      try {
        await this.cleanupDeadStreams();
      } catch (err: any) {
        console.error("Cleanup interval error:", err.message);
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log("Stream cleanup service stopped");
    }
  }
}