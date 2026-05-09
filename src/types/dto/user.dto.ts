


export interface UserResponseDto {
  id: string;
  username: string;
  email: string;

  streamKey?: string;

  isLive?: boolean;
  isVerified?: boolean;

  createdAt: Date;
}

export const toUserDto = (
  user: any,
  includeSensitiveFields: boolean = false
): UserResponseDto => {
  return {
    id: user._id.toString(),

    username: user.username,
    email: user.email,


    ...(includeSensitiveFields && {
      streamKey: user.streamKey,
    }),

    isLive: user.isLive ?? false,
    isVerified: user.isVerified ?? false,

    createdAt: user.createdAt,
  };
};