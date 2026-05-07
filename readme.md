# Gobladers Streaming Platform
A live streaming platform using HLS.

## Installation

1. Install Docker and Docker compose
2. Run the following command:

```bash
docker compose up --build
```

## How it works


```
Step1: OBS 
Step2: rtmp://localhost:1935/stream/<streamKey>
        
Step3: nginx-rtmp validates via /auth/publish
         
 Step4:  ffmpeg transcodes to 5 quality levels
         
 Step5:   HLS files written to /opt/data/hls
         
Viewer → http://localhost:8080/live/<streamKey>.m3u8
```

---

## Concepts (Check out Ivaylo Pavlov's youtube channel to learn the concepts. Thanks)

### Video Fundamentals

#### Resolution
The number of pixels in a single video frame.

Full HD  is 1080p (1920 × 1080) 
 Ultra HD is  4K (3840 × 2160) 

#### Frame Rate
The number of images displayed per second.
- Tele: 24fps
-  youtube: 30fps

#### Codec
Converts video frames into binary data (0s and 1s).

Examples: `AV1`, `AVC (H.264)`, `HEVC (H.265)`, `VP9`

#### Container
A file format that bundles video, audio, and subtitles together (e.g. `.mp4`, `.mkv`).

#### Bitrate
The amount of data used per second of video.

```
Bitrate = Frame Rate × Duration × Resolution / Codec Efficiency
```

#### Group of Pictures (GOP)
Keyframes are full images. The GOP size is the distance between keyframes. For adaptive bitrate switching, keyframes must be aligned across all quality variants.

#### .ts Files (MPEG-2 Transport Stream)
HLS video is broken into small chunks called segments, each containing its own timing information (Program Clock Reference):

```
segment_001.ts
segment_002.ts
segment_003.ts
```

---

### HLS (HTTP Live Streaming)

HLS uses **Adaptive Bitrate Streaming (ABR)** to dynamically adjust video quality based on the viewer's network conditions and device capabilities. This ensures smooth playback with minimal buffering.

**How it works:**
1. The client downloads a manifest file describing available streams and their bitrates
2. On startup, the client requests the lowest bitrate stream
3. If network throughput exceeds the current bitrate, the client requests a higher quality segment
4. If network conditions deteriorate, the client drops to a lower quality segment
5. An ABR algorithm in the client makes these decisions in real time

#### Master Playlist (`master.m3u8`) example

```m3u8
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,FRAME_RATE=30.00,CODECS=avc1
low/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480
mid/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
high/index.m3u8
```

#### Variant Playlist (`index.m3u8`) example

```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:124

#EXTINF:10.000,
segment_124.ts
#EXTINF:10.000,
segment_125.ts
#EXTINF:10.000,
segment_126.ts

# Present at the end of a VOD stream
#EXT-X-ENDLIST
```


#### .bak Files
nginx-rtmp creates `.bak` files temporarily when updating HLS playlists:

1. nginx-rtmp wants to update `index.m3u8`
2. Renames existing `index.m3u8` → `index.m3u8.bak` (backup)
3. Writes the new `index.m3u8`
4. Deletes `index.m3u8.bak`

This is a safe write pattern — if something goes wrong during the write, the `.bak` file acts as a fallback.


---

### FFmpeg Transcoding

For each quality variant, ffmpeg applies the following settings:

| Flag | Value | Description |
|------|-------|-------------|
| `-c:v` | `libx264` | Video codec — encodes to H.264, the industry standard for web and mobile |
| `-c:a` | `libfdk_aac` | Audio codec — encodes to AAC |
| `-b:v` | e.g. `2500k` | Video bitrate — higher means more detail (720p uses 2500k, 240p uses 200k) |
| `-b:a` | e.g. `128k` | Audio bitrate |
| `-s` | e.g. `1280x720` | Resolution of the output video |
| `-g` | `30` | GOP size — a keyframe every 30 frames. At 30fps this is every 1 second. HLS can only switch quality levels at a keyframe |
| `-r` | `30` | Frame rate |
| `-preset` | `superfast` | Prioritizes encoding speed over file size — critical for live streaming to prevent lag |





---


