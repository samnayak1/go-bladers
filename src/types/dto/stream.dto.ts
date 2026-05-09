import { IStream } from "../../models/stream.model";



export interface StreamResponseDto {
  id: string;
  name: string;

  username: string;
  userId: string;

  isLive: boolean;

  thumbnailUrl?: string | null;
  recordingKey?: string | null;

  createdAt: Date;
  endedAt?: Date;
}

export const toStreamDto = (
  stream: any
): StreamResponseDto => {
  return {
    id: stream._id.toString(),
    name: stream.name,
    username: stream.userId.username
       ,

    userId: stream.userId._id.toString(),

    isLive: stream.isLive,

    thumbnailUrl: stream.thumbnailUrl ?? null,
    recordingKey: stream.recordingKey ?? null,

    createdAt: stream.createdAt,
    endedAt: stream.endedAt,
  };
};