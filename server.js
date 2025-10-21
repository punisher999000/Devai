const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

// Configuración básica
app.use(express.static('public'));
app.use(express.json());

// Configuración de Multer para subir archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });

// Configura OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Ruta principal - página web
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para iniciar autenticación
app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file']
  });
  res.redirect(authUrl);
});

// Ruta de callback después de la autenticación
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Guardamos el token de acceso (en un proyecto real usarías una base de datos)
    process.env.ACCESS_TOKEN = tokens.access_token;
    
    res.send('¡Autenticación exitosa! Ya puedes subir archivos.');
  } catch (error) {
    res.send('Error en la autenticación: ' + error.message);
  }
});

// Ruta para subir archivos
app.post('/upload', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No se seleccionó ningún archivo');
    }

    // Configura el cliente de Drive con el token
    oauth2Client.setCredentials({
      access_token: process.env.ACCESS_TOKEN
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // METADATOS DEL ARCHIVO
    const fileMetadata = {
      'name': req.file.originalname,
      // ⚠️ REEMPLAZA ESTO CON TU ID DE CARPETA REAL ⚠️
      'parents': [process.env.FOLDER_ID]
    };

    const media = {
      mimeType: req.file.mimetype,
      body: require('fs').createReadStream(req.file.path)
    };

    // Subir a Google Drive
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name'
    });

    // Limpiar archivo temporal
    require('fs').unlinkSync(req.file.path);

    res.json({ 
      success: true, 
      message: '¡Archivo subido exitosamente!',
      fileId: response.data.id,
      fileName: response.data.name
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al subir el archivo: ' + error.message 
    });
  }
});

// Crear carpeta uploads si no existe
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});