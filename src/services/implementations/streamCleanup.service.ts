import axios from "axios";
import { parseStringPromise } from "xml2js";
import { StreamService } from "./stream.service";
import { StreamRepository } from "../../repository/stream.repository";
import { IStream } from "../../models/stream.model";
import { UserRepository } from "../../repository/user.repository";


export class StreamCleanupService {
  private interval: NodeJS.Timeout | null = null;
  private streamService: StreamService;
  private streamRepository: StreamRepository;
  private userRepository: UserRepository;



  constructor() {
    this.streamService = new StreamService();
    this.streamRepository=new StreamRepository();
    this.userRepository=new UserRepository();
  }

  private async getActiveRtmpStreams(): Promise<string[]> {
    try {
      const response = await axios.get("http://rtmp:80/stat");
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

  private async markStreamAsEnded(stream: IStream): Promise<void> {
    try {


      await this.streamRepository.endStream(stream.streamKey);
    } catch (err: any) {
      console.error(`Failed to mark stream ${stream._id} as ended:`, err.message);
    }
  }

  private async markUserAsOffline(streamKey: string): Promise<void> {
    try {
      await this.userRepository.setUserLiveStatus(streamKey,false);
    } catch (err: any) {
      console.error(`Failed to mark user offline for streamKey ${streamKey}:`, err.message);
    }
  }

  private async uploadStreamRecording(streamKey: string, streamId: string): Promise<void> {
    try {
      await this.streamService.uploadStreamToStorage(streamKey, streamId);
    } catch (err: any) {
      console.error(`Failed to upload stream ${streamId} to S3:`, err.message);
    }
  }

  private async cleanupDeadStreams(): Promise<void> {
    try {
      const activeRtmpStreams = await this.getActiveRtmpStreams();
      console.log("Active RTMP streams:", activeRtmpStreams);

      const liveStreams = await this.streamRepository.getAllStreamsMarkedIsLiveTrue();

      for (const stream of liveStreams) {
        try {
          if (!activeRtmpStreams.includes(stream.streamKey)) {
            console.log(`Stream ${stream._id} is no longer active, cleaning up...`);

            await Promise.all([
              this.markStreamAsEnded(stream),
              this.markUserAsOffline(stream.streamKey),
            ]);

            await this.uploadStreamRecording(
              stream.streamKey,
              stream._id.toString()
            );

            console.log(`Stream ${stream._id} cleanup complete`);
          }
        } catch (err: any) {
          console.error(`Failed to cleanup stream ${stream._id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error("cleanupDeadStreams error:", err.message);
    }
  }

  start(intervalMs: number = 30000): void {
    try {
      console.log(`Starting stream cleanup every ${intervalMs / 1000}s`);
      this.interval = setInterval(async () => {
        try {
          await this.cleanupDeadStreams();
        } catch (err: any) {
          console.error("Cleanup interval error:", err.message);
        }
      }, intervalMs);
    } catch (err: any) {
      console.error("Failed to start cleanup service:", err.message);
    }
  }

  stop(): void {
    try {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
        console.log("Stream cleanup service stopped");
      }
    } catch (err: any) {
      console.error("Failed to stop cleanup service:", err.message);
    }
  }
}