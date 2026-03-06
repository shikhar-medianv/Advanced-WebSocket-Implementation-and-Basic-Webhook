import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './entity/chat.entity';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(Chat)
        private chatRepository: Repository<Chat>,
    ) { }

    async saveMessage(sender: string, message: string, receiver?: string): Promise<Chat> {
        const chat = new Chat();
        chat.sender = sender;
        chat.message = message;
        // @ts-ignore - TypeORM handles null for nullable columns but TS might complain
        chat.receiver = receiver || null;

        return this.chatRepository.save(chat);
    }

    async getGlobalHistory(): Promise<Chat[]> {
        // Retrieve messages where receiver is null
        return this.chatRepository
            .createQueryBuilder('chat')
            .where('chat.receiver IS NULL')
            .orderBy('chat.createdAt', 'ASC')
            .getMany();
    }

    async getPrivateHistory(user1: string, user2: string): Promise<Chat[]> {
        // Retrieve messages between two specific users
        return this.chatRepository
            .createQueryBuilder('chat')
            .where('(chat.sender = :user1 AND chat.receiver = :user2)')
            .orWhere('(chat.sender = :user2 AND chat.receiver = :user1)')
            .setParameters({ user1, user2 })
            .orderBy('chat.createdAt', 'ASC')
            .getMany();
    }
}