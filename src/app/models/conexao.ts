export type TipoConexao = 'ORIGEM' | 'DESTINO' | 'AMBOS';

export interface ConexaoCloud {
  db_cloud_host: string;
  db_cloud_port: string;
  db_cloud_user: string;
  db_cloud_password: string;
  fl_admin: boolean;
}

export interface ConexaoLocal {
  db_local_host: string;
  db_local_port: string;
  db_local_user: string;
  db_local_password: string;
}

export class Conexao {
  public id?: string;
  public id_conexao?: string;
  public nm_conexao: string = '';
  public fl_padrao: boolean = false;
  public fl_ativo: boolean = true;
  public tipo: TipoConexao = 'AMBOS';
  public arquivoValidado: boolean = false;
  public db_cloud_host: string = '';
  public db_cloud_port: string = '5432';
  public db_cloud_user: string = '';
  public db_cloud_password: string = '';
  public fl_admin: boolean = false;
  public db_local_host: string = '';
  public db_local_port: string = '5432';
  public db_local_user: string = '';
  public db_local_password: string = '';
  public cloud: ConexaoCloud = {
    db_cloud_host: '',
    db_cloud_port: '5432',
    db_cloud_user: '',
    db_cloud_password: '',
    fl_admin: false,
  };
  public local: ConexaoLocal = {
    db_local_host: '',
    db_local_port: '5432',
    db_local_user: '',
    db_local_password: '',
  };
}
