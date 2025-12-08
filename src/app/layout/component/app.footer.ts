import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-footer',
  template: `<div class="layout-footer">
    <span class="text-sm">
      &copy; {{ currentYear }} Agrotech. Desenvolvido por
      <a
        href="https://www.linkedin.com/in/ramon-barbosa-8b9427223/"
        target="_blank"
        rel="noopener noreferrer"
        class=" "
        >Ramon</a
      >
    </span>
    <!-- <div class="flex gap-4 text-sm">
      <a href="https://agrotechcredito.com.br/" class="hover:underline"
        >Termos de Uso</a
      >
      <a href="https://agrotechcredito.com.br/" class="hover:underline"
        >Política de Privacidade</a
      >
      <a href="https://agrotechcredito.com.br/" class="hover:underline"
        >Contato</a
      >
    </div> -->
  </div>`,
})
export class AppFooter {
  currentYear = new Date().getFullYear();
}
