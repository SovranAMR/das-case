import { contextBridge, ipcRenderer } from "electron";

// Ana pencere (giris ekrani dahil) icin guvenli kopru. Yonetici sifresi
// sifirlama yalnizca sunucu makinesinde, kullanicinin fiziksel erisimiyle
// tetiklenir; renderer'a DB ya da dosya erisimi acilmaz.
contextBridge.exposeInMainWorld("dasApp", {
  getMode: (): Promise<"server" | "client" | null> =>
    ipcRenderer.invoke("das-get-mode"),
  forgotAdminPassword: (): Promise<{ ok: boolean; reason?: string }> =>
    ipcRenderer.invoke("das-forgot-admin"),
});
