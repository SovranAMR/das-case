!macro customInstall
  ; Windows Firewall inbound rule for LAN access
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="DAS Case" dir=in action=allow protocol=TCP localport=3000 profile=private'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="DAS Case"'
!macroend
