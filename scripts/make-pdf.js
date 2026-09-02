import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    })

    const htmlPath = path.resolve(__dirname, '../documentacion.html')
    await win.loadFile(htmlPath)

    const pdfData = await win.webContents.printToPDF({
      pageSize: 'A4',
      margins: {
        top: 0.5,
        bottom: 0.5,
        left: 0.5,
        right: 0.5,
      },
      printBackground: true,
    })

    const outputPath = path.resolve(__dirname, '../KIOSKO_DOCUMENTACION_COMPLETA.pdf')
    fs.writeFileSync(outputPath, pdfData)
    console.log(`[EXITO] PDF generado: ${outputPath} (${pdfData.length} bytes)`)
  } catch (err) {
    console.error('[ERROR]', err)
  } finally {
    app.quit()
  }
})

