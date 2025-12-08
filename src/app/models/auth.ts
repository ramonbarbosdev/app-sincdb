export class Auth {
  public id_usuario!: number;
  public nm_usuario: string = '';
  public login: string = '';
  public senha: string = '';
  public role: string = '';
  public imd: string = '';
  public id_tenant!: string;
  public isAreaDev!: boolean;
  public tempToken: string = '';
}
