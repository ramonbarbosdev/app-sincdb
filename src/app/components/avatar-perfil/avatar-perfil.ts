import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-avatar-perfil',
  imports: [
    AvatarModule,
    CommonModule,
    FormsModule,
    DialogModule,
    InputTextModule,
    ButtonModule,
  ],
  templateUrl: './avatar-perfil.html',
  styleUrl: './avatar-perfil.scss',
})
export class AvatarPerfil {
  @Input() imagem: string = '';
  @Output() imagemChange = new EventEmitter<string>();
  @Output() removerChange = new EventEmitter<void>();

  private messageService = inject(MessageService);

  dialogVisible = false;
  linkInput = '';

  abrirDialogLink(): void {
    this.linkInput = this.imagem?.startsWith('http') ? this.imagem : '';
    this.dialogVisible = true;
  }

  confirmarLink(): void {
    const link = this.linkInput.trim();
    if (!link) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Link vazio',
        detail: 'Informe o link da imagem.',
      });
      return;
    }

    try {
      const parsed = new URL(link);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('protocolo inválido');
      }
    } catch {
      this.messageService.add({
        severity: 'warn',
        summary: 'Link inválido',
        detail: 'Use um endereço começando com http:// ou https://',
      });
      return;
    }

    this.imagem = link;
    this.imagemChange.emit(link);
    this.dialogVisible = false;
  }

  removerFoto(event: Event): void {
    event.stopPropagation();

    this.imagem = '';
    this.linkInput = '';
    this.imagemChange.emit('');
    this.removerChange.emit();
  }
}
