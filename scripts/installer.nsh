!macro customInstall
  ; Windows Firewall: HTTP server (TCP 3000) + LAN discovery (UDP 41520).
  ; profile=any: ofis aglari sik sik "Public" olarak isaretlenir; private'a
  ; kisitlamak istemcilerin sunucuya baglanmasini engeller.
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="DAS Case HTTP" dir=in action=allow protocol=TCP localport=3000 profile=any'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="DAS Case Discovery" dir=in action=allow protocol=UDP localport=41520 profile=any'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="DAS Case HTTP"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="DAS Case Discovery"'
!macroend
