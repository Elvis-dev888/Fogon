import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import http from 'node:http'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const writableAppData = path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'Kiosco')

app.disableHardwareAcceleration()
app.setPath('userData', writableAppData)
app.setPath('cache', path.join(writableAppData, 'Cache'))
app.setPath('temp', path.join(writableAppData, 'Temp'))

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase()
  const types = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  }
  return types[extension] || 'application/octet-stream'
}

function startBuiltAppServer(distDirectory) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const requestedPath = decodeURIComponent((request.url || '/').split('?')[0])
      const relativePath = requestedPath === '/' ? 'index.html' : requestedPath.replace(/^\/+/, '')
      const rootPath = path.resolve(distDirectory)
      const filePath = path.resolve(rootPath, relativePath)
      const safePath = filePath === rootPath || filePath.startsWith(`${rootPath}${path.sep}`)
      const targetPath = safePath && fs.existsSync(filePath) ? filePath : path.join(rootPath, 'index.html')

      fs.readFile(targetPath, (error, content) => {
        if (error) {
          response.writeHead(500)
          response.end('No se pudo cargar Kiosco')
          return
        }
        response.writeHead(200, { 'Content-Type': contentType(targetPath) })
        response.end(content)
      })
    })

    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

function createWindow() {
  const appIcon = path.join(__dirname, '../public/Kiosko.jpg')
  const distPath = path.join(__dirname, '../dist/index.html')

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#151515',
    title: 'Kiosco',
    icon: appIcon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  try {
    win.setIcon(appIcon)
  } catch {}

  win.webContents.on('console-message', (_event, level, message) => {
    console.log(`[Kiosco renderer ${level}] ${message}`)
  })
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[Kiosco] Fallo al cargar: ${errorCode} ${errorDescription}`)
  })
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[Kiosco] El proceso visual terminó: ${details.reason}`)
  })

  if (fs.existsSync(distPath)) {
    startBuiltAppServer(path.dirname(distPath))
      .then((server) => {
        win.once('closed', () => server.close())
        const port = server.address().port
        return win.loadURL(`http://127.0.0.1:${port}/?desktop=1`)
      })
      .catch((error) => {
        console.error('[Kiosco] No se pudo iniciar el servidor local:', error)
        win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent('<h1 style="font-family:sans-serif;padding:32px">Kiosco no pudo iniciar</h1><p style="font-family:sans-serif;padding:0 32px">Ejecuta npm run build y vuelve a abrir la aplicación.</p>')}`)
      })
  } else {
    win.loadURL('http://localhost:5173/?desktop=1')
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
