import { inject, Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  public stompClient!: Client;
  public connected: boolean = false;

  constructor(private http: HttpClient) {
    this.initConnectionSocket();
  }

  private connectionReadySubject = new BehaviorSubject<boolean>(false);
  public connectionReady$ = this.connectionReadySubject.asObservable();

  private OnlineSubject = new Subject<void>();

  private progressoSubject = new Subject<any>();
  public progresso$ = this.progressoSubject.asObservable();

  private logsSubject = new Subject<string>();
  public logs$ = this.logsSubject.asObservable();

  private clearTerminalSubject = new Subject<void>();
  public clearTerminal$ = this.clearTerminalSubject.asObservable();

  public initConnectionSocket() {
    const url = `${environment.apiUrlWebSocket}`;
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(url),
      reconnectDelay: 5000,
      // debug: (str) => console.log(str),
    });

    this.stompClient.onConnect = (frame) => {
      this.connected = true;
      console.log('Conectado ao WebSocket');
      this.connectionReadySubject.next(true); //sinaliza

      this.stompClient.subscribe('/topic/online', (message: IMessage) => {
        const data = JSON.parse(message.body);
        this.OnlineSubject.next(data);
      });

      this.stompClient.subscribe('/topic/sync/progress', (message: IMessage) => {
        const data = JSON.parse(message.body);
        this.progressoSubject.next(data);
      });

      this.stompClient.subscribe('/topic/logs', (message: IMessage) => {
        const data = message.body;
        this.logsSubject.next(data);
      });
    };

    this.stompClient.onStompError = (frame) => {
      console.error('Erro STOMP:', frame);
    };

    this.stompClient.activate();
  }

  getOnline(): Observable<void> {
    return this.OnlineSubject.asObservable();
  }

  emitClearTerminal() {
    this.clearTerminalSubject.next();
  }

  sendMessage(destination: string, payload: any) {
    if (this.stompClient && this.connected) {
      this.stompClient.publish({
        destination,
        body: JSON.stringify(payload),
      });
    } else {
      console.warn('⚠️ Não conectado ao WebSocket');
    }
  }

  disconnect() {
    if (this.stompClient && this.connected) {
      this.stompClient.deactivate();
      this.connected = false;
    }
  }
}
