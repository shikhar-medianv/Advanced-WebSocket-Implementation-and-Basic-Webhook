import { Logger } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
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


}