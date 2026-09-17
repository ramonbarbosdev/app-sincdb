import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Login } from './login';
import { AuthService } from '../../../auth/auth.service';
import { MessageService } from 'primeng/api';
import { provideEnvironmentNgxMask } from 'ngx-mask';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthService', [
      'login',
      'checkAuth',
      'getRoleOrganizacaoAtiva',
      'clearSession',
      'selecionarOrganizacao',
    ]);
    auth.checkAuth.and.returnValue(of(null));
    auth.getRoleOrganizacaoAtiva.and.returnValue('ROLE_USER');

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        MessageService,
        provideEnvironmentNgxMask(),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start on credentials step', () => {
    expect(component.loginStep).toBe('credentials');
  });

  it('should go to organization step when login requires org selection', () => {
    auth.login.and.returnValue(
      of({
        precisaSelecionarOrganizacao: true,
        organizacoes: [
          { idOrganizacao: 1, nmOrganizacao: 'Org A' },
          { idOrganizacao: 2, nmOrganizacao: 'Org B' },
        ],
      })
    );
    component.objeto.nuCpf = '123.456.789-09';
    component.objeto.dsSenha = 'secret';

    component.entrar();

    expect(component.loginStep).toBe('organization');
    expect(component.listaEmpresa.length).toBe(2);
  });

  it('should return to credentials and clear session on back', () => {
    component.loginStep = 'organization';
    component.listaEmpresa = [{ code: '1', name: 'Org' } as any];

    component.voltarParaCredenciais();

    expect(auth.clearSession).toHaveBeenCalled();
    expect(component.loginStep).toBe('credentials');
    expect(component.listaEmpresa.length).toBe(0);
  });

  it('should show api error on login failure', () => {
    auth.login.and.returnValue(throwError(() => ({ error: { message: 'Credenciais inválidas' } })));
    component.objeto.nuCpf = '123.456.789-09';
    component.objeto.dsSenha = 'wrong';

    component.entrar();

    expect(component.apiError).toContain('Credenciais');
    expect(component.loginStep).toBe('credentials');
  });
});
