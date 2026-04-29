import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream, readdirSync, existsSync } from "fs";
import path from "path";
import s3 from "../configs/storageBucket";
import Stream from "../models/stream.model";

const HLS_PATH = "/opt/data/hls";

export const uploadStreamToStorage = async (streamKey: string, streamId: string) => {
  const bucket = process.env.S3_BUCKET!;
  const files: string[] = [];


  const masterPath = path.join(HLS_PATH, `${streamKey}.m3u8`);
  if (existsSync(masterPath)) files.push(masterPath);


  const variants = [
    `${streamKey}_720p2628kbs`,
    `${streamKey}_480p1128kbs`,
    `${streamKey}_360p878kbs`,
    `${streamKey}_240p528kbs`,
    `${streamKey}_240p264kbs`,
  ];

  for (const variant of variants) {
    const variantPath = path.join(HLS_PATH, variant);
    if (existsSync(variantPath)) {
      const variantFiles = readdirSync(variantPath).map(f =>
        path.join(variantPath, f)
      );
      files.push(...variantFiles);
    }
  }

  console.log(`Uploading ${files.length} files to S3 for stream ${streamKey}`);

  // Upload all files to S3
  for (const filePath of files) {
    const s3Key = `recordings/${streamId}/${path.relative(HLS_PATH, filePath)}`;

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: s3Key,
        Body: createReadStream(filePath),
        ContentType: filePath.endsWith(".m3u8")
          ? "application/vnd.apple.mpegurl"
          : "video/mp2t",
      },
    });

    await upload.done();
    console.log(`Uploaded: ${s3Key}`);
  }

  await Stream.findByIdAndUpdate(streamId, {
    recordingKey: `recordings/${streamId}`,
  });

  console.log(`Stream ${streamId} uploaded to S3`);
};