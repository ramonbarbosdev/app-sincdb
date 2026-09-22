import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

/** Redireciona /client para a home correta conforme o papel do usuário. */
@Component({
  standalone: true,
  template: '',
})
export class ClientDefaultRedirect implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.router.navigate(this.auth.getDefaultAppRoute(), { replaceUrl: true });
  }
}
