/** Representa uma tabela que pode ser importada. */
export interface TabelaImportador {
  alias: string;      // Ex: SA1
  descricao: string;  // Ex: Clientes
  rotina: string;     // Ex: MATA030
  label: string;      // Ex: "SA1 - Clientes"
}

/** Response da chamada GET /zimportador/tabelas */
export interface TabelasResponse {
  items: TabelaImportador[];
}

/** Payload enviado no POST /zimportador/iniciar */
export interface PayloadIniciarImportacao {
  alias: string;
  csv: string;
  session: string;
}

/** Response da chamada POST /zimportador/iniciar */
export interface ResultadoImportacao {
  sucesso: boolean;
  mensagem: string;
  logPath: string;
  ok: number;
  erro: number;
  total: number;
}

/** Response da chamada GET /zimportador/progresso/:session */
export interface ProgressoImportacao {
  atual: number;
  total: number;
  descricao: string;
  hora: string;
  percentual: number;
}
