# Importador CSV — TOTVS Protheus + PO-UI

Aplicação para importação em massa de dados via CSV no **TOTVS Protheus** usando as rotinas oficiais via `MSExecAuto`. Frontend em **Angular 15 + PO-UI 15**, embarcado no SmartClient pelo padrão **FwCallApp + protheus-lib-core**, sem consumo adicional de licença REST.

> Atualmente suporta **21 tabelas** do Protheus (Clientes, Fornecedores, Produtos, Estruturas, Tabela de Preços, etc.) com mapeamento automático de campos via SX3 e log detalhado por linha processada.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Tabelas suportadas](#tabelas-suportadas)
- [Pré-requisitos](#pré-requisitos)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Setup do backend (ADVPL/TLPP)](#setup-do-backend-advpltlpp)
- [Setup do frontend (Angular/PO-UI)](#setup-do-frontend-angularpo-ui)
- [Build e empacotamento do `.app`](#build-e-empacotamento-do-app)
- [Deploy embarcado no Protheus (FwCallApp)](#deploy-embarcado-no-protheus-fwcallapp)
- [Desenvolvimento standalone (sem Protheus)](#desenvolvimento-standalone-sem-protheus)
- [Endpoints REST](#endpoints-rest)
- [Formato dos arquivos CSV](#formato-dos-arquivos-csv)
- [Logs](#logs)
- [Solução de problemas](#solução-de-problemas)
- [Documentação adicional](#documentação-adicional)

---

## Arquitetura

```
┌─────────────────┐         ┌──────────────────────────┐
│   SmartClient   │  menu   │  U_ZIMPMENU (TLPP)       │
│   (Protheus)    │────────▶│  FwCallApp("importador") │
└─────────────────┘         └────────────┬─────────────┘
                                         │ extrai .app do RPO
                                         │ injeta token JWT
                                         ▼
                            ┌──────────────────────────┐
                            │  Frontend Angular/PO-UI  │
                            │   (rodando embarcado)    │
                            │                          │
                            │  protheus-lib-core       │
                            │  ├─ ProAppConfigService  │
                            │  └─ HTTP Interceptor     │
                            └────────────┬─────────────┘
                                         │ /zimportador/...
                                         ▼ (multiprotocolo)
                            ┌──────────────────────────┐
                            │  REST TLPP @Get/@Post    │
                            │  ZIMPREST.tlpp           │
                            │  ├─ /tabelas             │
                            │  ├─ /iniciar             │
                            │  ├─ /progresso           │
                            │  └─ /log                 │
                            └────────────┬─────────────┘
                                         │
                                         ▼
                            ┌──────────────────────────┐
                            │  ZIMPCSV.tlpp            │
                            │  ├─ Parse CSV (UTF-8)    │
                            │  ├─ Conversão por SX3    │
                            │  ├─ MSExecAuto loop      │
                            │  ├─ Progresso GlbValue   │
                            │  └─ Log por linha        │
                            └──────────────────────────┘
```

### Por que usar FwCallApp + protheus-lib-core?

| Aspecto                  | REST direto (browser externo)  | FwCallApp (embarcado)                   |
|--------------------------|--------------------------------|-----------------------------------------|
| Hospedagem dos estáticos | Servidor web externo / IIS     | Resource do RPO (extraído pela rotina)  |
| CORS                     | Necessário configurar          | Mesma origem — sem CORS                 |
| Autenticação             | Login próprio + Basic/JWT      | Token JWT automático (usuário logado)   |
| Licença                  | Consome licença REST padrão    | **Sem consumo adicional** (multiprotocolo) |
| Distribuição             | Copiar arquivos manualmente    | Aplicar patch do RPO                    |
| Atualização              | Recopiar arquivos no servidor  | Recompilar `.app` no RPO                |

---

## Tabelas suportadas

| Alias | Descrição                | Rotina ExecAuto | Tipo       |
|-------|--------------------------|-----------------|------------|
| SA1   | Clientes                 | CRMA980         | CADASTRO   |
| SA2   | Fornecedores             | MATA020         | CADASTRO   |
| SB1   | Produtos                 | MATA010         | CADASTRO   |
| SA3   | Vendedores               | MATA040         | CADASTRO   |
| SA4   | Transportadoras          | MATA050         | CADASTRO   |
| SA5   | Amarração Prod x Forn    | MATA061         | CADASTRO   |
| SA6   | Bancos                   | FINA070         | CADASTRO   |
| SB5   | Complemento Produto      | MATA180         | CADASTRO   |
| SE4   | Condições de Pagamento   | FINA140         | CADASTRO   |
| SED   | Naturezas Financeiras    | FINA040         | CADASTRO   |
| SF4   | Tipos de E/S (TES)       | MATA080         | CADASTRO   |
| SBM   | Grupos de Produto        | MATA015         | CADASTRO   |
| SAH   | Unidades de Medida       | MATA130         | CADASTRO   |
| NNR   | Armazéns                 | AGRA045         | CADASTRO   |
| CTT   | Centros de Custo         | CTBA180         | CADASTRO   |
| CT1   | Plano de Contas          | CTBA030         | CADASTRO   |
| SU5   | Contatos                 | TMKA070         | CADASTRO   |
| CC2   | Municípios IBGE          | GPEA350         | CADASTRO   |
| SG1   | Estruturas de Produto    | MATA110         | CAB_ITENS  |
| DA0   | Tabela de Preços         | MATA460         | CAB_ITENS  |
| SB2   | Saldos em Estoque        | MATA220         | CADASTRO   |

> O mapeamento fica em `U_ZIMPMAP()` no fonte [`backend/ZIMPCSV.tlpp`](backend/ZIMPCSV.tlpp). Para adicionar uma nova tabela, basta acrescentar uma linha `AAdd(aMap, ...)` com `{ALIAS, DESC, ROTINA, TIPO_EXEC, KEY_FIELDS}` e recompilar.

---

## Pré-requisitos

### Servidor Protheus
- **Build do AppServer** ≥ `7.00.191205P` (testado em `7.00.240223P-20260211`)
- **LIB do Framework** ≥ `20200214` (testado em `20260413`)
- **Release do RPO** ≥ `12.1.2510`
- **DBAccess** ativo com acesso a um SGBD (testado com MSSQL)
- `[Drivers] MultiProtocolPort=1` no `appserver.ini`
- `[General] App_Environment=<seu-ambiente>` no `appserver.ini`

### Estação de desenvolvimento
- **Node.js** ≥ 18 LTS (testado em 24.14)
- **npm** ≥ 9
- **Angular CLI 15** (instalado como devDependency)
- **TDS-VSCode** ou **TOTVS Developer Studio** clássico para compilar TLPP no RPO

---

## Estrutura do repositório

```
importador/
├── backend/                          # Fontes TLPP (compilar no RPO custom)
│   ├── ZIMPCSV.tlpp                  # Lógica principal: parse CSV + ExecAuto + log
│   ├── ZIMPREST.tlpp                 # Endpoints REST tlpp.rest (@Get/@Post)
│   └── ZIMPMENU.tlpp                 # Rotina de menu (chama FwCallApp)
│
├── frontend/                         # Angular 15 + PO-UI 15
│   ├── src/
│   │   ├── app/
│   │   │   ├── importador/           # Componente, módulo, service e model
│   │   │   ├── login/                # Tela de login (apenas modo standalone)
│   │   │   ├── app.component.ts      # Shell com toolbar/menu (oculto se embarcado)
│   │   │   ├── app.module.ts         # ProtheusLibCoreModule + roteamento
│   │   │   ├── auth.guard.ts         # Pula login quando insideProtheus()
│   │   │   ├── auth.interceptor.ts   # Fallback (lib injeta token automaticamente)
│   │   │   └── auth.service.ts       # Login Basic Auth (modo standalone)
│   │   ├── assets/data/
│   │   │   └── appconfig.json        # api_baseUrl="/" (FwCallApp resolve em runtime)
│   │   ├── environments/             # Apenas flag production
│   │   └── index.html                # <base href="/"> (obrigatório FwCallApp)
│   ├── scripts/
│   │   └── package-app.js            # Empacota dist/ → dist/importador.app
│   ├── angular.json
│   ├── proxy.conf.json               # Proxy /rest99 e /zimportador para dev
│   └── package.json
│
└── docs/
    ├── DOCUMENTACAO_TECNICA.docx
    └── GUIA_CONFIGURACAO_AMBIENTE.pdf
```

---

## Setup do backend (ADVPL/TLPP)

### 1. Configurar `appserver.ini`

Garanta as seguintes seções:

```ini
[General]
App_Environment=<NOME_DO_AMBIENTE>

[Drivers]
MultiProtocolPort=1

[HTTPREST]
Port=8090
SECURITY=1
URIs=HTTPURI

[HTTPURI]
URL=/rest99
PrepareIn=99
Instances=1,5,1,1
Environment=REST
CORSEnable=1
AllowOrigin=*
Public=zimportador/tabelas,zimportador/iniciar,zimportador/progresso,zimportador/log
```

> A `URL=/rest99` é livre — pode trocar para `/rest` ou outro prefixo. O frontend pega esse prefixo dinamicamente via `appconfig.json` quando embarcado.

### 2. Compilar os fontes TLPP no RPO custom

Pelo TDS-VSCode (ou TDS clássico):

```
backend/ZIMPCSV.tlpp     ← Ctrl+F9
backend/ZIMPREST.tlpp    ← Ctrl+F9
backend/ZIMPMENU.tlpp    ← Ctrl+F9
```

> Os fontes usam `Namespace` TLPP (`custom.importador.csv`, `custom.rest.importador`, `custom.menu.importador`). Inclua no Include Path do TDS-VSCode o caminho dos `.th` do seu RPO/build (ex.: `C:\TOTVS\Protheus_data\includes`).

### 3. Cadastrar item de menu

No **Configurador → Ambiente → Cadastros → Menu**:

| Campo            | Valor               |
|------------------|---------------------|
| Título           | Importador CSV      |
| Programa         | `U_ZIMPMENU`        |
| Tipo             | Função do usuário   |

---

## Setup do frontend (Angular/PO-UI)

### Instalação

```bash
cd frontend
npm install
```

> O projeto usa Angular **15** travado por compatibilidade com `protheus-lib-core@15`. **Não atualize para majors superiores** sem migrar todo o stack (PO-UI, lib-core, Angular).

### Configuração do ambiente

O arquivo [`src/assets/data/appconfig.json`](frontend/src/assets/data/appconfig.json) controla o endereço do REST:

```json
{
  "name": "Importador Protheus",
  "version": "1.0.0",
  "api_baseUrl": "/"
}
```

- `"/"` → modo embarcado FwCallApp resolve dinamicamente para `<host-do-AppServer>/<URI-REST>`.
- Para testes com URL fixa, troque para algo como `"https://meuhost:8090/rest99"`.

---

## Build e empacotamento do `.app`

```bash
cd frontend
npm run build:app
```

Esse comando:

1. Roda `ng build --configuration production` → gera arquivos otimizados em `dist/importador/`.
2. Empacota a pasta em ZIP via `scripts/package-app.js` e renomeia para `dist/importador.app`.

O resultado final: **`frontend/dist/importador.app`** (cerca de 250–500 KB compactados).

### Compilar o `.app` como resource no RPO

No TDS-VSCode, com o arquivo `dist/importador.app` selecionado: **Ctrl+F9**.

O log esperado:
```
[SUCCESS] Resource compiled successfully.
```

A partir daí, a rotina `U_ZIMPMENU` consegue extrair e renderizar o app embarcado no SmartClient.

---

## Deploy embarcado no Protheus (FwCallApp)

Sequência completa, do zero ao primeiro acesso:

| Passo | Ação                                             | Onde                       |
|-------|--------------------------------------------------|----------------------------|
| 1     | Configurar `appserver.ini`                       | Servidor Protheus          |
| 2     | Reiniciar serviço do AppServer                   | Servidor Protheus          |
| 3     | Compilar 3 fontes `.tlpp`                        | TDS-VSCode                 |
| 4     | `npm install` + `npm run build:app`              | Estação dev                |
| 5     | Compilar `dist/importador.app` no RPO            | TDS-VSCode                 |
| 6     | Cadastrar item de menu `U_ZIMPMENU`              | Configurador (SIGACFG)     |
| 7     | Acessar pelo SmartClient → Importador CSV        | Cliente Protheus           |

### Fluxo da `FwCallApp`

```
1. Usuário clica no item de menu "Importador CSV"
2. U_ZIMPMENU executa FwCallApp("importador")
3. AppServer extrai dist/importador.app do RPO para uma pasta temporária
4. Carrega token JWT (do usuário logado) em sessionStorage['ERPTOKEN']
5. Lê assets/data/appconfig.json e substitui api_baseUrl="/" pelo endereço dinâmico
6. Renderiza o Angular dentro do SmartClient (componente browser embarcado)
7. Cada chamada HTTP do Angular é interceptada pela protheus-lib-core,
   que injeta automaticamente: host + token Authorization
```

---

## Desenvolvimento standalone (sem Protheus)

Para iterar no frontend sem precisar empacotar/recompilar a cada mudança:

```bash
cd frontend
npm start
```

Acesse `http://localhost:4200`. O `proxy.conf.json` redireciona:

- `/rest99` → `http://localhost:8090`
- `/zimportador` → `http://localhost:8090/rest99`

Faça login com usuário/senha do Protheus (Basic Auth — apenas para dev). Quando rodando standalone, o `AuthGuard` exige login; quando embarcado via FwCallApp, `ProAppConfigService.insideProtheus()` retorna `true` e a tela de login é pulada (token JWT já está no sessionStorage).

---

## Endpoints REST

Todos sob a URI configurada em `[HTTPURI]` (ex.: `/rest99/zimportador/...`).

### `GET /tabelas`

Lista as 21 tabelas suportadas para popular o `po-select` do frontend.

```json
{
  "items": [
    {
      "alias": "SA1",
      "descricao": "Clientes",
      "rotina": "CRMA980",
      "label": "SA1 - Clientes"
    }
  ]
}
```

### `POST /iniciar`

Dispara a importação síncrona.

**Request:**
```json
{
  "alias": "SA1",
  "csv": "A1_COD;A1_LOJA;A1_NOME\n000001;01;Cliente Teste",
  "session": "uuid-abc-123"
}
```

**Response:**
```json
{
  "sucesso": true,
  "mensagem": "Importacao concluida. Ver log em: \\log\\importador\\IMP_SA1_20260423_143012.txt",
  "logPath": "\\log\\importador\\IMP_SA1_20260423_143012.txt",
  "ok": 1,
  "erro": 0,
  "total": 1
}
```

### `GET /progresso?session=<uuid>`

Consulta progresso em tempo real (memória global via `PutGlbValue`).

```json
{
  "atual": 10,
  "total": 100,
  "descricao": "Processando: 000001|01",
  "hora": "14:30:15",
  "percentual": 10.00
}
```

### `GET /log?session=<uuid>`

Devolve o conteúdo em texto plano do log mais recente em `ZZ_LOGDIR`.

---

## Formato dos arquivos CSV

- **Encoding:** UTF-8 (com ou sem BOM — o parser remove automaticamente)
- **Delimitador:** ponto e vírgula (`;`)
- **Quebra de linha:** LF (`\n`) ou CRLF (`\r\n`)
- **Primeira linha:** cabeçalho com nomes dos campos do dicionário (ex.: `A1_COD;A1_LOJA;A1_NOME`)
- **Demais linhas:** valores na mesma ordem

### Conversão automática de tipos (via SX3)

O importador lê `X3_TIPO` e `X3_TAMANHO` do dicionário e converte:

| X3_TIPO | Conversão                                    |
|---------|----------------------------------------------|
| `C` / `M` | `PadR(valor, X3_TAMANHO)`                  |
| `N`     | `Val(StrTran(valor, ",", "."))`              |
| `D`     | `SToD(valor)` no formato `YYYYMMDD`          |
| `L`     | `.T.` se valor ∈ `{"S", "T", "1"}`            |

### Exemplo — Clientes (SA1)

```csv
A1_COD;A1_LOJA;A1_NOME;A1_NREDUZ;A1_TIPO;A1_PESSOA;A1_END;A1_EST;A1_MUN
000001;01;Cliente Teste Ltda;CLI TESTE;F;J;Rua das Flores 100;SP;SAO PAULO
000002;01;Outro Cliente;OUTRO CLI;F;J;Av Paulista 1000;SP;SAO PAULO
```

> Campos `_FILIAL` são ignorados pelo importador — o ExecAuto preenche automaticamente com `cFilAnt`.

---

## Logs

Por padrão os logs ficam em **`<RootPath>\log\importador\`** (ex.: `C:\TOTVS\Protheus_1212510\protheus_data\log\importador\`).

Para customizar, crie no Configurador o parâmetro SX6 **`ZZ_LOGDIR`** com o caminho desejado (caminhos começando com `\` são relativos ao RootPath).

Cada importação gera um arquivo `IMP_<alias>_<data>_<hora>.txt`:

```
===============================================================
IMPORTADOR CSV - SA1 (Clientes)
Rotina ExecAuto: CRMA980
Data/Hora inicio: 23/04/2026 14:30:12
Usuario: Administrador | Filial: 0101
Sessao: uuid-abc-123
===============================================================

Total de registros a processar: 100
Campos detectados: 12

[SUCESSO] Linha 000001 | Chave: 000001|01
[SUCESSO] Linha 000002 | Chave: 000002|01
[ FALHA ] Linha 000003 | Chave: 000003|01
          Motivo: A1_END campo obrigatorio nao informado | ...

===============================================================
RESUMO:
  Total processado    : 100
  Sucesso             : 98
  Falhas              : 2
  Taxa sucesso        : 98.00%
Data/Hora fim: 23/04/2026 14:32:45
===============================================================
```

---

## Solução de problemas

### `Cannot find method TLPP.REST.REST:GETCONTENT`
Build antigo do TLPP. Use `oRest:getBodyRequest()` em vez de `getContent()`.

### `[ZIMPSTATIC] Falha ao carregar lista de tabelas`
O endpoint REST não está respondendo. Verifique:
- Serviço do AppServer no ar e ouvindo na porta REST configurada
- URI `/rest99` (ou equivalente) em `[HTTPURI]`
- Endpoints listados em `Public=` para evitar `401 Unauthorized`

### `Nao foi possivel criar log em <path>`
Permissão negada na pasta. O default `\log\importador\` (relativo ao RootPath) sempre funciona. Se você customizou via SX6 `ZZ_LOGDIR` para um caminho fora do RootPath (ex.: `C:\temp\`), garanta que a conta do serviço Windows tem **Modify** + **Write** nessa pasta.

### `argument #0 error, expected C->A, function strtran` (já corrigido)
Acontecia quando `GetAutoGRLog()` retornava NIL. O código atual valida o tipo antes de aplicar `StrTran`.

### Mensagem do tipo "ExecAuto falhou sem log estruturado"
A rotina ExecAuto rejeitou os dados mas não preencheu o log padrão. Causas comuns:
- Campo obrigatório faltando no CSV
- Valor incompatível com o tipo do dicionário
- Falta de algum `Private` específico da rotina (ex.: `lMsHelpAuto`, `lMsErroAuto`, `lAutoErrNoFile`)
- Verifique no Configurador se há gatilhos (SX7) ou regras impedindo a inclusão

### `ERESOLVE` ao instalar `protheus-lib-core`
A major do pacote precisa casar com a major do Angular. Para Angular 15, instale `@totvs/protheus-lib-core@15`. Para Angular 17 → v17. Para Angular 21 → v21.

### Tela embarcada não abre / FwCallApp em branco
- Confirme `[Drivers] MultiProtocolPort=1` e `[General] App_Environment=...`
- Verifique se o `dist/importador.app` foi compilado como resource no RPO (via TDS-VSCode → Compile File no `.app`)
- O log do AppServer (`console.log`) deve mostrar `[ZIMPMENU] Abrindo aplicativo 'importador' via FwCallApp...`

---

## Documentação adicional

- **TDN — FwCallApp:** [Abrindo aplicativos Web no Protheus](https://tdn.totvs.com/display/public/framework/FwCallApp+-+Abrindo+aplicativos+Web+no+Protheus)
- **TDN — protheus-lib-core:** [Versão 15](https://tdn.totvs.com/display/public/framework/Protheus-lib-core)
- **PO-UI:** [https://po-ui.io/](https://po-ui.io/)
- **Documentação técnica interna:** [`docs/DOCUMENTACAO_TECNICA.docx`](docs/DOCUMENTACAO_TECNICA.docx)
- **Guia de configuração de ambiente:** [`docs/GUIA_CONFIGURACAO_AMBIENTE.pdf`](docs/GUIA_CONFIGURACAO_AMBIENTE.pdf)

---

## Autor

**Felipe O. Pazetto** — desenvolvedor responsável pelo backend ADVPL/TLPP, frontend Angular/PO-UI e integração FwCallApp.
