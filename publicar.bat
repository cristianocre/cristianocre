@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo === Publicar cristianocre.com ===
echo.

git status --short
echo.

set "msg="
set /p msg="Mensagem do commit (enter para padrao): "
if "%msg%"=="" set "msg=Atualizacao do site"

echo.
echo Rodando o teste local da funcao de leads...
node test\testar-inscrever-local.mjs
if errorlevel 1 (
  echo.
  echo O teste falhou. Nada foi publicado.
  pause
  exit /b 1
)

echo.
git add -A
git commit -m "%msg%"
if errorlevel 1 (
  echo.
  echo Nada para commitar.
  pause
  exit /b 0
)

git push
echo.
echo Pronto. A Vercel comeca o deploy em alguns segundos.
pause
