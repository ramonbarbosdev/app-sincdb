import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-home-client',
  imports: [CommonModule, ButtonModule],
  templateUrl: './home-client.html',
  styleUrl: './home-client.scss',
})
export class HomeClient {}
