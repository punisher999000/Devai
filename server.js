const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware importante para producción
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Configura OAuth2 - IMPORTANTE para producción
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI || `https://${process.env.RAILWAY_STATIC_URL}/auth/callback`
);

// Almacenamiento en memoria (en producción usarías Redis o DB)
let userTokens = {};

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para iniciar autenticación
app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent'
  });
  res.redirect(authUrl);
});

// Ruta de callback después de la autenticación
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    userTokens = tokens; // Guardar en memoria
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Autenticación Exitosa</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #4CAF50; font-size: 24px; }
          button { 
            background-color: #4CAF50; 
            color: white; 
            padding: 15px 30px; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer;
            margin: 20px;
          }
        </style>
      </head>
      <body>
        <div class="success">✅ ¡Autenticación exitosa!</div>
        <p>Ya puedes subir archivos a Google Drive.</p>
        <button onclick="window.close()">Cerrar ventana y volver a la aplicación</button>
        <script>
          // Enviar mensaje a la ventana principal
          if (window.opener) {
            window.opener.postMessage({ type: 'AUTH_SUCCESS' }, '*');
          }
          
          setTimeout(() => {
            window.close();
          }, 2000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <html>
      <body style="font-family: Arial; padding: 50px; text-align: center;">
        <h2 style="color: red;">Error en la autenticación</h2>
        <p>${error.message}</p>
        <a href="/">Volver al inicio</a>
      </body>
      </html>
    `);
  }
});

// Ruta para verificar autenticación
app.get('/auth/status', (req, res) => {
  res.json({ 
    authenticated: !!userTokens.access_token,
    hasTokens: !!userTokens.access_token
  });
});

// Ruta para subir archivos
app.post('/upload', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se seleccionó ningún archivo' 
      });
    }

    if (!userTokens.access_token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No estás autenticado. Por favor, autentícate primero.' 
      });
    }

    // Configura el cliente de Drive con el token
    oauth2Client.setCredentials(userTokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const fileMetadata = {
      'name': req.file.originalname,
      'parents': [process.env.FOLDER_ID]
    };

    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path)
    };

    // Subir a Google Drive
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink'
    });

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({ 
      success: true, 
      message: '¡Archivo subido exitosamente!',
      fileId: response.data.id,
      fileName: response.data.name,
      link: response.data.webViewLink
    });

  } catch (error) {
    console.error('Error:', error);
    
    // Limpiar archivo temporal en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error al subir el archivo: ' + error.message 
    });
  }
});

// Ruta de salud para Railway
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📝 Modo: ${process.env.NODE_ENV || 'development'}`);
});