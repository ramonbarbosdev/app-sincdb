import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InfoAtividades } from "../../../components/info-atividades/info-atividades";
import { ComparativoEstrutura } from "../../../components/comparativo-estrutura/comparativo-estrutura";

@Component({
  selector: 'app-home-client',
  imports: [CommonModule, ButtonModule, InfoAtividades, ComparativoEstrutura],
  templateUrl: './home-client.html',
  styleUrl: './home-client.scss',
})
export class HomeClient {}
