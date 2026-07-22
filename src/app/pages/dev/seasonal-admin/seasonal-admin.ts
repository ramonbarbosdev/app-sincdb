import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { SeasonalThemeService } from '../../../services/seasonal-theme.service';
import {
  DEFAULT_SEASONAL_CONFIG,
  SEASONAL_THEMES,
  SeasonalAdminConfig,
  SeasonalMode,
  SeasonalThemeId,
  resolveAutoTheme,
} from '../../../models/seasonal-theme';

@Component({
  selector: 'app-seasonal-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ToggleSwitchModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './seasonal-admin.html',
  styleUrl: './seasonal-admin.scss',
})
export class SeasonalAdminPage implements OnInit, OnDestroy {
  private seasonal = inject(SeasonalThemeService);
  private messageService = inject(MessageService);

  themes = SEASONAL_THEMES;
  saving = false;
  loading = true;
  previewThemeId: SeasonalThemeId = 'natal';

  form: SeasonalAdminConfig = this.cloneConfig(DEFAULT_SEASONAL_CONFIG);

  modeOptions: { label: string; value: SeasonalMode }[] = [
    { label: 'Automático por data', value: 'auto' },
    { label: 'Forçar tema manual', value: 'manual' },
    { label: 'Desligado para todos', value: 'off' },
  ];

  themeOptions = [
    { label: 'Nenhum', value: 'none' as SeasonalThemeId },
    ...SEASONAL_THEMES.map((theme) => ({
      label: theme.label,
      value: theme.id,
    })),
  ];

  previewOptions = SEASONAL_THEMES.map((theme) => ({
    label: theme.label,
    value: theme.id as SeasonalThemeId,
  }));

  readonly aiPromptExample = `Quero personalizar o tema sazonal "[NOME]" do SyncDB.

Regras:
- NÃO mexer em formulários, SQL, sync, nem criar editor no painel.
- Manter discreto: só topbar / logo / greeting — nada invasivo.
- Respeitar prefers-reduced-motion.
- Entregar só alterações nos arquivos de tema/SCSS necessários.

Quero:
1. Mood/atmosfera: [ex.: Natal acolhedor, premium, sutil]
2. Cores: [ex.: vermelho #c45c48 + ouro suave]
3. Logo: [hat / badge / none]
4. Efeito: [snow / flags / petals / sparkle / none] — ou criar um novo se precisar
5. Saudação: "[texto]" + ícone PrimeIcons [ex.: pi pi-gift]
6. Janela de datas: [ex.: 01/12 a 26/12]
7. Intensidade: [bem sutil | médio | mais presente, ainda elegante]

=== ESTRUTURA QUE VOCÊ DEVE MONTAR EM CADA ARQUIVO ===

1) Tema — src/app/models/seasonal/themes/[id].theme.ts
\`\`\`ts
import { createSlots, SeasonalThemeDefinition } from '../seasonal.types';

export const MEU_TEMA: SeasonalThemeDefinition = {
  id: 'meu-tema', // deve existir no union SeasonalThemeId
  label: 'Meu tema',
  description: 'Resumo curto do visual.',
  accent: '#c45c48',
  glow: 'rgba(196, 92, 72, 0.28)',
  greeting: 'Mensagem padrão (fallback).',
  windows: [{ startMonth: 12, startDay: 1, endMonth: 12, endDay: 26 }],
  slots: createSlots({
    logo: { enabled: true, overlay: 'hat' },      // none | hat | badge
    topbar: { enabled: true, accent: '#c45c48' },
    ambient: { enabled: true, effect: 'snow' },   // none | snow | flags | petals | sparkle
    greeting: {
      enabled: true,
      message: 'Mensagem da faixa sob o topbar.',
      icon: 'pi pi-gift',
    },
  }),
};
\`\`\`

2) Registro do tema — src/app/models/seasonal/themes/index.ts
- importar MEU_TEMA
- incluir em SEASONAL_THEMES
- incluir id em SEASONAL_THEME_PRIORITY (ordem = prioridade se datas sobrepõem)
- reexportar no bloco export { ... }

3) Tipagem (só se for tema/efeito NOVO) — src/app/models/seasonal/seasonal.types.ts
- adicionar id em SeasonalThemeId
- se efeito novo: adicionar em SeasonalAmbientEffect

4) Efeito ambient — src/app/theme/seasonal/_effects-[efeito].scss
\`\`\`scss
/* Seletores SEMPRE por data-attr (reutilizável por qualquer tema) */
html[data-season-ambient='snow'] .layout-topbar {
  /* visual discreto no topbar */
}

@media (prefers-reduced-motion: reduce) {
  html[data-season-ambient='snow'] .layout-topbar {
    /* desligar animação / reduzir efeito */
  }
}
\`\`\`
Depois importar em src/app/theme/seasonal-theme.scss:
@import './seasonal/_effects-snow.scss';

5) Overlay de logo (se alterar hat/badge) — src/app/theme/seasonal/_logo-overlays.scss
\`\`\`scss
html[data-season-logo='hat'] .seasonal-logo-wrap::before { /* ... */ }
html[data-season-logo='hat'] .seasonal-logo-wrap::after { /* ... */ }
html[data-season-logo='badge'] .seasonal-logo-wrap::after { /* ... */ }
\`\`\`

6) Base (raramente) — src/app/theme/seasonal/_base.scss
- topbar line: html[data-season-topbar='on']
- greeting: html[data-season-greeting='on']
- CSS vars já aplicadas pelo service: --season-accent, --season-glow, --season-greeting

O SeasonalThemeService aplica no <html>:
data-season-logo / data-season-topbar / data-season-ambient / data-season-greeting
+ classes seasonal-active e seasonal-{id}

NÃO criar SCSS por tema misturando tudo (ex.: .seasonal-natal { ...efeito... }).
Efeito fica em _effects-*.scss; tema só escolhe o slot no *.theme.ts.`;

  promptCopied = false;

  readonly themeFileStructure = `export const X_THEME = {
  id, label, description,
  accent, glow, greeting,
  windows: [{ startMonth, startDay, endMonth, endDay }],
  slots: createSlots({
    logo: { enabled, overlay },
    topbar: { enabled, accent },
    ambient: { enabled, effect },
    greeting: { enabled, message, icon },
  }),
};`;

  readonly effectFileStructure = `html[data-season-ambient='snow'] .layout-topbar {
  /* visual do efeito */
}
@media (prefers-reduced-motion: reduce) {
  /* reduzir / desligar */
}
// importar em seasonal-theme.scss`;

  readonly logoFileStructure = `html[data-season-logo='hat'] .seasonal-logo-wrap::before {}
html[data-season-logo='hat'] .seasonal-logo-wrap::after {}
html[data-season-logo='badge'] .seasonal-logo-wrap::after {}`;

  readonly registerFileStructure = `// seasonal.types.ts → SeasonalThemeId + AmbientEffect
// themes/index.ts:
//   import + SEASONAL_THEMES
//   + SEASONAL_THEME_PRIORITY
//   + export { X_THEME }`;

  ngOnInit() {
    this.seasonal.loadFromBackend().subscribe({
      next: (config) => {
        this.form = this.cloneConfig(config);
        this.loading = false;
      },
      error: () => {
        this.form = this.cloneConfig(this.seasonal.config());
        this.loading = false;
      },
    });
  }

  ngOnDestroy() {
    this.seasonal.clearPreview();
  }

  get autoThemeLabel(): string {
    const id = resolveAutoTheme();
    if (id === 'none') {
      return 'Nenhum (fora de temporada)';
    }
    return this.themes.find((t) => t.id === id)?.label || id;
  }

  onPreview() {
    this.seasonal.previewTheme(this.previewThemeId);
  }

  onClearPreview() {
    this.seasonal.clearPreview();
  }

  async copyAiPrompt() {
    try {
      await navigator.clipboard.writeText(this.aiPromptExample);
      this.promptCopied = true;
      this.messageService.add({
        severity: 'success',
        summary: 'Prompt copiado',
        detail: 'Cole no chat da IA e complete os campos entre colchetes.',
      });
      window.setTimeout(() => {
        this.promptCopied = false;
      }, 2000);
    } catch {
      this.messageService.add({
        severity: 'warn',
        summary: 'Não foi possível copiar',
        detail: 'Selecione o texto do prompt manualmente.',
      });
    }
  }

  salvar() {
    this.saving = true;
    this.seasonal.saveConfig(this.cloneConfig(this.form)).subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Experiências sazonais',
          detail: 'Configuração salva. Visual dos temas continua definido no código.',
        });
      },
      error: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Salvo localmente',
          detail: 'Não foi possível persistir no backend; cache local atualizado.',
        });
      },
    });
  }

  private cloneConfig(config: SeasonalAdminConfig): SeasonalAdminConfig {
    return {
      enabled: !!config.enabled,
      mode: config.mode || 'auto',
      manualTheme: config.manualTheme || 'none',
      customMessage: '',
      themeOverrides: {},
    };
  }
}
