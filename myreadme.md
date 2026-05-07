


sudo chmod -R 777 ./hls
http://localhost:8080/stat

http://<domain>/live/<streamKey>.m3u8

TODO
`1. Fix the folder structure`
`2. See why the video isnt playing`
`3. Auth the person who can play`
`4. Save recording`
5. schema vaildation
6. rate limiting
7. swagger doc
8. cors




#################################
Resolution: Number of pixels one image if video has
Full HD: 1080p (1920 X 1080)
Ultra HD: 4k (3840 X 2160)

Frame Rate:
Number of images/second
tele= 24fps
yt video= 30 fps

codec:
converting image into 0s and 1s
eg. AV1, AVC, HEVC, VPG

container:
video, audio and subtitles bundled together

bitrate: 
 framerate X duration of video X resolution / codec 

 group of pictures: 
 key frames are full images. gop size is the distance between key frames. For adaptive bitrate switching, keyframes must be aligned across all variants

.ts (mpeg-2 transport stream)
Broken up into chunks like
segment_001.ts
segment_002.ts
Each ts file has its own timing information (program clock reference)






hls

Adaptive bitrate streaming (ABR) is a technique used to optimize video streaming over HTTP networks by dynamically adjusting the quality of the video based on the viewer's network conditions and device capabilities. This ensures smooth playback with minimal buffering, regardless of variations in bandwidth or device performance.

Each of the different bit rate streams are segmented into small multi-second parts. First, the client downloads a manifest file that describes the available stream segments and their respective bit rates. During stream start-up, the client usually requests the segments from the lowest bit rate stream. If the client finds that the network throughput is greater than the bit rate of the downloaded segment, then it will request a higher bit rate segment. Later, if the client finds that the network throughput has deteriorated, it will request a lower bit rate segment. An adaptive bitrate (ABR) algorithm in the client performs the key function of deciding which bit rate segments to download, based on the current state of the network. (from wikipedia)


An example of an HLS playlist manifest (master.m3u8):

#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,FRAME_RATE=30.00,CODECS=avc1.
low/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480
mid/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
high/index.m3u8


An example of HLS playlist file (index.m3u8)

#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:124

# Each segment is roughly 10 seconds long
#EXTINF:10.000,
segment_124.ts
#EXTINF:10.000,
segment_125.ts
#EXTINF:10.000,
segment_126.ts

# For a VOD (Video on Demand), you would see this at the end:
#EXT-X-ENDLIST



ffmpeg

For each variant, you are defining specific rules for the video (-v) and audio (-a):

-c:v libx264 & -c:a libfdk_aac: These are the codecs. It’s converting the video to H.264 and the audio to AAC. These are the industry standards for web and mobile compatibility.

-b:v & -b:a: These set the bitrate. For example, the 720p version uses 2500k (high detail), while the lowest 240p version uses only 200k (low detail, for slow connections).

-s (Size): This defines the resolution (e.g., 1280x720 vs 426x240).

-g (Group of Pictures): This sets the Keyframe Interval. In your command, -g 30 means a keyframe is created every 30 frames. Since your frame rate (-r) is 30, you get a keyframe every 1 second.

Why this matters: HLS can only switch between quality levels at a keyframe.

-preset superfast: Tells FFmpeg to prioritize encoding speed over file size—critical for live streaming to prevent lag.



A .bak file is a backup file. nginx-rtmp creates them temporarily when writing HLS playlist files (.m3u8).
The process looks like this:
1. nginx-rtmp wants to update index.m3u8
2. Renames existing index.m3u8 → index.m3u8.bak  (backup)
3. Writes new index.m3u8
4. Deletes index.m3u8.bak