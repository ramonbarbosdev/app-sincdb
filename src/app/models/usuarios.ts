import { Usuarioempresa } from "./usuarioempresa";

export class Usuarios {
  public id!: number;
  public nome: string = '';
  public login: string = '';
  public senha: string = '';
  public img: string = '';
  public role: string = '';
  public cargo: string = '';
  public roles!: any;

  public itensUsuarioEmpresa: Usuarioempresa[] = [];
}
