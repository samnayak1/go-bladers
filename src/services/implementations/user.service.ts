import { IUser } from "../../models/user.model";
import { UserRepository } from "../../repository/user.repository";

import crypto from "crypto"

export class UserService{


      userRepository:UserRepository;


      constructor(){
        this.userRepository=new UserRepository()
      }
 

      async regenerateStreamKey(email:string):Promise<string>{

        const streamKey=crypto.randomBytes(16).toString("hex");

        await this.userRepository.regenerateStreamKey(email,streamKey);

        return streamKey;

      }

     async getUserByUsername(username: string) {
  return await this.userRepository.getUserByUsername(username);
}

async getUserByStreamKey(streamKey: string): Promise<IUser | null> {
  return await this.userRepository.getUserByStreamKey(streamKey);
}

   
    
    
    




}