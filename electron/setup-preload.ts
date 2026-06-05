import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("setupBridge", {
  selectRole: (role: string) => {
    ipcRenderer.send("setup-role", role);
  },
  submitServer: (data: {
    email: string;
    password: string;
    name: string;
    officeName: string;
  }) => {
    ipcRenderer.send("setup-server-submit", data);
  },
  connectServer: (server: { host: string; port: number; name: string }) => {
    ipcRenderer.send("setup-client-connect", server);
  },
  rescan: () => {
    ipcRenderer.send("setup-client-scan");
  },
  cancel: () => {
    ipcRenderer.send("setup-cancel");
  },
  onShowPage: (cb: (page: string) => void) => {
    ipcRenderer.on("show-page", (_e, page: string) => cb(page));
  },
  onScanResults: (
    cb: (
      servers: { name: string; host: string; port: number; version: string }[],
    ) => void,
  ) => {
    ipcRenderer.on("scan-results", (_e, servers) => cb(servers));
  },
  onError: (cb: (msg: string) => void) => {
    ipcRenderer.on("setup-error", (_e, msg: string) => cb(msg));
  },
});
