import { app, ipcMain } from 'electron'
import path from 'path'
import Database from 'better-sqlite3'

let db;

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'food-manager.db');
  db = new Database(dbPath);

  // 食材テーブルの作成
  db.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL,
      unit TEXT,
      type TEXT,
      deadline TEXT,
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 登録用の処理
  ipcMain.handle('add-ingredient', (event, data) => {
    const { name, amount, unit, type, deadline, remarks } = data;
    const stmt = db.prepare(`
      INSERT INTO ingredients (name, amount, unit, type, deadline, remarks)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, amount, unit, type, deadline, remarks);
    return info.lastInsertRowid;
  });

  // 変更用の処理を追加
  ipcMain.handle('update-ingredient', (event, data) => {
    const { id, name, amount, unit, type, deadline, remarks } = data;
    const stmt = db.prepare(`
      UPDATE ingredients 
      SET name = ?, amount = ?, unit = ?, type = ?, deadline = ?, remarks = ?
      WHERE id = ?
    `);
    const info = stmt.run(name, amount, unit, type, deadline, remarks, id);
    return info.changes > 0; // 更新が成功したらtrueを返す
  });

  // 削除用の処理を追加
  ipcMain.handle('delete-ingredient', (event, id) => {
    const stmt = db.prepare('DELETE FROM ingredients WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0; // 削除が成功したらtrueを返す
  });

  ipcMain.handle('get-ingredients', (event, sortBy = 'deadline') => {
    let query = '';
    
    // フロント側から渡された sortBy の値によってSQLを分岐
    if (sortBy === 'created_at') {
      // 登録日時の新しい順
      query = 'SELECT * FROM ingredients ORDER BY created_at DESC';
    } else {
      // デフォルト：期限が近い順
      query = 'SELECT * FROM ingredients ORDER BY deadline ASC';
    }

    const stmt = db.prepare(query);
    return stmt.all();
  });
}