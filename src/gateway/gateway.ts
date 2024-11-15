/* eslint-disable @typescript-eslint/no-wrapper-object-types */
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MyGateway {
  private realms: {
    [realmName: string]: { rooms: { [roomName: string]: string[] } };
  } = {};
  @WebSocketServer()
  server: Server;

  // connexion
  handleConnection(client: Socket) {
    console.log(`Client Connected: ${client.id}`);
  }

  //   deconnexion
  handleDisconnect(client: Socket) {
    console.log(`Client deconnected: ${client.id}`);
  }

  // Créer un nouveau realm
  @SubscribeMessage('createRealm')
  handleCreateRealm(
    @MessageBody() realmName: string,
    @ConnectedSocket() client: Socket,
  ): void {
    console.log(realmName);
    if (!this.realms[realmName]) {
      this.realms[realmName] = { rooms: {} };
      client.emit('messageRealm', `Realm ${realmName} created successfuly`);
      console.log(this.realms);
    } else {
      client.emit('messageRealmError', `Realm ${realmName} already exist`);
    }
  }

  // Quitter un room dans un realm spécifique
  @SubscribeMessage('leaveRoomInRealm')
  handleLeaveRoomInRealm(
    @MessageBody() data: { realmName: string; roomName: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const { realmName, roomName } = data;
    if (this.realms[realmName] && this.realms[realmName].rooms[roomName]) {
      this.realms[realmName].rooms[roomName] = this.realms[realmName].rooms[
        roomName
      ].filter((id) => id !== client.id);
      client.leave(roomName);
      client.emit(
        'messageLeaveRoomRealm',
        `Vous avez quitté le room: ${roomName} dans le realm: ${realmName}`,
      );
    } else {
      client.emit(
        'messageLeaveRoomRealmError',
        `Room ${roomName} ou Realm ${realmName} n'existe pas`,
      );
    }
  }
  // Envoyer un message dans un room d'un realm spécifique
  @SubscribeMessage('sendMessageToRealmRoom')
  handleMessageToRealmRoom(
    @MessageBody()
    data: { realmName: string; roomName: string; message: string },
    @ConnectedSocket() client: Socket,
  ): void {
    console.log(data);
    const { realmName, roomName, message } = data;
    if (this.realms[realmName] && this.realms[realmName].rooms[roomName]) {
      this.server.to(roomName).emit('messageRealmRoom', client.id, message); // Diffuser dans le room
    } else {
      client.emit(
        'messageRealmRoomError',
        `Le room ${roomName} ou le realm ${realmName} n'existe pas`,
      );
    }
  }
  // Joindre un realm et un room spécifique
  @SubscribeMessage('joinRoomInRealm')
  handleJoinRoomInRealm(
    @MessageBody() data: { realmName: string; roomName: string },
    @ConnectedSocket() client: Socket,
  ): void {
    console.log(data);
    const { realmName, roomName } = data;
    if (this.realms[realmName]) {
      console.log('ok');
      if (!this.realms[realmName].rooms[roomName]) {
        this.realms[realmName].rooms[roomName] = [];
      }
      this.realms[realmName].rooms[roomName].push(client.id);
      console.log(this.realms);
      client.join(roomName);
      client.emit(
        'messageJoinRoomRealm',
        `You join the room ${roomName} in the realm ${realmName}`,
      );
    } else {
      client.emit('messageJoinRoomRealm', `Realm ${realmName} does not exist`);
    }
  }

  //   Recevoir un event (s'abonner à un message)
  @SubscribeMessage('message')
  handleEvent(@MessageBody() data: String, @ConnectedSocket() client: Socket) {
    // envoyer un event
    this.server.emit('message', client.id, data);
  }

  // Methode pour rejoindre un room spécifique
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ): void {
    client.join(room);
    client.emit('messageJoined', `you joined room: ${room}`);
  }

  // Methode pour quitter un room
  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(room);
    client.emit('message', `You leaved ${room}`);
  }

  // Methode pour envoyer un message à un room spécifique
  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody() data: { room: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(data.room).emit('messageRoom', client.id, data.message);
  }
}
