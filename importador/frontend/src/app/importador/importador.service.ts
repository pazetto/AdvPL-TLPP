import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  TabelasResponse,
  PayloadIniciarImportacao,
  ResultadoImportacao,
  ProgressoImportacao
} from './importador.model';

/**
 * Servico que encapsula as chamadas ao backend REST do Protheus.
 * Os endpoints usam caminho relativo - o interceptor da protheus-lib-core
 * (quando embarcado via FwCallApp) anexa host + api_baseUrl do appconfig.json
 * e o token JWT do sessionStorage['ERPTOKEN'].
 * Em modo dev (ng serve), o proxy.conf.json redireciona /rest99 para o AppServer.
 */
@Injectable({ providedIn: 'root' })
export class ImportadorService {
  private readonly base = '/rest99/zimportador';

  constructor(private http: HttpClient) {}

  /** GET /zimportador/tabelas */
  listarTabelas(): Observable<TabelasResponse> {
    return this.http.get<TabelasResponse>(`${this.base}/tabelas`);
  }

  /** POST /zimportador/iniciar */
  iniciarImportacao(
    payload: PayloadIniciarImportacao
  ): Observable<ResultadoImportacao> {
    return this.http.post<ResultadoImportacao>(
      `${this.base}/iniciar`,
      payload
    );
  }

  /** GET /zimportador/progresso/:session */
  consultarProgresso(session: string): Observable<ProgressoImportacao> {
    return this.http.get<ProgressoImportacao>(
      `${this.base}/progresso/${session}`
    );
  }

  /** GET /zimportador/log/:session */
  baixarLog(session: string): Observable<Blob> {
    return this.http.get(`${this.base}/log/${session}`, {
      responseType: 'blob'
    });
  }
}
