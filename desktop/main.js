// 语迹 VoiceLog · macOS 桌面版（Electron 外壳，加载 dist/ 的静态包）
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: '语迹 VoiceLog',
    backgroundColor: '#0c0c0e',
    titleBarStyle: 'hiddenInset', // mac 上更原生的标题栏
    webPreferences: { contextIsolation: true },
  });
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  // 应用内的外部链接交给系统浏览器
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
