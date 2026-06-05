import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("dasCase", {
  platform: process.platform,
  isElectron: true,
});
