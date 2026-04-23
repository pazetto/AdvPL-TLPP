import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
  PoNotificationService,
  PoSelectOption,
  PoUploadComponent,
  PoDialogService,
  PoPageAction
} from '@po-ui/ng-components';
import { Subscription, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { ImportadorService } from './importador.service';
import {
  TabelaImportador,
  ProgressoImportacao,
  ResultadoImportacao
} from './importador.model';

/**
 * Componente principal do importador de CSV.
 *
 * Fluxo:
 *  1. Carrega tabelas disponiveis do backend (REST /zimportador/tabelas)
 *  2. Usuario seleciona tabela no po-select
 *  3. Campo readonly ao lado exibe "SA1 - Clientes" (via labelSelecionada)
 *  4. Usuario seleciona arquivo CSV no po-upload
 *  5. Ao clicar em "Importar", abre po-modal de confirmacao
 *  6. Ao confirmar, chama backend e inicia polling de progresso
 *  7. Mostra duas po-progress: atual + total
 *  8. Ao finalizar exibe resumo e link para baixar log
 */
@Component({
  selector: 'app-importador',
  templateUrl: './importador.component.html',
  styleUrls: ['./importador.component.scss']
})
export class ImportadorComponent implements OnInit, OnDestroy {
  @ViewChild('uploadComponent', { static: false })
  uploadComponent?: PoUploadComponent;

  // --- Estado da UI ---
  readonly titulo = 'Importador de Dados CSV';

  tabelas: TabelaImportador[] = [];
  opcoesTabela: PoSelectOption[] = [];
  tabelaSelecionada?: string;
  labelSelecionada = '';

  arquivoSelecionado?: File;
  arquivosSelecionados: any[] = [];
  conteudoCsv = '';

  importando = false;
  concluido = false;

  // --- Progresso ---
  progressoItem = 0;
  progressoTotal = 0;
  descricaoAtual = '';
  itensProcessados = 0;
  totalItens = 0;

  // --- Resultado ---
  resultado?: ResultadoImportacao;

  // --- Controle interno ---
  sessionId = '';
  private progressoSub?: Subscription;

  // Acoes do po-page
  readonly acoes: PoPageAction[] = [
    {
      label: 'Importar',
      action: () => this.confirmarImportacao(),
      disabled: () => !this.podeImportar(),
      icon: 'po-icon po-icon-upload'
    },
    {
      label: 'Limpar',
      action: () => this.limparFormulario(),
      icon: 'po-icon po-icon-delete'
    }
  ];

  constructor(
    private service: ImportadorService,
    private notification: PoNotificationService,
    private dialog: PoDialogService
  ) {}

  ngOnInit(): void {
    this.carregarTabelas();
  }

  ngOnDestroy(): void {
    this.pararPolling();
  }

  // ------------------------------------------------------------------
  // Carga inicial das tabelas
  // ------------------------------------------------------------------
  private carregarTabelas(): void {
    this.service.listarTabelas().subscribe({
      next: resp => {
        this.tabelas = resp.items;
        this.opcoesTabela = resp.items.map(t => ({
          label: `${t.alias} - ${t.descricao}`,
          value: t.alias
        }));
      },
      error: () => {
        this.notification.error('Falha ao carregar lista de tabelas.');
      }
    });
  }

  // ------------------------------------------------------------------
  // Handler de selecao no po-select
  // ------------------------------------------------------------------
  onTabelaChange(alias: string): void {
    this.tabelaSelecionada = alias;
    const tabela = this.tabelas.find(t => t.alias === alias);
    this.labelSelecionada = tabela
      ? `${tabela.alias} - ${tabela.descricao} (ExecAuto: ${tabela.rotina})`
      : '';
  }

  // ------------------------------------------------------------------
  // Handler de upload (leitura local do CSV como string)
  // ------------------------------------------------------------------
  onUploadChange(files: any[]): void {
    if (!files || files.length === 0) {
      this.arquivoSelecionado = undefined;
      this.conteudoCsv = '';
      return;
    }

    const rawFile = files[0].rawFile || files[0];
    this.arquivoSelecionado = rawFile;

    const reader = new FileReader();
    reader.onload = (ev: any) => {
      this.conteudoCsv = ev.target.result;
    };
    reader.onerror = () => {
      this.notification.error('Nao foi possivel ler o arquivo selecionado.');
    };
    reader.readAsText(rawFile, 'UTF-8');
  }

  // ------------------------------------------------------------------
  // Validacao para habilitar o botao de importar
  // ------------------------------------------------------------------
  podeImportar(): boolean {
    return !!this.tabelaSelecionada
        && !!this.conteudoCsv
        && !this.importando;
  }

  // ------------------------------------------------------------------
  // Abre modal de confirmacao antes de iniciar
  // ------------------------------------------------------------------
  confirmarImportacao(): void {
    if (!this.podeImportar()) {
      return;
    }

    const tabela = this.tabelas.find(t => t.alias === this.tabelaSelecionada);
    const nomeArquivo = this.arquivoSelecionado?.name ?? '';

    this.dialog.confirm({
      title: 'Confirmar importacao',
      message: `Voce esta prestes a importar o arquivo <b>${nomeArquivo}</b> `
             + `para a tabela <b>${tabela?.alias} - ${tabela?.descricao}</b>.<br><br>`
             + `Sera utilizada a rotina ExecAuto <b>${tabela?.rotina}</b>.<br><br>`
             + `<b>Deseja continuar?</b>`,
      confirm: () => this.iniciarImportacao(),
      cancel: () => {}
    });
  }

  // ------------------------------------------------------------------
  // Inicia a importacao e o polling de progresso
  // ------------------------------------------------------------------
  private iniciarImportacao(): void {
    this.importando = true;
    this.concluido = false;
    this.progressoItem = 0;
    this.progressoTotal = 0;
    this.itensProcessados = 0;
    this.totalItens = 0;
    this.resultado = undefined;

    this.sessionId = this.gerarSessionId();

    // Polling inicia antes, para pegar atualizacoes assim que backend comecar
    this.iniciarPolling();

    this.service.iniciarImportacao({
      alias: this.tabelaSelecionada!,
      csv: this.conteudoCsv,
      session: this.sessionId
    }).subscribe({
      next: resp => {
        this.resultado = resp;
        this.importando = false;
        this.concluido = true;
        this.pararPolling();

        if (resp.sucesso) {
          this.notification.success(
            `Importacao concluida: ${resp.ok}/${resp.total} sucesso, ${resp.erro} falhas.`
          );
        } else {
          this.notification.warning(resp.mensagem);
        }
      },
      error: () => {
        this.importando = false;
        this.pararPolling();
        this.notification.error('Erro ao executar importacao.');
      }
    });
  }

  // ------------------------------------------------------------------
  // Polling do progresso (a cada 500ms enquanto estiver importando)
  // ------------------------------------------------------------------
  private iniciarPolling(): void {
    this.progressoSub = interval(500).pipe(
      takeWhile(() => this.importando),
      switchMap(() => this.service.consultarProgresso(this.sessionId))
    ).subscribe({
      next: (prog: ProgressoImportacao) => {
        this.progressoTotal = prog.percentual;
        this.itensProcessados = prog.atual;
        this.totalItens = prog.total;
        this.descricaoAtual = prog.descricao;

        // Barra de progresso do item: como cada item no ExecAuto e rapido,
        // usamos uma animacao visual "indeterminate" vs completa por item
        this.progressoItem = prog.atual > this.itensProcessados ? 100 : 50;
      },
      error: () => {
        // Silencioso: proxima iteracao tentara novamente
      }
    });
  }

  private pararPolling(): void {
    if (this.progressoSub) {
      this.progressoSub.unsubscribe();
      this.progressoSub = undefined;
    }
  }

  // ------------------------------------------------------------------
  // Baixar log
  // ------------------------------------------------------------------
  baixarLog(): void {
    if (!this.sessionId) { return; }
    this.service.baixarLog(this.sessionId).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import_log_${this.sessionId}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.notification.error('Nao foi possivel baixar o log.')
    });
  }

  // ------------------------------------------------------------------
  // Limpar form
  // ------------------------------------------------------------------
  limparFormulario(): void {
    this.tabelaSelecionada = undefined;
    this.labelSelecionada = '';
    this.arquivoSelecionado = undefined;
    this.arquivosSelecionados = [];
    this.conteudoCsv = '';
    this.progressoItem = 0;
    this.progressoTotal = 0;
    this.descricaoAtual = '';
    this.itensProcessados = 0;
    this.totalItens = 0;
    this.concluido = false;
    this.resultado = undefined;
    this.sessionId = '';
    if (this.uploadComponent) {
      this.uploadComponent.clear();
    }
  }

  // ------------------------------------------------------------------
  private gerarSessionId(): string {
    return 'S' + Date.now().toString(36)
         + Math.random().toString(36).substr(2, 9);
  }
}
