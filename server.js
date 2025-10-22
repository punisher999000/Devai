const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
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

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// Configura OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

let userTokens = {};

// ===== RUTAS =====

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/auth', (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      prompt: 'consent'
    });
    
    console.log('🔗 Redirigiendo a Google OAuth');
    res.redirect(authUrl);
    
  } catch (error) {
    console.error('Error en /auth:', error);
    res.status(500).json({ error: 'Error de configuración OAuth' });
  }
});

app.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('Error OAuth:', error);
    return res.send(`
      <html>
      <body style="font-family: Arial; padding: 50px; text-align: center;">
        <h2 style="color: red;">Error de Google: ${error}</h2>
        <a href="/">Volver al inicio</a>
      </body>
      </html>
    `);
  }

  try {
    console.log('🔑 Intercambiando código por tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    userTokens = tokens;
    
    console.log('✅ Autenticación exitosa');
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Autenticación Exitosa</title>
        <meta http-equiv="refresh" content="3;url=/" />
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .success { 
            font-size: 28px; 
            margin: 30px 0;
          }
          .icon { 
            font-size: 64px; 
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="icon">✅</div>
        <div class="success">¡Autenticación Exitosa!</div>
        <p>Serás redirigido automáticamente...</p>
        <p><a href="/" style="color: #4CAF50;">Haz clic aquí si no redirige</a></p>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Error en callback:', error);
    res.send(`
      <html>
      <body style="font-family: Arial; padding: 50px; text-align: center;">
        <h2 style="color: red;">Error: ${error.message}</h2>
        <a href="/">Volver al inicio</a>
      </body>
      </html>
    `);
  }
});

app.get('/auth/status', (req, res) => {
  res.json({ 
    authenticated: !!userTokens.access_token
  });
});

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
        message: 'No estás autenticado' 
      });
    }

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

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name'
    });

    fs.unlinkSync(req.file.path);

    res.json({ 
      success: true, 
      message: '¡Archivo subido exitosamente!',
      fileId: response.data.id,
      fileName: response.data.name
    });

  } catch (error) {
    console.error('Error subiendo archivo:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error: ' + error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor DevAI corriendo en puerto ${PORT}`);
});