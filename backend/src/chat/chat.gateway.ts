import { Logger } from "@nestjs/common";
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ChatService } from "./chat.service";

@WebSocketGateway({
    cors: {
        origin: "http://localhost:5173"
    }
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server

    private logger: Logger = new Logger('ChatGateway');
    private activeUsers: Map<string, string> = new Map(); // username -> socketId

    constructor(
        private jwtService: JwtService,
        private chatService: ChatService
    ) { }

    async handleConnection(client: Socket) {
        const token = client.handshake.auth?.token || client.handshake.headers?.token;
        if (!token) {
            this.logger.warn(`Connection attempt without token: ${client.id}`);
            client.disconnect();
            return;
        }

        try {
            const payload = await this.jwtService.verifyAsync(token);
            const username = payload.username;

            this.activeUsers.set(username, client.id);
            this.logger.log(`User connected: ${username} (${client.id})`);

            // Broadcast updated user list
            this.broadcastUserList();

            // Send global history on connection
            const globalHistory = await this.chatService.getGlobalHistory();
            client.emit('chatHistory', { type: 'global', messages: globalHistory });

        } catch (err) {
            this.logger.error(`Invalid token for client ${client.id}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        let disconnectedUser = '';
        for (const [username, socketId] of this.activeUsers.entries()) {
            if (socketId === client.id) {
                disconnectedUser = username;
                this.activeUsers.delete(username);
                break;
            }
        }

        if (disconnectedUser) {
            this.logger.log(`User disconnected: ${disconnectedUser}`);
            this.broadcastUserList();
        }
    }

    private broadcastUserList() {
        const users = Array.from(this.activeUsers.keys());
        this.server.emit('userList', users);
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sender: string; message: string },
    ): Promise<void> {
        this.logger.log(`Global message from ${data.sender}: ${data.message}`);

        // Save to DB
        const savedMessage = await this.chatService.saveMessage(data.sender, data.message);

        // Broadcast the saved message (includes timestamp/id)
        this.server.emit('receiveMessage', savedMessage);
    }

    @SubscribeMessage('sendPrivateMessage')
    async handlePrivateMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { to: string; sender: string; message: string },
    ): Promise<void> {
        // Save to DB
        const savedMessage = await this.chatService.saveMessage(data.sender, data.message, data.to);

        const targetSocketId = this.activeUsers.get(data.to);
        if (targetSocketId) {
            this.logger.log(`Private message from ${data.sender} to ${data.to}`);
            this.server.to(targetSocketId).emit('receivePrivateMessage', { ...savedMessage, isPrivate: true, to: data.to });
            // Also send back to sender for their UI
            client.emit('receivePrivateMessage', { ...savedMessage, isPrivate: true, to: data.to });
        } else {
            this.logger.warn(`Message target ${data.to} not found, but saved to DB`);
            // Still send back to sender so they see what they typed, even if user is offline
            client.emit('receivePrivateMessage', { ...savedMessage, isPrivate: true, to: data.to });
        }
    }

    @SubscribeMessage('requestHistory')
    async handleRequestHistory(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { requester: string; targetUser: string | null },
    ): Promise<void> {
        if (data.targetUser) {
            // Private history requested
            const history = await this.chatService.getPrivateHistory(data.requester, data.targetUser);
            client.emit('chatHistory', { type: 'private', target: data.targetUser, messages: history });
        } else {
            // Global history requested
            const history = await this.chatService.getGlobalHistory();
            client.emit('chatHistory', { type: 'global', messages: history });
        }
    }
}