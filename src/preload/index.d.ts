import { ElectronAPI } from '@electron-toolkit/preload'


interface ThemeModeContext {
  toggle: () => Promise<boolean>;
  dark: () => Promise<void>;
  light: () => Promise<void>;
  system: () => Promise<boolean>;
  current: () => Promise<"dark" | "light" | "system">;
}

interface ElectronWindow {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
}



declare global {
  interface Window {
    electron: ElectronAPI,
    themeMode: ThemeModeContext,
    api: {
      listSerialPorts: () => Promise<string[]>
      connectPort: (port: string, baudRate?: number) => Promise<boolean>
      disconnectPort: () => Promise<void>
      sendData: (data: string) => Promise<void>
      onReceiveData: (callback: (data: string) => void) => () => void
    },
    electronWindow: ElectronWindow;

  }
}
