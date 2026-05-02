import { Upload } from "@aws-sdk/lib-storage";

import path from "path";
import s3 from "../../configs/storageBucket";

import { createReadStream, existsSync, readdirSync } from "fs";
import { readFile } from "fs/promises";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { StreamRepository } from "../../repository/stream.repository";

import { UserRepository } from "../../repository/user.repository";
import { IStream } from "../../models/stream.model";




export class StreamService {

     streamRepository:StreamRepository;
     userRepository:UserRepository
     bucketName:string;
     HLS_PATH:string;

     constructor(){
         this.streamRepository=new StreamRepository();
         this.bucketName=process.env.S3_BUCKET!;
         this.HLS_PATH="/opt/data/hls";
         this.userRepository=new UserRepository();

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
      const variantFiles = readdirSync(variantPath).map(f =>
        path.join(variantPath, f)
      );
      files.push(...variantFiles);
    }
  }

  return files;
}

private async uploadFileToS3(filePath: string, streamId: string, bucket: string): Promise<void> {
  const s3Key = `recordings/${streamId}/${path.relative(this.HLS_PATH, filePath)}`;

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

private async uploadAllFiles(files: string[], streamId: string, bucket: string): Promise<void> {
  console.log(`Uploading ${files.length} files to S3 for stream ${streamId}`);
  
  await Promise.all(
    files.map(filePath => this.uploadFileToS3(filePath, streamId, bucket))
  );
}

async uploadStreamToStorage(streamKey: string, streamId: string): Promise<void> {
  const bucket = process.env.S3_BUCKET!;

  const files = this.collectStreamFiles(streamKey);
  await this.uploadAllFiles(files, streamId, bucket);
  await this.streamRepository.updateStreamRecordingKey(streamId, `recordings/${streamId}`);

  console.log(`Stream ${streamId} uploaded to S3`);
}


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

private async getSegmentStreamHelper(variant:string,segment: string, username: string, streamKey: string): Promise<string | null>{
  const actualVariant = variant.replace(new RegExp(username, "g"), streamKey);
  const segmentPath = path.join(this.HLS_PATH,actualVariant, segment);

  if (!existsSync(segmentPath)) return null;

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
    }

}

async getAllStreamsOfUser(userId:string){
     
     const streams=await this.streamRepository.getStreamsByUserId(userId);
     return streams;
}


async getStreamById(streamId: string, userId: string): Promise<IStream | null> {
  return await this.streamRepository.getStreamById(streamId, userId);
}



}