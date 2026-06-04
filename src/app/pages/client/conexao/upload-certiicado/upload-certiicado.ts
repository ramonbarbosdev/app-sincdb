import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { BaseService } from '../../../../services/base.service';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-upload-certiicado',
  imports: [CommonModule, FileUploadModule, ButtonModule],
  templateUrl: './upload-certiicado.html',
  styleUrl: './upload-certiicado.scss',
})
export class UploadCertiicado {
  @Input() arquivoValido: boolean = false;
  @Output() certificadoEnviado = new EventEmitter<any>();

  selectedFile!: File | null;
  mensagem: string = '';
  carregando: boolean = false;
  private baseService = inject(BaseService);

  ngOnInit(): void {}

  onUpload(event: any, fileUpload: FileUpload) {
    const file: File = event.files[0];
    this.selectedFile = file;

    const formData = new FormData();
    formData.append('arquivo', file);

    this.carregando = true;

    this.baseService.uploadFile(`conexao/certificado/upload`, formData).subscribe({
      next: (res) => {
        this.mensagem = this.obterMensagem(res);
        this.carregando = false;
        this.certificadoEnviado.emit(res || true);
        fileUpload.clear();
      },
      error: (err) => {
        console.error('Erro upload', err);
        this.mensagem = `Erro: ${err.error || err.message}`;
        this.carregando = false;
        this.certificadoEnviado.emit(false);
      },
    });
  }

  private obterMensagem(res: any): string {
    if (typeof res === 'string') {
      return res;
    }

    return res?.message || res?.mensagem || 'Certificado enviado.';
  }
}
