import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  @Input() login: string = '';
  @Input() arquivoValido: boolean = false;
  @Output() certificadoEnviado = new EventEmitter<boolean>();

  selectedFile!: File | null;
  mensagem: string = '';
  carregando: boolean = false;
  private http = inject(HttpClient);
  private baseService = inject(BaseService);

  ngOnInit(): void {}

  onUpload(event: any, fileUpload: FileUpload) {
    const file: File = event.files[0];
    this.selectedFile = file;

    const formData = new FormData();
    formData.append('arquivo', file);

    this.carregando = true;

    if (this.login) {
      this.baseService.uploadFile(`conexao/certificado/upload/${this.login}`, formData).subscribe({
        next: (res) => {
          this.mensagem = `${res}`;
          this.carregando = false;
          this.certificadoEnviado.emit(true);
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
  }
}
