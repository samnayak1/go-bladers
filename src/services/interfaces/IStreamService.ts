


export interface IStreamService {
    
    createStream(userId: string, streamName: string): Promise<{ streamKey: string; streamUrl: string }>;

    

}