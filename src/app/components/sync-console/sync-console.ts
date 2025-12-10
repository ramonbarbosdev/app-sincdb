import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { WebsocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-sync-console',
  imports: [FormsModule, CommonModule],
  templateUrl: './sync-console.html',
  styleUrl: './sync-console.scss',
})
export class SyncConsole {
  logs: string[] = [];
  visible = true;

  constructor(private ws: WebsocketService) {}

  ngOnInit() {
    this.ws.logs$.subscribe((msg) => {
      this.logs.push(msg);
      setTimeout(() => this.scrollToBottom(), 50);
    });

    this.ws.clearTerminal$.subscribe(() => {
      this.clear();
    });
  }

  scrollToBottom() {
    const el = document.getElementById('terminal-box');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  clear() {
    this.logs = [];
    setTimeout(() => this.scrollToBottom(), 50);
  }

  openTerminal() {
    this.visible = true;
    setTimeout(() => this.scrollToBottom(), 50);
  }

  closeTerminal() {
    this.visible = false;
  }
}
