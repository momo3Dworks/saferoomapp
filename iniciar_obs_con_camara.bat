@echo off
echo ===============================================================
echo  Iniciando OBS Studio con Permisos de Camara y WebGPU Activados
echo ===============================================================

set OBS_PATH="C:\Program Files\obs-studio\bin\64bit\obs64.exe"

if exist %OBS_PATH% (
    echo Iniciando OBS con flags de Chromium MediaStream y WebGPU...
    cd /d "C:\Program Files\obs-studio\bin\64bit"
    start "" obs64.exe --enable-media-stream --use-fake-ui-for-media-stream --enable-unsafe-webgpu
    echo Listo! OBS iniciado con soporte WebGPU y DroidCam.
) else (
    echo OBS no se encontro en la ruta estandar de 64 bits.
    echo Si lo instalaste en otra carpeta, agrega estos parametros a tu acceso directo:
    echo --enable-media-stream --use-fake-ui-for-media-stream --enable-unsafe-webgpu
    pause
)
