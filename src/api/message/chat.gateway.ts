import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';
import { AuthService } from '../auth/auth.service';
import * as MessageDTO from './message.dto';

/** Har bir foydalanuvchi o'z shaxsiy xonasida — xabar faqat ikki tomon xonasiga ketadi. */
export const userRoom = (userId: string): string => `user:${userId}`;

/**
 * Chat gateway.
 *
 * Xavfsizlik modeli:
 *  - Handshake'da access token MAJBURIY (`auth.token` yoki `Authorization: Bearer`);
 *    token imzosi, muddati va sessiya (sid) revoke qilinmaganligi tekshiriladi.
 *    Tekshiruv socket.io MIDDLEWARE'da (`server.use`) — ulanish o'rnatilgunga qadar,
 *    shuning uchun birorta ham `@SubscribeMessage` handler autentifikatsiyasiz ishlamaydi
 *    (async `handleConnection` bilan poyga bo'lardi).
 *  - Foydalanuvchi faqat O'Z xonasiga (`user:<id>`) qo'shiladi — boshqa xonani tanlay olmaydi.
 *  - `senderId` payload'dan EMAS, autentifikatsiya qilingan socket'dan olinadi.
 *  - Payload `ValidationPipe` bilan tekshiriladi (whitelist).
 *  - CORS — `ConfiguredIoAdapter` (main.ts) orqali HTTP bilan bir xil `CORS_ORIGINS`.
 */
@WebSocketGateway()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) =>
      new WsException(
        errors.flatMap((e) => Object.values(e.constraints ?? {})),
      ),
  }),
)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly authService: AuthService,
  ) {}

  afterInit(server: Server): void {
    // Auth middleware: `next(err)` bo'lsa mijoz `connect_error` oladi va ulanish
    // umuman o'rnatilmaydi — handler'lar ishga tushmaydi.
    server.use(async (socket, next) => {
      const token = this.extractToken(socket);

      try {
        if (!token) {
          throw new Error('access token missing');
        }

        const { userId } = await this.authService.validateAccessToken(token);
        socket.data.userId = userId;
        next();
      } catch (err) {
        this.logger.warn(
          `auth failed socket=${socket.id}: ${(err as Error).message}`,
        );
        const error = new Error('UNAUTHORIZED') as Error & {
          data?: Record<string, unknown>;
        };
        error.data = {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing access token',
        };
        next(error);
      }
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const userId = client.data.userId as string | undefined;

    // Middleware o'tkazmagan socket bu yerga kelmaydi; himoya uchun baribir tekshiramiz.
    if (!userId) {
      client.disconnect(true);
      return;
    }

    await client.join(userRoom(userId));
    this.logger.debug(`connected user=${userId} socket=${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(
      `disconnected socket=${client.id} user=${client.data?.userId ?? '-'}`,
    );
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MessageDTO.SendMessage,
  ): Promise<MessageDTO.MessageResponse> {
    const senderId = client.data.userId as string | undefined;

    if (!senderId) {
      throw new WsException('Unauthorized');
    }

    const message = await this.messageService.create({ ...payload, senderId });

    this.emitNewMessage(message);

    // Ack sifatida yuboruvchiga qaytadi (socket.emit('sendMessage', payload, cb)).
    return message;
  }

  /** Yangi xabarni faqat qabul qiluvchi va yuboruvchi xonalariga yuboradi. */
  emitNewMessage(message: MessageDTO.MessageResponse): void {
    this.server
      .to(userRoom(message.receiverId))
      .to(userRoom(message.senderId))
      .emit('receiveMessage', message);
  }

  /** O'chirilgan xabar haqida faqat ikki tomonga xabar beradi (hammaga emas). */
  emitMessageDeleted(message: {
    id: string;
    senderId: string;
    receiverId: string;
  }): void {
    this.server
      .to(userRoom(message.receiverId))
      .to(userRoom(message.senderId))
      .emit('deleteMessage', { id: message.id });
  }

  /**
   * Token manbalari (ustuvorlik bo'yicha):
   *  1) socket.io-client: `io(url, { auth: { token } })`
   *  2) `Authorization: Bearer <token>` sarlavhasi (node mijozlar uchun)
   */
  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.replace(/^Bearer\s+/i, '').trim();
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && /^Bearer\s+/i.test(header)) {
      return header.replace(/^Bearer\s+/i, '').trim();
    }

    return undefined;
  }
}
