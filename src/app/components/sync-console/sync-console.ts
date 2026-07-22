import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-sync-console',
  imports: [FormsModule, CommonModule],
  templateUrl: './sync-console.html',
  styleUrl: './sync-console.scss',
})
export class SyncConsole implements OnInit, OnDestroy {
  logs: string[] = [];
  visible = true;
  live = false;
  latestIndex = -1;

  @ViewChild('terminalBox') terminalBox?: ElementRef<HTMLDivElement>;

  private liveTimer?: ReturnType<typeof setTimeout>;
  private logsSub?: Subscription;
  private clearSub?: Subscription;
  private ws = inject(WebsocketService);

  ngOnInit() {
    this.logsSub = this.ws.logs$.subscribe((msg) => {
      this.logs.push(msg);
      this.latestIndex = this.logs.length - 1;
      this.markLive();
      setTimeout(() => this.scrollToBottom(), 30);
    });

    this.clearSub = this.ws.clearTerminal$.subscribe(() => {
      this.clear();
    });
  }

  ngOnDestroy() {
    this.logsSub?.unsubscribe();
    this.clearSub?.unsubscribe();
    if (this.liveTimer) {
      clearTimeout(this.liveTimer);
    }
  }

  scrollToBottom() {
    const el = this.terminalBox?.nativeElement || document.getElementById('terminal-box');
    if (!el) {
      return;
    }

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }

  clear() {
    this.logs = [];
    this.latestIndex = -1;
    this.live = false;
    setTimeout(() => this.scrollToBottom(), 50);
  }

  openTerminal() {
    this.visible = true;
    setTimeout(() => this.scrollToBottom(), 50);
  }

  closeTerminal() {
    this.visible = false;
  }

  private markLive() {
    this.live = true;
    if (this.liveTimer) {
      clearTimeout(this.liveTimer);
    }
    this.liveTimer = setTimeout(() => {
      this.live = false;
    }, 1800);
  }
}
