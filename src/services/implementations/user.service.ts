import { IUser } from "../../models/user.model";
import { UserRepository } from "../../repository/user.repository";

import crypto from "crypto"
import { toUserDto } from "../../types/dto/user.dto";

export class UserService {


  userRepository: UserRepository;


  constructor() {
    this.userRepository = new UserRepository()
  }


  async regenerateStreamKey(email: string): Promise<string> {

    const streamKey = crypto.randomBytes(16).toString("hex");

    await this.userRepository.regenerateStreamKey(email, streamKey);

    return streamKey;

  }

  async getUserByUsername(username: string) {
    return await this.userRepository.getUserByUsername(username);
  }

  async getUserByStreamKey(streamKey: string): Promise<IUser | null> {
    return await this.userRepository.getUserByStreamKey(streamKey);
  }

  async getUserDetails(username: string) {
    const user = await this.userRepository.getUserDetails(username);
    if (!user) throw new Error("User not found");
    return toUserDto(user);
  }

  async getContentCreators(page: number, limit: number) {
    const [creators, total] = await Promise.all([
      this.userRepository.getContentCreators(page, limit),
      this.userRepository.getContentCreatorsCount(),
    ]);



    return {
      creators: creators.map(user => toUserDto(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }








}