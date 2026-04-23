/**
 * Em producao o api_baseUrl vem de src/assets/data/appconfig.json (lido pela
 * protheus-lib-core). Para desenvolvimento standalone (ng serve), mantemos
 * este environment apenas para o flag `production`.
 */
export const environment = {
  production: false
};
