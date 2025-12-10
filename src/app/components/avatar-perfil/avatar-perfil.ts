import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AvatarModule } from 'primeng/avatar';
import { FileUpload } from 'primeng/fileupload';

@Component({
  selector: 'app-avatar-perfil',
  imports: [AvatarModule, CommonModule, FormsModule],
  templateUrl: './avatar-perfil.html',
  styleUrl: './avatar-perfil.scss',
})
export class AvatarPerfil {
  @Input() imagem: string = '';
  @Output() imagemChange = new EventEmitter<string>(); 
  @Output() fileChange = new EventEmitter<File | null>();
  @Output() removerChange = new EventEmitter<void>(); 

  private cd = inject(ChangeDetectorRef);
  selectedFile: File | null = null;

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagem = reader.result as string;

        // this.imagemChange.emit(this.imagem);
        this.fileChange.emit(this.selectedFile);
      };
      reader.readAsDataURL(file);
    }
    setTimeout(() => input.value = '', 0);
  }

  removerFoto(event: Event) {
    event.stopPropagation();

    this.selectedFile = null;
    this.imagem = '';

    this.imagemChange.emit(this.imagem);
    this.fileChange.emit(this.selectedFile);
    this.removerChange.emit();
  }
}
