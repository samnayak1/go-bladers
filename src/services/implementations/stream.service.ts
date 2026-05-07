import { Upload } from "@aws-sdk/lib-storage";

import path from "path";
import s3 from "../../configs/storageBucket";

import { createReadStream, existsSync, readdirSync, mkdirSync, statSync } from "fs";
import { readFile } from "fs/promises";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { StreamRepository } from "../../repository/stream.repository";

import { UserRepository } from "../../repository/user.repository";
import { IStream } from "../../models/stream.model";

import { exec } from "child_process";
import { promisify } from "util";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const execAsync = promisify(exec);


export class StreamService {

     streamRepository:StreamRepository;
     userRepository:UserRepository
     bucketName:string;
     HLS_PATH:string;
     THUMBNAIL_PATH: string;
     

     constructor(){
         this.streamRepository=new StreamRepository();
         this.bucketName=process.env.S3_BUCKET!;
         this.HLS_PATH="/opt/data/hls";
         this.userRepository=new UserRepository();
         this.THUMBNAIL_PATH = "/opt/data/thumbnails";

         //create thumbnail directory if it does not exist
         if (!existsSync(this.THUMBNAIL_PATH)) {
            mkdirSync(this.THUMBNAIL_PATH, { recursive: true });
         }

     }


private collectStreamFiles(streamKey: string): string[] {
  const files: string[] = [];

  const masterPath = path.join(this.HLS_PATH, `${streamKey}.m3u8`);
  if (existsSync(masterPath)) files.push(masterPath);

  const variants = [
    `${streamKey}_720p2628kbs`,
    `${streamKey}_480p1128kbs`,
    `${streamKey}_360p878kbs`,
    `${streamKey}_240p528kbs`,
    `${streamKey}_240p264kbs`,
  ];

  for (const variant of variants) {
    const variantPath = path.join(this.HLS_PATH, variant);
    if (existsSync(variantPath)) {
      const variantFiles = readdirSync(variantPath)
        .filter(f => !f.endsWith(".bak"))  // ignore .bak files
        .map(f => path.join(variantPath, f));
      files.push(...variantFiles);
    }
  }

  return files;
}

private async uploadFileToS3(filePath: string, s3Key: string, bucket: string, contentType: string): Promise<void> {

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
  console.log(`Uploaded: ${s3Key}`);
}

private async uploadAllFiles(files: string[], streamId: string, bucket: string): Promise<void> {
  console.log(`Uploading ${files.length} files to S3 for stream ${streamId}`);
  
  await Promise.all(
    files.map(filePath => {
     const s3Key = `recordings/${streamId}/${path.relative(this.HLS_PATH, filePath)}`;
      this.uploadFileToS3(filePath, s3Key, bucket,
      filePath.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : "video/mp2t")})
  );
}

async uploadStreamToStorage(streamKey: string, streamId: string): Promise<void> {
  const bucket = this.bucketName;

  const files = this.collectStreamFiles(streamKey);
  await this.uploadAllFiles(files, streamId, bucket);
  await this.streamRepository.updateStreamRecordingKey(streamId, `recordings/${streamId}`);

  console.log(`Stream ${streamId} uploaded to S3`);
}



//function to get playlist file
public async getM3u8Content(userName:string){
      const user = await this.userRepository.getUserByUsername(userName);
      if(!user){
        throw new Error("User not found");
      }
    
    const m3U8Content=await this.getM3u8ContentHelper(user.streamKey,user.username);
    

    return m3U8Content;
     
}

//main route
private async getM3u8ContentHelper(streamKey: string, replaceWith: string): Promise<string | null> {
  const m3u8Path = path.join(this.HLS_PATH, `${streamKey}.m3u8`);

  if (!existsSync(m3u8Path)) return null;

  const content = await readFile(m3u8Path, "utf-8");
  return content.replace(new RegExp(streamKey, "g"), replaceWith);
};


//variant route
public async getSegmentPath(variant:string,username:string){
   
     const user = await this.userRepository.getUserByUsername(username);
      if(!user){
        throw new Error("User not found");
      }
    
    const segmentPath=await this.getSegmentPathHelper(variant,username,user.streamKey);
    

    return segmentPath;

}


private async getSegmentPathHelper(variant: string, username: string, streamKey: string): Promise<string | null>{
  const actualVariant = variant.replace(new RegExp(username, "g"), streamKey);
  const segmentPath = path.join(this.HLS_PATH, actualVariant, "index.m3u8");

  if (!existsSync(segmentPath)) return null;

  return segmentPath;
};


//segment route
public async getSegmentStream(variant:string,segment:string,username:string){
         
  const user = await this.userRepository.getUserByUsername(username);
      if(!user){
        throw new Error("User not found");
      }
   
  const segmentStream=await this.getSegmentStreamHelper(variant,segment,username,user.streamKey);


  return segmentStream;



}

public async getVariantContent(variant: string, username: string): Promise<string | null> {
  const user = await this.userRepository.getUserByUsername(username);
  if (!user) throw new Error("User not found");

  const actualVariant = variant.replace(new RegExp(username, "g"), user.streamKey);
  const variantPath = path.join(this.HLS_PATH, actualVariant, "index.m3u8");

  if (!existsSync(variantPath)) return null;

  const content = await readFile(variantPath, "utf-8");
  return content.replace(new RegExp(user.streamKey, "g"), username);
}


//we store the file as HLS_PATH_streamKey_variant.m3u8
private async getSegmentStreamHelper(variant:string,segment: string, username: string, streamKey: string): Promise<string | null>{
  const actualVariant = variant.replace(new RegExp(username, "g"), streamKey);
  const segmentPath = path.join(this.HLS_PATH, actualVariant, segment);

  if (!existsSync(segmentPath)) return null; //from their doc, "Returns true if the path exists, false otherwise".

  return segmentPath;
};


//helper function
public async getS3Object(key: string){
  const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
  return await s3.send(command);
};


async getS3Content(key: string, streamKey: string, replaceWith: string): Promise<string | null>{

  const response = await this.getS3Object(key);
  const content = await response.Body?.transformToString() ?? "";
  if (!content) return null;
  return content.replace(new RegExp(streamKey, "g"), replaceWith);
};

async startStream( streamKey: string):Promise<void>{

   const user=await this.userRepository.getUserByStreamKey(streamKey);
   if(!user){
     throw new Error("user not found");
   }
    return await this.streamRepository.createStream(user.username,streamKey,user._id.toString());

}

async endStream(streamKey:string){

    const streamId=await this.streamRepository.endStream(streamKey);


    //TODO: put in a durable queue

    if(streamId){
     await this.uploadStreamToStorage(streamKey, streamId).catch(err =>
          console.error("S3 upload error:", err)
        );

    await this.uploadThumbnailOfStream(streamKey,streamId);
    }

}

private async uploadThumbnailOfStream(name:string, streamId:string){
 Promise.all([
      this.uploadStreamToStorage(name, streamId).catch(err =>
        console.error("S3 upload error:", err)
      ),
      this.generateAndUploadThumbnail(name, streamId).then(async (thumbnailKey) => {
        if (thumbnailKey) {
          await this.streamRepository.updateThumbnailKey(streamId!, thumbnailKey);
        }
      }).catch((err: any) => console.error("Thumbnail error:", err)),
    ]);

}

async getAllStreamsOfUser(userId: string) {
  const streams = await this.streamRepository.getStreamsByUserId(userId);
  return await Promise.all(streams.map(stream => this.attachThumbnailUrl(stream)));
}

async getStreamById(streamId: string): Promise<IStream | null> {
  return await this.streamRepository.getStreamById(streamId);
}



async getLatestStreams(page: number, limit: number) {
  const [streams, total] = await Promise.all([
    this.streamRepository.getLatestStreams(page, limit),
    this.streamRepository.getLatestStreamsCount(),
  ]);

  const streamsWithThumbnails = await Promise.all(
    streams.map(stream => this.attachThumbnailUrl(stream))
  );
  

  return {
    streams:streamsWithThumbnails,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

private async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return await getSignedUrl(s3, command, { expiresIn });
  }

private async attachThumbnailUrl(stream: IStream): Promise<any> {
    const streamObj = stream.toObject();
    streamObj.thumbnailUrl = stream.thumbnailKey
      ? await this.getSignedUrl(stream.thumbnailKey)
      : null;
    return streamObj;
  }



  async generateAndUploadThumbnail(streamKey: string, streamId: string): Promise<string | null> {
    const outputPath = path.join(this.THUMBNAIL_PATH, `${streamId}.jpg`);
    const thumbnailDir = path.join(this.THUMBNAIL_PATH);
    const m3u8Path = path.join(this.HLS_PATH, `${streamKey}.m3u8`);

    if (!existsSync(m3u8Path)) return null;

    try {

        if (!existsSync(thumbnailDir)) {
           mkdirSync(thumbnailDir, { recursive: true });
       }
    
      //Grab one frame (vframes 1) of the  4th second of the thumbnail and scale to  1280x720.
      await execAsync(
        `ffmpeg -y -i ${m3u8Path} -ss 00:00:04 -vframes 1 -q:v 2 -vf scale=1280:720 ${outputPath}`
      );


  


      const s3Key = `thumbnails/${streamId}.jpg`;
     await this.uploadFileToS3(outputPath, s3Key, this.bucketName, "image/jpeg");

      console.log(`Thumbnail uploaded to S3: ${s3Key}`);

      return s3Key;
    } catch (err) {
      console.error("Error generating thumbnail:", err);
      return null;
    }
  }
}









