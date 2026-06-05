!macro customInstall
  ; Windows Firewall: HTTP server (TCP 3000) + LAN discovery (UDP 41520)
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="DAS Case HTTP" dir=in action=allow protocol=TCP localport=3000 profile=private'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="DAS Case Discovery" dir=in action=allow protocol=UDP localport=41520 profile=private'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="DAS Case HTTP"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="DAS Case Discovery"'
!macroend
