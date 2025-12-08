import { FlagOption } from "../models/flag-option";

export function gerarSequenciaLista(
  objeto: any,
  nomeItem: any,
  sequenciaApi: string,
  cd_form: string
): any {
  const sequenciaInicial = parseInt(sequenciaApi, 10);
  let novaSequencia = sequenciaInicial;

  if (objeto[nomeItem] && Array.isArray(objeto[nomeItem])) {
    const sequenciasLocais = objeto[nomeItem]
      .map((item: any) => parseInt(item[cd_form], 10))
      .filter((s: number) => !isNaN(s));
    while (sequenciasLocais.includes(novaSequencia)) {
      novaSequencia++;
    }
  }

  return novaSequencia;
}


 export function getObjetoLabel(
    lista: FlagOption[],
    id: number | string,
    extra?: string
  ): string {
    const objeto = lista.find((c) => c.code == id);
    if (extra) return objeto ? (objeto as any)?.extra[extra] : 'Sem label';

    return objeto ? (objeto as any)?.name : 'Sem label';
  }