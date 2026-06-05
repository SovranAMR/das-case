import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("setupBridge", {
  submit: (data: { email: string; password: string; name: string; officeName: string }) => {
    ipcRenderer.send("setup-submit", data);
  },
  onError: (callback: (msg: string) => void) => {
    ipcRenderer.on("setup-error", (_event, msg: string) => callback(msg));
  },
});
