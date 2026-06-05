import { Upload } from "@aws-sdk/lib-storage";
import path from "path";
import s3 from "../../configs/storageBucket";
import {
  createReadStream,
  existsSync,
  readdirSync,
  mkdirSync,
  statSync,
  chmodSync,
} from "fs";
import { readFile } from "fs/promises";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { StreamRepository } from "../../repository/stream.repository";
import { UserRepository } from "../../repository/user.repository";
import { IStream } from "../../models/stream.model";
import { exec } from "child_process";
import { promisify } from "util";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  StreamResponseDto,
  toStreamDto,
} from "../../types/dto/stream.dto";
import { getVariantNames } from "../../types/variants.enums";

const execAsync = promisify(exec);

export class StreamService {
  private streamRepository: StreamRepository;
  private userRepository: UserRepository;

  private bucketName: string;
  private HLS_PATH: string;
  private THUMBNAIL_PATH: string;

  private watchers: Map<string, NodeJS.Timeout>;
  private uploadedSegments: Map<string, Set<string>>;

  constructor() {
    this.streamRepository = new StreamRepository();
    this.userRepository = new UserRepository();

    this.bucketName = process.env.S3_BUCKET!;
    this.HLS_PATH = "/opt/data/hls";
    this.THUMBNAIL_PATH = "/opt/data/thumbnails";

    this.watchers = new Map();
    this.uploadedSegments = new Map();

    if (!existsSync(this.HLS_PATH)) {
      mkdirSync(this.HLS_PATH, { recursive: true });
    }

    if (!existsSync(this.THUMBNAIL_PATH)) {
      mkdirSync(this.THUMBNAIL_PATH, { recursive: true });
    }
  }



  async startStream(streamKey: string): Promise<void> {
    const user =
      await this.userRepository.getUserByStreamKey(streamKey);

    if (!user) {
      throw new Error("User not found");
    }

    const stream = await this.streamRepository.createStream(
      user.username,
      streamKey,
      user._id.toString()
    );

    await this.startLiveUpload(
      streamKey,
      stream._id.toString()
    );
  }

  async endStream(streamKey: string): Promise<void> {
    const streamId =
      await this.streamRepository.endStream(streamKey);

    if (!streamId) {
      return;
    }

    await this.stopLiveUpload(
      streamKey,
      streamId
    );
  }
public async getM3u8Content(
  userName: string
): Promise<string | null> {
  const user =
    await this.userRepository.getUserByUsername(userName);

  if (!user) {
    throw new Error("User not found");
  }

  return await this.getM3u8ContentHelper(
    user.streamKey,
    user.username
  );
}

private async getM3u8ContentHelper(
  streamKey: string,
  replaceWith: string
): Promise<string | null> {
  const m3u8Path = path.join(
    this.HLS_PATH,
    `${streamKey}.m3u8`
  );

  for (let i = 0; i < 20; i++) {
    if (existsSync(m3u8Path)) {
      const content = await readFile(
        m3u8Path,
        "utf-8"
      );
 //replaced streamKey with usernam
 // The g means global, replace all instances of streamKey with username 
      return content.replace(
        new RegExp(streamKey, "g"),
        replaceWith
      );
    }

    await new Promise(resolve =>
      setTimeout(resolve, 250)
    );
  }

  return null;
}


public async getVariantContent(
  variant: string,
  username: string
): Promise<string | null> {
  const user =
    await this.userRepository.getUserByUsername(
      username
    );

  if (!user) {
    throw new Error("User not found");
  }

  const actualVariant = variant.replace(
    new RegExp(username, "g"),
    user.streamKey
  );

  const variantPath = path.join(
    this.HLS_PATH,
    actualVariant,
    "index.m3u8"
  );

  for (let i = 0; i < 20; i++) {
    if (existsSync(variantPath)) {
      const content = await readFile(
        variantPath,
        "utf-8"
      );

      return content.replace(
        new RegExp(user.streamKey, "g"),
        username
      );
    }

    await new Promise(resolve =>
      setTimeout(resolve, 500)
    );
  }

  return null;
}

public async getSegmentStream(
  variant: string,
  segment: string,
  username: string
): Promise<string | null> {
  const user =
    await this.userRepository.getUserByUsername(
      username
    );

  if (!user) {
    throw new Error("User not found");
  }

  return await this.getSegmentStreamHelper(
    variant,
    segment,
    username,
    user.streamKey
  );
}

private async getSegmentStreamHelper(
  variant: string,
  segment: string,
  username: string,
  streamKey: string
): Promise<string | null> {
  const actualVariant = variant.replace(
    new RegExp(username, "g"),
    streamKey
  );

  const segmentPath = path.join(
    this.HLS_PATH,
    actualVariant,
    segment
  );

  for (let i = 0; i < 20; i++) {
    if (existsSync(segmentPath)) {
      return segmentPath;
    }

    await new Promise(resolve =>
      setTimeout(resolve, 250)
    );
  }

  return null;
}

  async startLiveUpload(
    streamKey: string,
    streamId: string
  ): Promise<void> {
    const uploadedFiles = new Set<string>();

    this.uploadedSegments.set(
      streamId,
      uploadedFiles
    );

    const scanAndUpload = async () => {
      await this.uploadAllSegments(
        streamKey,
        streamId,
        uploadedFiles
      );
    };

    await scanAndUpload();

    const uploadInterval = setInterval(async () => {
      try {
        await scanAndUpload();
      } catch (err) {
        console.error(
          "Polling upload error",
          err
        );
      }
    }, 2000);

    const playlistInterval = setInterval(async () => {
      try {
        await this.uploadPlaylists(
          streamKey,
          streamId,
          this.bucketName
        );
      } catch (err) {
        console.error(
          "Playlist upload error",
          err
        );
      }
    }, 5000);

    this.watchers.set(
      `${streamId}-upload`,
      uploadInterval
    );

    this.watchers.set(
      `${streamId}-playlist`,
      playlistInterval
    );
  }

  async stopLiveUpload(
    streamKey: string,
    streamId: string
  ): Promise<void> {
    for (const [key, timer] of this.watchers.entries()) {
      if (!key.startsWith(streamId)) {
        continue;
      }

      clearInterval(timer);
      this.watchers.delete(key);
    }

    // allow nginx + ffmpeg to flush
    await new Promise(resolve =>
      setTimeout(resolve, 10000)
    );

    const uploadedFiles =
      this.uploadedSegments.get(streamId);

    if (uploadedFiles) {
      await this.uploadAllSegments(
        streamKey,
        streamId,
        uploadedFiles
      );
    }

    await this.uploadFinalPlaylists(
      streamKey,
      streamId,
      this.bucketName
    );

    await this.uploadThumbnailOfStream(
      streamKey,
      streamId
    );

    await this.streamRepository.updateStreamRecordingKey(
      streamId,
      `recordings/${streamId}`
    );

    this.uploadedSegments.delete(streamId);

    console.log(
      `Finalized stream ${streamId}`
    );
  }

  private async uploadAllSegments(
    streamKey: string,
    streamId: string,
    uploadedFiles: Set<string>
  ): Promise<void> {
    const variants =
      getVariantNames(streamKey);

    for (const variant of variants) {
      const variantPath = path.join(
        this.HLS_PATH,
        variant
      );

      if (!existsSync(variantPath)) {
        continue;
      }

      const files = readdirSync(
        variantPath
      ).filter(f => f.endsWith(".ts"));

      for (const file of files) {
        const uniqueId =
          `${variant}/${file}`;

        if (uploadedFiles.has(uniqueId)) {
          continue;
        }

        const filePath = path.join(
          variantPath,
          file
        );

        try {
          await this.waitForFileStable(
            filePath
          );

          await this.uploadFileToS3(
            filePath,
            `recordings/${streamId}/${variant}/${file}`,
            this.bucketName,
            "video/mp2t"
          );

          uploadedFiles.add(uniqueId);
        } catch (err) {
          console.error(
            `Failed upload ${uniqueId}`,
            err
          );
        }
      }
    }
  }


  private async uploadPlaylists(
    streamKey: string,
    streamId: string,
    bucket: string
  ): Promise<void> {
    const variants =
      getVariantNames(streamKey);

    const masterPath = path.join(
      this.HLS_PATH,
      `${streamKey}.m3u8`
    );

    if (existsSync(masterPath)) {
      let masterContent =
        await readFile(masterPath, "utf8");

      console.log("MASTER BEFORE UPLOAD");
console.log(masterContent);

      for (const variant of variants) {
        masterContent =
          masterContent.replace(
            new RegExp(
              `${variant}(?!/index\\.m3u8)`,
              "g"
            ),
            `${variant}/index.m3u8`
          );
      }

      await this.uploadFileContentToS3(
        masterContent,
        `recordings/${streamId}/master.m3u8`,
        bucket,
        "application/vnd.apple.mpegurl"
      );
    }

    for (const variant of variants) {
      const playlistPath = path.join(
        this.HLS_PATH,
        variant,
        "index.m3u8"
      );

      if (!existsSync(playlistPath)) {
        continue;
      }

      const content =
        await readFile(
          playlistPath,
          "utf8"
        );

      await this.uploadFileContentToS3(
        content,
        `recordings/${streamId}/${variant}/index.m3u8`,
        bucket,
        "application/vnd.apple.mpegurl"
      );
    }
  }

  private async uploadFinalPlaylists(
    streamKey: string,
    streamId: string,
    bucket: string
  ): Promise<void> {
    await this.uploadPlaylists(
      streamKey,
      streamId,
      bucket
    );
  }

 

  private async uploadThumbnailOfStream(
    streamKey: string,
    streamId: string
  ): Promise<void> {
    const thumbnailKey =
      await this.generateAndUploadThumbnail(
        streamKey,
        streamId
      );

    if (thumbnailKey) {
      await this.streamRepository.updateThumbnailKey(
        streamId,
        thumbnailKey
      );
    }
  }

  async generateAndUploadThumbnail(
    streamKey: string,
    streamId: string
  ): Promise<string | null> {
    const m3u8Path = path.join(
      this.HLS_PATH,
      `${streamKey}.m3u8`
    );

    if (!existsSync(m3u8Path)) {
      return null;
    }

    const outputPath = path.join(
      this.THUMBNAIL_PATH,
      `${streamId}.jpg`
    );

    try {
      try {
        chmodSync(
          this.THUMBNAIL_PATH,
          0o777
        );
      } catch {}

      await execAsync(
    `ffmpeg -y -analyzeduration 100M -probesize 100M -i "${m3u8Path}" -ss 00:00:02 -map 0:v:0 -vframes 1 -q:v 2 -vf scale=1280:720 "${outputPath}"`
);

      const s3Key =
        `thumbnails/${streamId}.jpg`;

      await this.uploadFileToS3(
        outputPath,
        s3Key,
        this.bucketName,
        "image/jpeg"
      );

      return s3Key;
    } catch (err) {
      console.error(
        "Thumbnail generation failed",
        err
      );

      return null;
    }
  }



  private async uploadFileToS3(
    filePath: string,
    s3Key: string,
    bucket: string,
    contentType: string
  ): Promise<void> {
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: s3Key,
        Body: createReadStream(filePath),
        ContentType: contentType,
      },
    });

    await upload.done();
  }

  private async uploadFileContentToS3(
    content: string,
    s3Key: string,
    bucket: string,
    contentType: string
  ): Promise<void> {
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: s3Key,
        Body: content,
        ContentType: contentType,
      },
    });

    await upload.done();
  }

  private async waitForFileStable(
    filePath: string,
    checks = 3,
    interval = 500
  ): Promise<void> {
    let previousSize = -1;
    let stableCount = 0;

    while (stableCount < checks) {
      const size =
        statSync(filePath).size;

      if (size === previousSize) {
        stableCount++;
      } else {
        stableCount = 0;
      }

      previousSize = size;

      await new Promise(resolve =>
        setTimeout(resolve, interval)
      );
    }
  }



  public async getS3Object(
    key: string
  ) {
    return s3.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
  }

  async getS3Content(
    key: string,
    streamKey: string,
    replaceWith: string
  ): Promise<string | null> {
    const response =
      await this.getS3Object(key);

    const content =
      (await response.Body?.transformToString()) ??
      "";

    if (!content) {
      return null;
    }

    return content.replace(
      new RegExp(streamKey, "g"),
      replaceWith
    );
  }



  async getStreamById(
    streamId: string
  ): Promise<IStream | null> {
    return this.streamRepository.getStreamById(
      streamId
    );
  }

  async getAllStreamsOfUser(
    userId: string
  ): Promise<StreamResponseDto[]> {
    const streams =
      await this.streamRepository.getStreamsByUserId(
        userId
      );

    const enriched =
      await Promise.all(
        streams.map(s =>
          this.attachThumbnailUrl(s)
        )
      );

    return Promise.all(
      enriched.map(s =>
        toStreamDto(s)
      )
    );
  }

  async getLatestStreams(
    page: number,
    limit: number
  ) {
    const [streams, total] =
      await Promise.all([
        this.streamRepository.getLatestStreams(
          page,
          limit
        ),
        this.streamRepository.getLatestStreamsCount(),
      ]);

    const enriched =
      await Promise.all(
        streams.map(s =>
          this.attachThumbnailUrl(s)
        )
      );

    return {
      streams: enriched.map(
        toStreamDto
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(
        total / limit
      ),
      hasNext:
        page * limit < total,
      hasPrev: page > 1,
    };
  }

  private async getSignedUrl(
    key: string,
    expiresIn = 3600
  ) {
    return getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
      { expiresIn }
    );
  }

  private async attachThumbnailUrl(
    stream: IStream
  ) {
    const streamObj =
      stream.toObject();

    streamObj.thumbnailUrl =
      stream.thumbnailKey
        ? await this.getSignedUrl(
            stream.thumbnailKey
          )
        : null;

    return streamObj;
  }
}