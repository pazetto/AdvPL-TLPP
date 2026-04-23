/**
 * Empacota o build Angular como um .app para FwCallApp.
 *
 * Padrao oficial TOTVS:
 *   - Pasta com o nome do aplicativo em letras minusculas
 *   - Compactada em ZIP
 *   - Extensao renomeada para .app
 *   - Compilada como resource no RPO
 *
 * Saidas:
 *   dist/importador/         <- build do Angular (gerado pelo `ng build`)
 *   dist/importador.app      <- artefato final pronto para o RPO
 *
 * Uso:
 *   npm run build            (ng build → dist/importador/)
 *   npm run package:app      (este script → dist/importador.app)
 *   npm run build:app        (faz os dois em sequencia)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_NAME = 'importador';
const distDir = path.resolve(__dirname, '..', 'dist');
const srcDir = path.join(distDir, APP_NAME);
const zipPath = path.join(distDir, `${APP_NAME}.zip`);
const appPath = path.join(distDir, `${APP_NAME}.app`);

if (!fs.existsSync(srcDir)) {
  console.error(`[ERRO] Pasta de build nao encontrada: ${srcDir}`);
  console.error('       Rode "npm run build" antes de empacotar.');
  process.exit(1);
}

[zipPath, appPath].forEach(p => {
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

const isWin = process.platform === 'win32';

console.log(`[package-app] Compactando ${srcDir} -> ${zipPath}`);

if (isWin) {
  // Compress-Archive cria o zip com a pasta importador/ na raiz quando
  // recebemos a pasta (sem wildcard). Isso atende ao padrao do FwCallApp.
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${srcDir}' -DestinationPath '${zipPath}' -Force"`,
    { stdio: 'inherit' }
  );
} else {
  execSync(`cd "${distDir}" && zip -r "${APP_NAME}.zip" "${APP_NAME}"`, {
    stdio: 'inherit'
  });
}

fs.renameSync(zipPath, appPath);

console.log(`[package-app] Pronto: ${appPath}`);
console.log('[package-app] Compile esse arquivo como resource no RPO via TDS-VSCode.');
