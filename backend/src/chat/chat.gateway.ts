import { Logger } from "@nestjs/common";
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";

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

    constructor(private jwtService: JwtService) { }

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
    handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sender: string; message: string },
    ): void {
        this.logger.log(`Global message from ${data.sender}: ${data.message}`);
        this.server.emit('receiveMessage', data);
    }

    @SubscribeMessage('sendPrivateMessage')
    handlePrivateMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { to: string; sender: string; message: string },
    ): void {
        const targetSocketId = this.activeUsers.get(data.to);
        if (targetSocketId) {
            this.logger.log(`Private message from ${data.sender} to ${data.to}`);
            this.server.to(targetSocketId).emit('receivePrivateMessage', data);
            // Also send back to sender for their UI
            client.emit('receivePrivateMessage', data);
        } else {
            this.logger.warn(`Message target ${data.to} not found`);
        }
    }
}