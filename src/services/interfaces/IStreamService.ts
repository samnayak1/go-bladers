import { IStream } from "../../models/stream.model";
import { StreamResponseDto } from "../../types/dto/stream.dto";


interface PaginatedStreamResult {
  streams: StreamResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}


export interface IStreamService {

  
  /**
   * Starts a new stream for the given stream key.
   * Creates a stream record and begins live segment upload polling.
   * @param streamKey - The RTMP stream key
   * @throws Error if user not found
   */
  startStream(streamKey: string): Promise<void>;

  /**
   * Ends an active stream, finalizes uploads, and generates thumbnail.
   * @param streamKey - The RTMP stream key
   */
  endStream(streamKey: string): Promise<void>;

  // --------------------------------------------------------------------------
  // Playlist Retrieval (Live HLS)
  // --------------------------------------------------------------------------
  
  /**
   * Gets the master HLS playlist for a user, with streamKey replaced by username.
   * Polls the filesystem until the .m3u8 file appears (max 5s).
   * @param userName - The username to lookup
   * @returns The master playlist content, or null if not found
   * @throws Error if user not found
   */
  getMasterPlaylist(userName: string): Promise<string | null>;

  /**
   * Gets a variant HLS playlist, with streamKey replaced by username.
   * Polls the filesystem until the index.m3u8 file appears (max 10s).
   * @param variant - The variant name (e.g., "720p", "1080p")
   * @param username - The username (used in the variant path)
   * @returns The variant playlist content, or null if not found
   * @throws Error if user not found
   */
  getVariantPlaylist(variant: string, username: string): Promise<string | null>;

  // --------------------------------------------------------------------------
  // Segment Retrieval (Live HLS)
  // --------------------------------------------------------------------------
  
  /**
   * Gets the filesystem path to a specific HLS segment.
   * Polls the filesystem until the .ts file appears (max 5s).
   * @param variant - The variant name
   * @param segment - The segment filename (e.g., "segment001.ts")
   * @param username - The username (used in the variant path)
   * @returns The absolute filesystem path, or null if not found
   * @throws Error if user not found
   */
  getSegmentPath(variant: string, segment: string, username: string): Promise<string | null>;

  // --------------------------------------------------------------------------
  // S3 / Recording Access
  // --------------------------------------------------------------------------
  
  /**
   * Gets an S3 object response for a given key.
   * @param key - The S3 object key
   * @returns The S3 GetObjectCommandOutput
   */
  getS3Object(key: string): Promise<any>; // Replace `any` with `GetObjectCommandOutput` from @aws-sdk/client-s3

  /**
   * Gets S3 object content with streamKey replaced by a display name.
   * @param key - The S3 object key
   * @param streamKey - The stream key to replace
   * @param replaceWith - The string to replace streamKey with
   * @returns The content string, or null if empty
   */
  getS3Content(key: string, streamKey: string, replaceWith: string): Promise<string | null>;

  // --------------------------------------------------------------------------
  // Stream Metadata
  // --------------------------------------------------------------------------
  
  /**
   * Gets a single stream by its ID.
   * @param streamId - The stream document ID
   */
  getStreamById(streamId: string): Promise<IStream | null>;

  /**
   * Gets all streams for a specific user with signed thumbnail URLs.
   * @param userId - The user document ID
   * @returns Array of stream DTOs
   */
  getAllStreamsOfUser(userId: string): Promise<StreamResponseDto[]>;

  /**
   * Gets the latest streams with pagination and signed thumbnail URLs.
   * @param page - Page number (1-based)
   * @param limit - Items per page
   * @returns Paginated stream results
   */
  getLatestStreams(page: number, limit: number): Promise<PaginatedStreamResult>;

  // --------------------------------------------------------------------------
  // Thumbnail Generation
  // --------------------------------------------------------------------------
  
  /**
   * Generates a thumbnail from the live HLS stream and uploads to S3.
   * @param streamKey - The RTMP stream key
   * @param streamId - The stream document ID
   * @returns The S3 key of the uploaded thumbnail, or null on failure
   */
  generateAndUploadThumbnail(streamKey: string, streamId: string): Promise<string | null>;
}