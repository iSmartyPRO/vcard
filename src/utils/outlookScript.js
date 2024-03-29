const config = require('../config')

module.exports.script = `
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
# Set your vCard Uri
if((Get-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Internet Explorer\\Main").DisableFirstRunCustomize -ne 2) {
  Set-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Internet Explorer\\Main" -Name "DisableFirstRunCustomize" -Value 2
}
$vCardUri = "${config.public.vCardUri}"

# Hidden web requests
$ProgressPreference = 'SilentlyContinue'

$checkUser = Invoke-RestMethod -Uri "$($vCardUri)/api/$($username)"

if($checkUser -ne "null") {
  # Get configuration
  $config = Invoke-RestMethod -Uri "$($vCardUri)/config"

  # Get User name
  $username = $env:username

  #============== START FUNCTIONS ==============#

  # Get User Details from vCard System by API
  function vCard-GetUserInfo($username){
    $userInfo = Invoke-RestMethod -Uri "$($vCardUri)/api/$($username)"
    if($userInfo.department) {$jobTitle = -join($($userInfo).title, ", ", $($userInfo).department)} else {$jobTitle = $($userInfo).title}
    $uDetails +=, [pscustomobject]@{
        fName         = $userInfo.description
        mail          = $userInfo.mail
        l             = $userInfo.l
        streetAddress = $userInfo.streetAddress
        title         = $jobTitle
        mobile        = $userInfo.mobile
        pager         = $userInfo.pager
        whatsapp      = $userInfo.whatsapp
        telegram      = $userInfo.telegram
        telephoneNumber = $userInfo.telephoneNumber
    }
    return $uDetails
  }

  # Hash String
  function hashString($string){
    return ($string | Get-StringHash -Algorithm MD5).HashString
  }

  # Copy all required files from vCard System
  function copyAssets($path) {
    Invoke-WebRequest -Uri "$($vCardUri)$($config.outlookLogo)" -OutFile (Join-Path $path "logo.jpg") | Out-null
    Invoke-WebRequest -Uri "$($vCardUri)/qrCodes/$($username.toLower()).png" -OutFile (Join-Path $path "qrCode.png") | Out-null
    foreach($file in $config.filelist){
      Invoke-WebRequest -Uri "$($vCardUri)/assets/outlook-signature/$($file)" -OutFile (Join-Path $path "$($file)") | Out-null
    }
  }

  # Generate String Hash
  Function Get-StringHash
  {
      param
      (
          [String] $String,
          $HashName = "MD5"
      )
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($String)
      $algorithm = [System.Security.Cryptography.HashAlgorithm]::Create('MD5')
      $StringBuilder = New-Object System.Text.StringBuilder

      $algorithm.ComputeHash($bytes) |
      ForEach-Object {
          $null = $StringBuilder.Append($_.ToString("x2"))
      }

      $StringBuilder.ToString()
  }

  #Windows bubble message
  <# function Send-Notification($title, $msg) {
      Add-Type -AssemblyName System.Windows.Forms
      $global:balloon = New-Object System.Windows.Forms.NotifyIcon
      $path = (Get-Process -id $pid).Path
      $balloon.Icon = $(Join-Path $UNC "DATA\\balloon.ico")
      $balloon.BalloonTipText = $msg
      $balloon.BalloonTipTitle = $title
      $balloon.Visible = $true
      $balloon.ShowBalloonTip(10000)
      $balloon.Dispose()
  } #>
  function Send-Notification
  {

  [CmdletBinding()]
  param
  (
  [Parameter()]
  $Text,

  [Parameter()]
  $Title,

  #It must be 'None','Info','Warning','Error'
  $Icon = 'Info'
  )

  Add-Type -AssemblyName System.Windows.Forms

  #So your function would have to check whether there is already an icon that you can reuse.This is done by using a "shared variable", which really is a variable that has "script:" scope.
  if ($script:balloonToolTip -eq $null)
  {
  #we will need to add the System.Windows.Forms assembly into our PowerShell session before we can make use of the NotifyIcon class.
  $script:balloonToolTip = New-Object System.Windows.Forms.NotifyIcon
  }

  $path = Get-Process -id $pid | Select-Object -ExpandProperty Path
  $balloonToolTip.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path)
  $balloonToolTip.BalloonTipIcon = $Icon
  $balloonToolTip.BalloonTipText = $Text
  $balloonToolTip.BalloonTipTitle = $Title
  $balloonToolTip.Visible = $true

  #I thought to display the tool tip for one seconds,so i used 1000 milliseconds when I call ShowBalloonTip.
  $balloonToolTip.ShowBalloonTip(1000)
  }

  # Create Signature
  function Write-Signature($md5, $template) {
      #Get confidentiality text
      $confidentiality = (Invoke-WebRequest -Uri "$($vCardUri)/assets/outlook-signature/confidentiality.htm").Content
      $regards = "С уважением,"

      $HTM_files = $($template.name + "_files")
      $HTM_filesNoSpace = $HTM_files -replace " ","%20"
      $localHTM_files = Join-Path $signaturePath $HTM_files
      $localHTM_tmp4Html = Join-Path $signaturePath $("tmp4Html_" + $template.filename)
      $localHTM_tmp4Word = Join-Path $signaturePath $("tmp4Word_" + $template.filename)
      $localHTM_tmp4Txt = Join-Path $signaturePath $("tmp4Txt_" + $template.filename)
      $localHTM = "$(Join-Path $signaturePath $template.name).htm"
      $localRTF = "$(Join-Path $signaturePath $template.name).rtf"
      $localTXT = "$(Join-Path $signaturePath $template.name).txt"

      if (Test-Path $localHTM_files) {
          Remove-Item $localHTM_files -Recurse -Force
      }
      New-Item -Path $localHTM_files -ItemType Directory | Out-null

      copyAssets $($localHTM_files)

      # Request for user info from vCard
      $uInfo = vCard-GetUserInfo $username

      # Get head
      $head = $((Invoke-WebRequest -Uri "$($vCardUri)/assets/outlook-signature/head.htm").Content -replace "#folder",$HTM_filesNoSpace)


      # Write HTM file, keep the string indented to left
      $templateContent = Invoke-WebRequest -Uri "$($vCardUri)/assets/outlook-signature/templates/$($template.filename)"
      #Social Links
      $socialLinksHtml = "";
      if($config.privateSocialNetwork.enabled){
        if($uInfo.whatsapp){
          $whatsappOnlyDigits = ($uInfo.whatsapp) -replace '\D+(\d+)','$1'
          $whatsappLink = "https://wa.me/$($whatsappOnlyDigits)"
          $socialLinksHtml += link2social "whatsapp" $whatsappLink
        }
        if($uInfo.telegram){
          $socialLinksHtml += link2social "telegram" $uInfo.telegram
        }
      }
      if($config.socialNetwork.enabled){
          foreach($sl in $config.socialNetwork.networks.PSObject.Properties){
            if($sl.Value){
              $socialLinksHtml += link2social $sl.Name $sl.Value
            }
          }
      } else {
        $socialLinkHtml = ""
      }

      # Telephone line
      $phones = ""
      if ($uInfo.telephoneNumber -AND $uInfo.pager) { 
        $phones += "T: $($uInfo.telephoneNumber) ($($uInfo.pager))" 
      } elseif($uInfo.telephoneNumber) {
        $phones += "T: $($uInfo.telephoneNumber)" 
      }
      if($uInfo.telephoneNumber -AND $uInfo.mobile) {
        $phones += ", "
      }
      if ($uInfo.mobile) {$phones +=  "M: $($uInfo.mobile)"}

      $templateContent -replace "#fName", $uInfo.fName \`
          -replace "#title", $uInfo.title \`
          -replace "#l", $uInfo.l \`
          -replace "#streetAddress ", $uInfo.streetAddress  \`
          -replace "#mobile", $uInfo.mobile \`
          -replace "#phones",$phones \`
          -replace "#mail", $uInfo.mail \`
          -replace "#corporateWebsite ",$config.corporateWebsite  \`
          -replace "#qrCodeUrl", "$vCardUri/p/$username" \`
          -replace "#socialLinks",$socialLinksHtml  \`
          -replace "#head", $head \`
          -replace "#regards", $config.regards \`
          -replace "#confidentiality", $confidentiality \`
          -replace "#folder", $HTM_filesNoSpace | Out-File $localHTM_tmp4Html -Encoding utf8

      $templateContent -replace "#fName", $uInfo.fName \`
          -replace "#title", $uInfo.title \`
          -replace "#l", $uInfo.l \`
          -replace "#streetAddress ", $uInfo.streetAddress  \`
          -replace "#mobile", $uInfo.mobile \`
          -replace "#phones",$phones \`
          -replace "#mail", $uInfo.mail \`
          -replace "#corporateWebsite ",$config.corporateWebsite  \`
          -replace "#qrCodeUrl", "$vCardUri/p/$username" \`
          -replace "#socialLinks",$socialLinksHtml  \`
          -replace "#head", "" \`
          -replace "#regards", $config.regards \`
          -replace "#confidentiality", $confidentiality \`
          -replace "#folder", $HTM_filesNoSpace | Out-File $localHTM_tmp4Word -Encoding utf8

      $templateContent -replace "#fName", $uInfo.fName \`
          -replace "#title", $uInfo.title \`
          -replace "#l", $uInfo.l \`
          -replace "#streetAddress ", $uInfo.streetAddress  \`
          -replace "#mobile", $uInfo.mobile \`
          -replace "#phones",$phones \`
          -replace "#mail", $uInfo.mail \`
          -replace "#corporateWebsite ",$config.corporateWebsite  \`
          -replace "#qrCodeUrl", "" \`
          -replace "#socialLinks",""  \`
          -replace "#head", "" \`
          -replace "#regards", $config.regards \`
          -replace "#confidentiality", "" \`
          -replace "#folder", "" | Out-File $localHTM_tmp4Txt -Encoding utf8

      # Convert HTM to RTF locally
      $wrd = new-object -com word.application
      $wrd.visible = $false
      $doc = $wrd.documents.open($localHTM_tmp4Word) # needs unused var defined
      $opt = 6

      #Save rtf with images
      $images = $doc.InlineShapes
      foreach ($image in $images) {
        $linkFormat = $image.LinkFormat
        $linkFormat.SavePictureWithDocument = 1
        $linkFormat.BreakLink()
      }

      $wrd.ActiveDocument.Saveas([ref]$localRTF,[ref]$opt)

      #Set company signature as default for New messages/Reply Messages
      $EmailOptions = $wrd.EmailOptions
      $EmailSignature = $EmailOptions.EmailSignature
      $EmailSignatureEntries = $EmailSignature.EmailSignatureEntries
      $EmailSignature.NewMessageSignature=$templates[0].name
      $EmailSignature.ReplyMessageSignature=$templates[1].name

      $wrd.Quit()

      # Convert HTM to TXT and strip all html stuff, tabulators and empty lines
      $txt = Get-Content $localHTM_tmp4Txt
      $txt = $txt -replace "<[^>]*>","" # HTML tags and comments
      $txt = $txt -replace "<head[(.*)]/head>","" # Remove styles
      $txt = $txt -replace "&nbsp;"," " # HTML strong spaces character
      $txt = $txt -replace "&#173;"," " # HTML decimal char?
      $txt = $txt -replace "#regards","С уважением," # replace regards
      $txt = $txt -replace "#confidentiality","" # delete confidentiality
      $txt = $txt.trim() # Tabulators
      $txt = $txt | ? {$_.trim() -ne "" }  # Empty line breaks
      $txt | Out-File $localTXT

      $localHTMFromTMP = Get-Content $localHTM_tmp4Html -Raw
      $localHTMFromTMP = $localHTMFromTMP -replace "#head",$head
      $localHTMFromTMP | Out-File $localHTM
      Start-Sleep -Seconds 1.5
      Remove-Item $localHTM_tmp4Html -Force
      Remove-Item $localHTM_tmp4Word -Force
      Remove-Item $localHTM_tmp4Txt -Force
  }

  function Commit-Signatures($templates) {
      foreach ($template in $templates) {
          $md5 = hashString $template.name
          if (Test-Path (Join-Path $signaturePath $template.name)) { # If template file exists
              # Check md5 in hashtables to see if signature is updated and needs replacing
              if ($md5 -notin $localSignatures.md5) {
                  Write-Signature $md5 $template.name
                  Send-Notification "Company Signature Updated" "Outlook signature has been updated"
              } else {
                  $findChanged = $localSignatures | Where-Object {$_.Name -match $template.name}
                  if (($findChanged.SAM -ne $SAM) -or ($findChanged.jobTitle -ne $jobTitle) -or ($findChanged.mobile -ne $mobile) -or ($findChanged.telephone -ne $telephone) -or ($findChanged.email -ne $email)) {
                      Write-Signature $md5 $template
                      Send-Notification "Company Signature Details Updated" "Outlook signature has been updated to reflect changes of your profile in Active Directory (such as name, email, phone or mobile number)"
                  }
              }

          } else { # Template file does not exist
              Write-Signature $md5 $template
              Send-Notification "Company Signature Added" "A new Outlook signature has been added to your Outlook."
          }

      }
  }

  function link2social($networkName, $networkUrl){
      return "<a href='$($networkUrl)'><span lang=EN-US style='color:windowtext; mso-ansi-language:EN-US;mso-no-proof:yes;text-decoration:none;text-underline:none'><!--[if gte vml 1]><v:shape id='$($networkName)' o:spid='_x0000_i1025' type='#defaultImageType' href='$($networkUrl)' style='width:25pt;height:25pt;visibility:visible;mso-wrap-style:square' o:button='t'><v:fill o:detectmouseclick='t'/><v:imagedata src='#folder/$($networkName).jpg' o:title='$($networkName)'/></v:shape><![endif]--><![if !vml]><span style='mso-ignore:vglayout'><img border=0 width=35 height=35 src='#folder/$($networkName).jpg' v:shapes='$($networkName)'></span><![endif]></a><span style='mso-ansi-language:EN-US'><span style='mso-spacerun:yes'>&nbsp;</span></span>"
  }





  #============== END FUNCTIONS ==============#


  # Define local path to Outlook signatures
  $signaturePath = Join-Path $env:APPDATA "Microsoft\\Signatures"

  # Create Signatures Folder if doesn't exist yet
  if (!(Test-Path $signaturePath)) {New-Item -Path $signaturePath -ItemType Directory}

  # Get Local htm files in Signatures Folder
  $localHTM = Get-ChildItem $signaturePath -Filter "*.htm"

  # Local Signatures
  $localSignatures = $null
  foreach ($htm in $localHTM) {
      $localSignatures +=, [pscustomobject]@{
          Name=$htm.Name
          Base=$htm.BaseName
          Path=$htm.Directory
      }
  }

  Commit-Signatures $config.templates

  #Commit-Signatures $templates

}
`