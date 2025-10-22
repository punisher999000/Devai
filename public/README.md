📁 Proyecto: Subir Imágenes a Google Drive
Un proyecto web simple para subir imágenes a una carpeta específica de Google Drive usando Node.js y la API de Google Drive.

🚀 Características
✅ Subir imágenes a Google Drive

✅ Autenticación segura con OAuth 2.0

✅ Interfaz web amigable

✅ Restricción a una carpeta específica

✅ Soporte para drag & drop

✅ Visualización de progreso

📋 Prerrequisitos
Node.js (versión 14 o superior)

Una cuenta de Google

Acceso a Google Cloud Console

🛠️ Instalación
1. Clonar o descargar el proyecto
bash
# Crear carpeta del proyecto
mkdir mi-proyecto-drive
cd mi-proyecto-drive
2. Instalar dependencias
bash
npm init -y
npm install express googleapis multer dotenv
3. Configurar Google Cloud Console
3.1 Crear proyecto
Ve a Google Cloud Console

Crea un nuevo proyecto

Espera a que se active

3.2 Habilitar API de Google Drive
Ve a "APIs y Servicios" > "Biblioteca"

Busca "Google Drive API"

Haz clic en "Habilitar"

3.3 Crear credenciales OAuth 2.0
Ve a "APIs y Servicios" > "Credenciales"

Haz clic en "+ CREAR CREDENCIALES" > "ID de cliente de OAuth"

Configura:

Tipo de aplicación: Aplicación web

Nombre: "Mi App de Drive"

URIs de redirección autorizadas:

text
http://localhost:3000/auth/callback
http://localhost:8080/auth/callback
Orígenes de JavaScript autorizados:

text
http://localhost:3000
http://localhost:8080
3.4 Descargar credenciales
Después de crear, descarga el archivo JSON

Renómbralo como credentials.json

4. Configurar variables de entorno
Crea un archivo .env en la raíz del proyecto:

env
# Google OAuth Configuration
CLIENT_ID=tu_client_id_aqui.apps.googleusercontent.com
CLIENT_SECRET=tu_client_secret_aqui
REDIRECT_URI=http://localhost:3000/auth/callback

# Google Drive Configuration
FOLDER_ID=id_de_tu_carpeta_en_drive
5. Obtener el ID de la carpeta en Drive
Ve a Google Drive

Crea una carpeta o usa una existente

Abre la carpeta y copia el ID de la URL:

text
https://drive.google.com/drive/folders/1ABCdefGHIjkLMNOpQRstuvXYZ123456789
↑ Este es el ID ↑
Pega el ID en FOLDER_ID en el archivo .env

🏃‍♂️ Ejecutar el proyecto
1. Iniciar el servidor
bash
node server.js
2. Abrir en el navegador
Ve a: http://localhost:3000

3. Flujo de uso
Autenticar: Haz clic en "Autenticar con Google"

Permitir acceso: Autoriza la aplicación en Google

Subir archivos: Usa el área de drag & drop o haz clic para seleccionar

Verificar: Los archivos aparecerán en tu carpeta de Drive

📁 Estructura del proyecto
text
mi-proyecto-drive/
├── server.js              # Servidor principal
├── .env                   # Variables de entorno
├── package.json           # Dependencias del proyecto
├── uploads/               # Carpeta temporal para archivos
│   └── (archivos temporales)
└── public/
    └── index.html         # Interfaz web
🔧 Archivos del proyecto
server.js
Servidor principal con Express.js que maneja:

Autenticación OAuth 2.0

Subida de archivos a Google Drive

APIs para el frontend

public/index.html
Interfaz web con:

Formulario de subida de archivos

Drag & drop

Visualización de estado

Manejo de errores

🐛 Solución de problemas comunes
Error 400: redirect_uri_mismatch
Solución: Verifica que las URIs en Google Cloud Console coincidan exactamente con las de tu archivo .env

Error: "No se recibió código de autorización"
Solución: Asegúrate de que el usuario haya aceptado los permisos en la pantalla de OAuth

Error: "The file exceeded the storage quota"
Solución: Verifica que tengas espacio disponible en Google Drive

Error: "Folder not found"
Solución: Verifica que el FOLDER_ID sea correcto y que la carpeta exista

🔒 Seguridad
Los tokens de acceso se almacenan en memoria (se pierden al reiniciar el servidor)

Los archivos subidos se eliminan después de procesarlos

Solo se solicita permiso para la carpeta específica (drive.file scope)

📝 Notas importantes
Modo desarrollo: Este proyecto está configurado para desarrollo local

Producción: Para usar en producción, necesitarías:

Dominio propio

Configurar HTTPS

Base de datos para almacenar tokens

Variables de entorno seguras

🎯 Próximos pasos posibles
Agregar vista de archivos subidos

Soporte para múltiples tipos de archivo

Límites de tamaño personalizables

Interfaz más elaborada

Sistema de usuarios

📞 Soporte
Si encuentras problemas:

Revisa la consola del navegador (F12)

Revisa los logs del servidor

Verifica que todas las configuraciones de Google Cloud Console estén correctas

📄 Licencia
Este proyecto es para fines educativos.