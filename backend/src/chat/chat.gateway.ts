import { Logger } from "@nestjs/common";
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";


@WebSocketGateway({
    cors: {
        origin: "http://localhost:5173"
    }
})
export class ChatGateway {
    @WebSocketServer()
    server: Server

    private logger: Logger = new Logger('ChatGateway');

    @SubscribeMessage('sendMessage')
    handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sender: string; message: string },
    ): void {
        this.logger.log(`Message received from ${data.sender}: ${data.message}`);
        this.server.emit('receiveMessage', data);
    }

}