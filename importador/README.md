# Importador Protheus via PO-UI

Aplicacao completa para importacao de dados CSV no Protheus utilizando
rotinas ExecAuto. Composto por:

- **Backend ADVPL/TLPP** em `backend/` — fontes para compilar no Protheus
- **Frontend Angular + PO-UI** em `frontend/` — interface web
- **Documentacao** em `docs/` — DOCX tecnico e PDF de setup

## Estrutura

```
importador/
|-- backend/
|   |-- ZIMPCSV.tlpp    (logica principal + ExecAuto mapping)
|   |-- ZIMPREST.tlpp   (endpoints REST tlpp.rest)
|   +-- ZIMPMENU.tlpp   (rotina de menu - chama FwCallApp)
|
|-- frontend/
|   |-- src/app/importador/        (componente + service + module)
|   |-- src/app/                    (app shell + auth + protheus-lib-core)
|   |-- src/assets/data/appconfig.json   (api_baseUrl para FwCallApp)
|   |-- scripts/package-app.js     (gera dist/importador.app)
|   |-- angular.json, tsconfig.json, package.json...
|
+-- docs/
    |-- DOCUMENTACAO_TECNICA.docx
    +-- GUIA_CONFIGURACAO_AMBIENTE.pdf
```

## Quick Start (desenvolvimento standalone)

1. Compile `ZIMPCSV.tlpp` e `ZIMPREST.tlpp` no Protheus (via TDS-VSCode).
2. Habilite o REST no `appserver.ini` (ver guia PDF).
3. No frontend: `npm install` e depois `npm start`.
4. Acesse `http://localhost:4200` e faca login com usuario do Protheus.

Consulte `docs/GUIA_CONFIGURACAO_AMBIENTE.pdf` para o setup detalhado.

## Deploy embarcado no Protheus via FwCallApp (oficial TOTVS)

Fluxo recomendado pela TOTVS para apps Angular/PO-UI no Protheus. Ver
[FwCallApp - TDN](https://tdn.totvs.com/display/public/framework/FwCallApp+-+Abrindo+aplicativos+Web+no+Protheus)
e [protheus-lib-core - TDN](https://tdn.totvs.com/display/public/framework/Protheus-lib-core).

### 1. Pre-requisitos do AppServer

- LIB do Protheus >= **20200214** e AppServer >= **7.00.191205P**
  (uso simplificado - apenas `App_Environment` em `[General]`)
- Porta multiprotocolo habilitada:
  ```ini
  [Drivers]
  MultiProtocolPort=1
  ```
- Ambiente declarado em `[General]`:
  ```ini
  [General]
  App_Environment=<nome-do-ambiente>
  ```

### 2. Build do .app

```bash
cd frontend
npm run build:app
```

Esse comando:
- Roda `ng build --configuration production` (saida: `dist/importador/`)
- Empacota a pasta em ZIP e renomeia para **`dist/importador.app`**

### 3. Compilar o .app como resource no RPO

Pelo TDS-VSCode:

1. Selecione `dist/importador.app`
2. Clique direito > **Compile File** (ou `Ctrl+F9`)

O `.app` vira um resource do RPO e fica disponivel para a `FwCallApp`.

### 4. Compilar o backend ADVPL/TLPP

```
backend/ZIMPCSV.tlpp     (logica + ExecAuto)
backend/ZIMPREST.tlpp    (endpoints REST)
backend/ZIMPMENU.tlpp    (User Function que chama FwCallApp("importador"))
```

### 5. Cadastrar no menu

No Configurador (SIGACFG > Ambiente > Cadastros > Menu), adicione um item
apontando para a rotina `U_ZIMPMENU`.

### 6. Abrir pelo SmartClient

Acesse o item de menu cadastrado. A `FwCallApp`:
- Carrega o token JWT em `sessionStorage['ERPTOKEN']`
- Le o `api_baseUrl` do `assets/data/appconfig.json` (default: `/rest99`)
- Renderiza a aplicacao embarcada no SmartClient
- **Nao consome licenca REST adicional** (multiprotocolo)

### Beneficios desse fluxo

| Aspecto                   | Sem FwCallApp                       | Com FwCallApp + protheus-lib-core    |
|---------------------------|-------------------------------------|--------------------------------------|
| Hospedagem dos estaticos  | Servidor web externo / URI custom   | Resource do RPO (FwCallApp extrai)   |
| CORS                      | Necessario configurar               | Mesmo origem - sem CORS              |
| Autenticacao              | Login proprio                       | Token JWT automatico (usuario logado)|
| Licenca                   | Consome licenca REST                | Sem consumo adicional                |
| Distribuicao              | Copiar arquivos manualmente         | Aplicar patch do RPO                 |

## Tabelas suportadas

19 tabelas Protheus mapeadas com suas rotinas ExecAuto:

| Alias | Descricao              | ExecAuto |
|-------|------------------------|----------|
| SA1   | Clientes               | MATA030  |
| SA2   | Fornecedores           | MATA020  |
| SB1   | Produtos               | MATA010  |
| SA3   | Vendedores             | MATA040  |
| SA4   | Transportadoras        | OMSA040  |
| SA5   | Prod x Fornec          | MATA060  |
| SA6   | Bancos                 | FINA070  |
| SB5   | Complemento Produto    | MATA180  |
| SE4   | Cond. Pagamento        | FINA140  |
| SED   | Naturezas Financeiras  | FINA040  |
| SF4   | TES                    | MATA080  |
| SBM   | Grupos de Produto      | MATA015  |
| SAH   | Unidades de Medida     | MATA130  |
| NNR   | Armazens               | MATA008  |
| CTT   | Centros de Custo       | CTBA180  |
| CT1   | Plano de Contas        | CTBA030  |
| SU5   | Contatos               | TMKA070  |
| SB2   | Saldos em Estoque      | MATA220  |
| SG1   | Estruturas de Produto  | MATA110  |
| DA0   | Tabela de Precos       | MATA460  |
| CC2   | Municipios IBGE        | GPEA350  |
