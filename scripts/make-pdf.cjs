const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

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
    console.log(`[SUCCESS] PDF written: ${outputPath} (${pdfData.length} bytes)`)
  } catch (err) {
    console.error('[ERROR]', err)
  } finally {
    app.quit()
  }
})

