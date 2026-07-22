import { Injectable, signal } from '@angular/core';

export interface ProductTip {
  id: string;
  message: string;
  ctaLabel?: string;
  ctaRoute?: string;
}

const TIPS: ProductTip[] = [
  {
    id: 'conexao-padrao',
    message: 'Marque uma conexão como padrão para liberar estrutura e dados.',
    ctaLabel: 'Ver conexões',
    ctaRoute: '/client/conexao',
  },
  {
    id: 'estrutura-depois-conexao',
    message: 'Depois de conectar Cloud e Local, sincronize a estrutura antes dos dados.',
    ctaLabel: 'Ir para estrutura',
    ctaRoute: '/client/estrutura',
  },
  {
    id: 'dados-depois-estrutura',
    message: 'Com a estrutura alinhada, sincronize os dados no mesmo base/esquema.',
    ctaLabel: 'Ir para dados',
    ctaRoute: '/client/dados',
  },
];

const STORAGE_KEY = 'sincdb.tips.dismissed';

@Injectable({ providedIn: 'root' })
export class ProductTipsService {
  private dismissed = new Set<string>(this.readDismissed());
  private tipIndex = 0;

  readonly activeTip = signal<ProductTip | null>(this.resolveTip());

  dismiss(id: string) {
    this.dismissed.add(id);
    this.persist();
    this.tipIndex += 1;
    this.activeTip.set(this.resolveTip());
  }

  refresh() {
    this.activeTip.set(this.resolveTip());
  }

  private resolveTip(): ProductTip | null {
    const available = TIPS.filter((tip) => !this.dismissed.has(tip.id));
    if (!available.length) {
      return null;
    }
    return available[this.tipIndex % available.length];
  }

  private readDismissed(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.dismissed]));
    } catch {
      // ignore quota / private mode
    }
  }
}
