const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const http = require('node:http')

const writableAppData = path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'Kiosko')

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
          response.end('No se pudo cargar Kiosko')
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
  const webDirectory = path.join(__dirname, '../web-dist')
  const buildIcon = path.join(__dirname, '../build/icon.ico')
  const webIcon = path.join(webDirectory, 'icon-512.png')
  const appIcon = fs.existsSync(buildIcon) ? buildIcon : (fs.existsSync(webIcon) ? webIcon : path.join(webDirectory, 'Kiosko.jpg'))
  const distPath = path.join(webDirectory, 'index.html')

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#151515',
    title: 'Kiosko',
    icon: appIcon,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  try {
    win.setIcon(appIcon)
  } catch {}

  const splash = `<html><body style="margin:0;background:#151515;color:#f4e8d0;font-family:Segoe UI,sans-serif;display:grid;place-items:center;height:100vh"><main style="text-align:center"><img src="http://127.0.0.1:0/Kiosko.jpg" style="width:72px;height:72px;border-radius:50%;object-fit:cover;opacity:.9" onerror="this.style.display='none'"><h1 style="font-family:Georgia,serif;font-size:30px;margin:18px 0 8px">Kiosko</h1><p style="margin:0;color:#b9aa91;font-size:14px">Iniciando Kiosko...</p></main></body></html>`
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splash)}`)
  win.once('ready-to-show', () => win.show())

  win.webContents.on('console-message', (_event, level, message) => {
    console.log(`[Kiosko renderer ${level}] ${message}`)
  })
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[Kiosko] Fallo al cargar: ${errorCode} ${errorDescription}`)
  })
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[Kiosko] El proceso visual terminó: ${details.reason}`)
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  if (fs.existsSync(distPath)) {
    startBuiltAppServer(path.dirname(distPath))
      .then((server) => {
        win.once('closed', () => server.close())
        const port = server.address().port
        return win.loadURL(`http://127.0.0.1:${port}/?desktop=1`)
      })
      .catch((error) => {
        console.error('[Kiosko] No se pudo iniciar el servidor local:', error)
        win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent('<h1 style="font-family:sans-serif;padding:32px">Kiosko no pudo iniciar</h1><p style="font-family:sans-serif;padding:0 32px">Ejecuta npm run build y vuelve a abrir la aplicación.</p>')}`)
      })
  } else {
    win.loadURL('http://localhost:5173/?desktop=1')
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
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
