import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  session,
  shell,
} from "electron";
import type { IpcMainInvokeEvent } from "electron";

export { app, BrowserWindow, clipboard, dialog, ipcMain, session, shell };
export type { IpcMainInvokeEvent };
