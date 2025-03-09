@echo off
echo Iniciando o processo...

cd /d "%~dpnx0\.."

echo Construindo a aplicação...
call npm run build
if %errorlevel% neq 0 (
    echo ERRO: Falha na construção da aplicação!
    pause
    exit /b
)

echo Servindo a aplicação...
pushd dist
if %errorlevel% neq 0 (
    echo ERRO: Falha ao mudar para o diretório 'dist'!
    popd
    pause
    exit /b
)
serve
if %errorlevel% neq 0 (
    echo ERRO: Falha ao iniciar o servidor 'serve'!
    popd
    pause
    exit /b
)

echo Servidor iniciado! Abra o navegador.
popd
pause