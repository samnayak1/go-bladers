import axios from "axios";
import https from "https";
import { parseStringPromise } from "xml2js";
import { StreamService } from "./stream.service";







const streamService = new StreamService();

export class StreamCleanupService {
    private interval: NodeJS.Timeout | null = null;
    private streamService: StreamService = streamService;

    private trackedStreams: Set<string> = new Set();
    private endingStreams: Set<string> = new Set();
    private lastSeen: Map<string, number> = new Map();

    private readonly POLL_INTERVAL_MS = 5000;
    private readonly GRACE_PERIOD_MS = 15000;

    constructor() {}

    async initialize(): Promise<void> {
        console.log("Initializing stream cleanup service...");
        try {
            const activeStreams = await this.getActiveRtmpStreams();
            for (const streamKey of activeStreams) {
                console.log(`Recovering active stream: ${streamKey}`);
                this.trackedStreams.add(streamKey);
                this.lastSeen.set(streamKey, Date.now());
            }
        } catch (err: any) {
            console.error("Failed to initialize with RTMP:", err.message);
        }
    }

    private async getActiveRtmpStreams(): Promise<string[]> {
        try {
            const response = await axios.get("http://rtmp:80/stat", {
                maxRedirects: 0,
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                timeout: 3000,
            });
            const parsed = await parseStringPromise(response.data);

            const streams = parsed?.rtmp?.server?.[0]?.application
                ?.find((app: any) => app.name?.[0] === "stream")
                ?.live?.[0]?.stream;

            if (!streams) return [];

            return streams.map((s: any) => s.name?.[0]).filter(Boolean);
        } catch (err: any) {
            console.error("Failed to fetch RTMP stat:", err.message);
            throw err; 
        }
    }

    private async handleStreamStarted(streamKey: string): Promise<void> {
        try {
            console.log(`[${new Date().toISOString()}] Stream started: ${streamKey}`);
            await this.streamService.startStream(streamKey);
            this.lastSeen.set(streamKey, Date.now());
        } catch (err: any) {
            console.error(`Failed to start stream ${streamKey}:`, err.message);
            throw err; // Don't track if start failed
        }
    }

    private async handleStreamEnded(streamKey: string): Promise<void> {
        if (this.endingStreams.has(streamKey)) {
            console.log(`Already ending stream ${streamKey}, skipping`);
            return;
        }

        this.endingStreams.add(streamKey);
        try {
            console.log(`[${new Date().toISOString()}] Stream ended: ${streamKey}`);
            await this.streamService.endStream(streamKey);
        } catch (err: any) {
            console.error(`Failed to end stream ${streamKey}:`, err.message);
        } finally {
            this.endingStreams.delete(streamKey);
        }
    }

    private async cleanupDeadStreams(): Promise<void> {
        let activeRtmpStreams: string[];
        
        try {
            activeRtmpStreams = await this.getActiveRtmpStreams();
            console.log("Active RTMP streams:", activeRtmpStreams);
        } catch (err) {
            console.error("RTMP stat fetch failed, skipping cleanup cycle");
            return;
        }

        const now = Date.now();

        // Update last-seen for active streams
        for (const streamKey of activeRtmpStreams) {
            this.lastSeen.set(streamKey, now);
        }

        // Start new streams
        for (const streamKey of activeRtmpStreams) {
            if (!this.trackedStreams.has(streamKey)) {
                try {
                    await this.handleStreamStarted(streamKey);
                    this.trackedStreams.add(streamKey);
                } catch (err) {
                    console.error(`Not tracking ${streamKey} due to start failure`);
                }
            }
        }

        // End streams only after grace period
        for (const streamKey of [...this.trackedStreams]) {
            if (!activeRtmpStreams.includes(streamKey)) {
                const lastSeenAt = this.lastSeen.get(streamKey) || 0;
                const goneFor = now - lastSeenAt;

                if (goneFor > this.GRACE_PERIOD_MS) {
                    this.trackedStreams.delete(streamKey);
                    this.lastSeen.delete(streamKey);
                    await this.handleStreamEnded(streamKey);
                } else {
                    console.log(
                        `Stream ${streamKey} missing for ${goneFor}ms, ` +
                        `waiting ${this.GRACE_PERIOD_MS - goneFor}ms before cleanup`
                    );
                }
            }
        }
    }

    start(): void {
        console.log(`Starting stream cleanup every ${this.POLL_INTERVAL_MS / 1000}s`);
        this.interval = setInterval(async () => {
            try {
                await this.cleanupDeadStreams();
            } catch (err: any) {
                console.error("Cleanup interval error:", err.message);
            }
        }, this.POLL_INTERVAL_MS);
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log("Stream cleanup service stopped");
        }
    }
}