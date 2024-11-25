import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { ReadlineParser } from '@serialport/parser-readline'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { SerialPort } from 'serialport'



let serialPort: SerialPort | null = null
let parser: ReadlineParser | null = null

const inDevelopment = process.env.NODE_ENV === "development";


function createWindow(): void {
  const preload = join(__dirname, "../preload/index.js");

  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 800,
    webPreferences: {
        devTools: inDevelopment,
        contextIsolation: true,
        nodeIntegration: true,
        nodeIntegrationInSubFrames: false,
        preload: preload,
    },
    // titleBarStyle: "hidden",
});

  // Create the browser window.
  // const mainWindow = new BrowserWindow({
  //   width: 900,
  //   height: 670,
  //   show: false,
  //   autoHideMenuBar: true,
  //   ...(process.platform === 'linux' ? { icon } : {}),
  //   webPreferences: {
  //     preload: join(__dirname, '../preload/index.js'),
  //     sandbox: false
  //   }
  // })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.




ipcMain.handle('list-ports', async () => {
  try {
    const ports = await SerialPort.list()
    return ports.map(port => port.path)
  } catch (error) {
    console.error('Error listing ports:', error)
    throw error
  }
})

ipcMain.handle('connect-port', async (_event, portName: string) => {
  try {
    // If port is already open, close it first
    if (serialPort) {
      await new Promise<void>((resolve) => {
        serialPort?.close(() => resolve())
      })
    }

    // Create new serial port instance
    serialPort = new SerialPort({
      path: portName,
      baudRate: 9600, // Make sure this matches your Arduino sketch
      autoOpen: false // Don't open immediately
    })

    // serialPort.on('data', (data) => {
    //     // Send received data to renderer process
    //     console.log("RAW RECEIVED DATA: ", data?.toString())
    // })

    // Create parser for incoming data
    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))

    // Handle incoming data
    serialPort.on('data', (data) => {
      const mainWindow = BrowserWindow.getAllWindows()[0]
      mainWindow?.webContents.send('serial-data', data.toString().trim())
    })

    // Return a promise that resolves when port opens or rejects on error
    return new Promise((resolve, reject) => {
      serialPort?.open((error) => {
        if (error) {
          console.error('Error opening port:', error)
          reject(error.message)
        } else {
          console.log('Port opened successfully')
          resolve(true)
        }
      })
    })
  } catch (error) {
    console.error('Error in connect-port:', error)
    throw error
  }
})

ipcMain.handle('disconnect-port', async () => {
  return new Promise<void>((resolve, reject) => {
    if (!serialPort) {
      resolve()
      return
    }

    serialPort.close((error) => {
      if (error) {
        console.error('Error closing port:', error)
        reject(error)
      } else {
        serialPort = null
        parser = null
        resolve()
      }
    })
  })
})


ipcMain.handle('send-data', async (_event, data: string) => {
  return new Promise<void>((resolve, reject) => {
    if (!serialPort || !serialPort.isOpen) {
      reject(new Error('Port is not open'))
      return
    }


    // Add newline character to match Arduino's Serial.println()
    serialPort.write(data + '\n', (error) => {
      if (error) {
        console.error('Error writing to port:', error)
        reject(error)
      } else {
        serialPort?.drain(() => resolve())
      }
    })
  })
})

// Clean up on app quit
app.on('before-quit', () => {
  if (serialPort && serialPort.isOpen) {
    serialPort.close()
  }
})