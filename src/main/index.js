import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { GoogleGenerativeAI } from '@google/generative-ai' // SDKの読み込み
import icon from '../../resources/icon.png?asset'
import { initDatabase } from './db.js'


function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    useContentSize: true,
    resizable: false,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

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
  initDatabase()   // dbの初期化処理
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const store = new Store(); // APIキーなどを保存

// --- APIキーの保存・取得処理を electron-store を使うように統一 ---
// APIキーの保存
ipcMain.handle('save-api-key', (event, apiKey) => {
  store.set('geminiApiKey', apiKey);
});

// APIキーの取得
ipcMain.handle('get-api-key', () => {
  return store.get('geminiApiKey', ''); // 保存されていなければ空文字を返す
});

// レンスラーからチャット要請が来たときの処理
ipcMain.handle('send-recipe-chat', async (event, ingredientsPrompt, chatHistory) => {
  try {
    // 1. 保存されているAPIキーを取得
    const apiKey = store.get('geminiApiKey'); // db.jsとキー名を合わせる
    if (!apiKey) throw new Error('API_KEY_NOT_FOUND');

    // 2. Gemini APIの初期化
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 3. モデルを指定
    const model = genAI.getGenerativeModel({ 
      model: 'models/gemini-2.5-flash',
      systemInstruction: "あなたはプロの料理研究家です。挨拶や前置きは省略し、提示された食材情報に基づいて、すぐに提案する料理の具体的なレシピを提案してください。",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "レシピ名。先頭にその料理を表す絵文字を1から3個含めてください。例: '🍳 ふわとろオムライス', '🍛 チキンカレー'"
            },
            content: {
              type: "string",
              description: "具体的なレシピの本文（Markdown形式）。材料一覧や作り方の手順を含めてください。挨拶や前置きは含めないでください。"
            },
            ingredients: {
              type: "array",
              items: {
                type: "string"
              },
              description: "このレシピに必要な主な食材のリスト。塩、醤油、砂糖、みりん、味噌、油などの一般的な調味料や、小麦粉、片栗粉、パン粉などの粉類は除外してください。例: ['鶏もも肉', '玉ねぎ', '卵']"
            }
          },
          required: ["title", "content", "ingredients"]
        }
      }
    });

    // 画面から受け取った「現在の食材リスト」を会話の先頭に追加
    const fullHistory = [
      { role: 'user', parts: [{ text: ingredientsPrompt }] },
      ...chatHistory
    ];

    // 4. 通信を実行（rendererから送られてきた純粋な履歴をそのまま渡す）
    const result = await model.generateContent({ contents: fullHistory });
    const response = result.response;

    // 5. AIのテキストをパースして画面に返す
    const text = response.text();
    const recipe = JSON.parse(text);
    return { success: true, recipe: recipe };

  } catch (error) {
    console.error('Gemini Error:', error);
    // APIキーが不正な場合などのエラーをハンドリング
    if (error.message.includes('API key not valid')) {
      return { success: false, error: 'API_KEY_INVALID' };
    }
    return { success: false, error: error.message };
  }
});