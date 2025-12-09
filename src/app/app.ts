import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BaseService } from './services/base.service';
import { PrimeNG } from 'primeng/config';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, ToastModule, ConfirmDialogModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('app-sincdb');

  baseService = inject(BaseService);

  waitForBackend() {
    const checkInterval = 1000; // 1 segundo
    const maxRetries = 20;
    let attempts = 0;

    const check = () => {
      this.baseService.findAll('status/').subscribe({
        next: (res) => {
          console.log(res);
          if (res.status) this.removeSplash();
        },
        error: () => {
          if (attempts++ < maxRetries) {
            setTimeout(check, checkInterval);
          } else {
            this.showOfflineMessage();
          }
        },
      });
    };

    check();
  }

  removeSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();
  }

  showOfflineMessage() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.innerHTML = '<p>Servidor indisponível. Tente novamente mais tarde.</p>';
    }
  }

  private primeng = inject(PrimeNG);

  ngOnInit() {

       this.waitForBackend();
    this.primeng.ripple.set(true);

    this.primeng.setTranslation({
      // Botões padrões
      startsWith: 'Começa com',
      contains: 'Contém',
      notContains: 'Não contém',
      endsWith: 'Termina com',
      equals: 'Igual a',
      notEquals: 'Diferente de',
      noFilter: 'Sem filtro',

      // Operadores de data
      dateIs: 'Data igual a',
      dateIsNot: 'Data diferente de',
      dateBefore: 'Data antes de',
      dateAfter: 'Data depois de',

      // Outras labels
      clear: 'Limpar',
      apply: 'Aplicar',
      matchAll: 'Todos',
      matchAny: 'Qualquer',
      addRule: 'Adicionar regra',
      removeRule: 'Remover regra',
      accept: 'Sim',
      reject: 'Não',

      // Paginação
      choose: 'Escolher',
      upload: 'Upload',
      cancel: 'Cancelar',

      dateFormat: 'dd/mm/yy',

      firstDayOfWeek: 0,
      dayNames: [
        'domingo',
        'segunda-feira',
        'terça-feira',
        'quarta-feira',
        'quinta-feira',
        'sexta-feira',
        'sábado',
      ],
      dayNamesShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
      dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
      monthNames: [
        'janeiro',
        'fevereiro',
        'março',
        'abril',
        'maio',
        'junho',
        'julho',
        'agosto',
        'setembro',
        'outubro',
        'novembro',
        'dezembro',
      ],
      monthNamesShort: [
        'jan',
        'fev',
        'mar',
        'abr',
        'mai',
        'jun',
        'jul',
        'ago',
        'set',
        'out',
        'nov',
        'dez',
      ],
      today: 'Hoje',
      weekHeader: 'Sem',
    });
  }
}
