export class Auth {
  public nuCpf: string = '';
  public dsSenha: string = '';
  public accessToken?: string;
  public tokenTemporario?: string;
  public token?: string;
  public tpGlobal?: string;
  public precisaSelecionarOrganizacao: boolean = false;
  public trocarSenha: boolean = false;
  public organizacoes: any[] = [];
  public idOrganizacao?: string;
  public dsRole?: string;
  public permissoes: any[] = [];
  public nmUsuario?: string;
  public nmEmail?: string;
}
