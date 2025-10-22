const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para móviles
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración simple de Multer (solo imágenes)
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  }
});

// Configuración OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

let accessToken = null;

// ===== RUTAS SIMPLIFICADAS =====

// Página principal optimizada para móviles
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Autenticación simple
app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent'
  });
  res.redirect(authUrl);
});

// Callback simplificado
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    accessToken = tokens.access_token;
    
    // Redirigir a la app con éxito
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Éxito</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: #4CAF50;
            color: white;
            margin: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .icon { font-size: 80px; margin: 20px 0; }
          .message { font-size: 24px; margin: 20px 0; }
          button { 
            background: white; 
            color: #4CAF50; 
            border: none; 
            padding: 15px 30px; 
            font-size: 18px; 
            border-radius: 25px; 
            margin: 20px; 
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="icon">✅</div>
        <div class="message">¡Listo!</div>
        <p>Ya puedes subir imágenes</p>
        <button onclick="window.close()">Cerrar</button>
        <script>
          if (window.opener) {
            window.opener.postMessage('AUTH_SUCCESS', '*');
            setTimeout(() => window.close(), 1000);
          }
        </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    res.send(`
      <html>
      <body style="font-family: sans-serif; padding: 20px; text-align: center;">
        <div style="color: red; font-size: 24px;">❌ Error</div>
        <p>${error.message}</p>
        <button onclick="window.history.back()">Volver</button>
      </body>
      </html>
    `);
  }
});

// Subida de imágenes simplificada
app.post('/upload', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, message: 'No se seleccionó imagen' });
    }

    if (!accessToken) {
      return res.json({ success: false, message: 'Necesitas autenticarte' });
    }

    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Subir a la carpeta específica
    const response = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        parents: [process.env.FOLDER_ID]
      },
      media: {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path)
      },
      fields: 'id, name'
    });

    // Limpiar
    fs.unlinkSync(req.file.path);

    res.json({ 
      success: true, 
      message: '✅ Imagen subida',
      fileName: response.data.name
    });

  } catch (error) {
    // Limpiar en error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.json({ 
      success: false, 
      message: 'Error: ' + error.message 
    });
  }
});

// Verificar autenticación
app.get('/auth/status', (req, res) => {
  res.json({ authenticated: !!accessToken });
});

app.listen(PORT, () => {
  console.log(`📱 App móvil corriendo en puerto ${PORT}`);
});