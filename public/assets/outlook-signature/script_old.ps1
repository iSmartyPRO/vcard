# Get Configuration Data
$config = (Get-Content "config.json" -Raw) | ConvertFrom-Json


### Signature location ###
$UNC = $config.UNC

# Define DATA folder on network share
$DATA = Join-Path $UNC "DATA"

# Define local path to Outlook signatures
$signaturePath = Join-Path $env:APPDATA "Microsoft\Signatures"

# Create signatures folder if doesn't exist yet
if (!(Test-Path $signaturePath)) {New-Item -Path $signaturePath -ItemType Directory}

#Allows more dynamic choice by using $phones, best used for users with no phones as it will return empty.
$templatePath = "$($UNC)\template"
$localHTM = Get-ChildItem $signaturePath -Filter "*.htm"


# Get User name
$username = $env:username

# Get User Details from vCard System by API
$userInfo = Invoke-RestMethod -Uri "https://vcard.gencoindustry.com/api/$($username)"
$fName=$userInfo.description
$mail=$userInfo.mail
$l=$userInfo.l
$streetAddress=$userInfo.streetAddress
$title=$userInfo.title
$department=$userInfo.department
$mobile=$userInfo.mobile
$pager=$userInfo.pager
$socialLinks = ""

#Social Links
if($config.socialNetwork.enabled){
    foreach($network in $config.socialNetwork.networks.PsObject.Properties){
        if($network.value){
            $html = link2social $network.name $network.value
            $socialLinks += $html
        }
    }
}

Write-Host $socialLinks

# Telephone line
$phones = "T: $($config.corporatePhone)"
if ($userInfo.pager) { $phones += "($($userInfo.pager))" }
if ($userInfo.mobile) {$phones +=  ",&nbsp;M: $($userInfo.mobile)"}

$localSignatures = $null
foreach ($htm in $localHTM) {
    $localSignatures +=, [pscustomobject]@{
        Name=$htm.Name
        Base=$htm.BaseName
        Path=$htm.Directory
    }
}

#Windows bubble message
function Send-Notification($title, $msg) {
    Add-Type -AssemblyName System.Windows.Forms
    $global:balloon = New-Object System.Windows.Forms.NotifyIcon
    $path = (Get-Process -id $pid).Path
    $balloon.Icon = $(Join-Path $UNC "DATA\balloon.ico")
    $balloon.BalloonTipText = $msg
    $balloon.BalloonTipTitle = $title
    $balloon.Visible = $true
    $balloon.ShowBalloonTip(10000)
    $balloon.Dispose()
}

function Write-Signature($md5, $template) {
    #Get confidentiality text
    $confidentiality = Get-Content (Join-Path $DATA "confidentiality.htm") -Raw
    #$regards = "С уважением,"

    $HTM_files = $($template.BaseName + "_files")
    $HTM_filesNoSpace = $HTM_files -replace " ","%20"
    $localHTM_files = Join-Path $signaturePath $HTM_files
    $localHTM_tmp = Join-Path $signaturePath $("tmp_" + $template.Name)
    $localHTM_tmp2 = Join-Path $signaturePath $("tmp2_" + $template.Name)
    $localHTM = Join-Path $signaturePath $template.Name
    $localRTF = "$(Join-Path $signaturePath $template.BaseName).rtf"
    $localTXT = "$(Join-Path $signaturePath $template.BaseName).txt"

    if (Test-Path $localHTM_files) {
        Remove-Item $localHTM_files -Recurse -Force
    }

    New-Item -Path $localHTM_files -ItemType Directory | Out-null

    $ProgressPreference = 'SilentlyContinue' # Hidden web requests
    Invoke-WebRequest -Uri "$($config.vCardUri)/companyLogo.jpg" -OutFile (Join-Path $localHTM_files "companyLogo.jpg") | Out-null
    Invoke-WebRequest -Uri "$($config.vCardUri)/qrCodes/$($username).png" -OutFile (Join-Path $localHTM_files "qrCode.png") | Out-null

    # Write HTM file, keep the string indented to left
    "$((Get-Content $template.FullName -Raw) `
        -replace "#fName", $fName `
        -replace "#title", $title `
        -replace "#department", $department `
        -replace "#l", $l `
        -replace "#streetAddress ", $streetAddress  `
        -replace "#phones",$phones `
        -replace "#mobile",$mobile `
        -replace "#phones",$phones `
        -replace "#mail",$mail `
        -replace "#corporateWebsite ",$config.corporateWebsite  `
        -replace "#socialLinks",$socialLinks  `
        -replace "#head",'' `
        -replace "#regards", $config.regards `
        -replace "#confidentiality",$confidentiality `
        -replace "#folder", $HTM_filesNoSpace)" | Out-File $localHTM_tmp -Encoding utf8

    # Convert HTM to RTF locally
    $wrd = new-object -com word.application
    $wrd.visible = $false
    $doc = $wrd.documents.open($localHTM_tmp) # needs unused var defined
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
    $EmailSignature.NewMessageSignature=$template.BaseName
    $EmailSignature.ReplyMessageSignature=$template.BaseName

    $wrd.Quit()

    # Convert HTM to TXT and strip all html stuff, tabulators and empty lines
    $txt = Get-Content $localHTM_tmp
    $txt = $txt -replace "<[^>]*>","" # HTML tags and comments
    $txt = $txt -replace "<head[(.*)]/head>","" # Remove styles
    $txt = $txt -replace "&nbsp;"," " # HTML strong spaces character
    $txt = $txt -replace "&#173;"," " # HTML decimal char?
    $txt = $txt -replace "#regards","С уважением," # replace regards
    $txt = $txt -replace "#confidentiality","" # delete confidentiality
    $txt = $txt.trim() # Tabulators
    $txt = $txt | ? {$_.trim() -ne "" }  # Empty line breaks

    $txt | Out-File $localTXT

    # Write HTM file, keep the string indented to left
    "$((Get-Content $template.FullName -Raw) `
        -replace "#fName", $fName `
        -replace "#title", $title `
        -replace "#department", $department `
        -replace "#l", $l `
        -replace "#streetAddress ", $streetAddress  `
        -replace "#phones",$phones `
        -replace "#mobile",$mobile `
        -replace "#mail",$mail `
        -replace "#corporateWebsite ",$config.corporateWebsite  `
        -replace "#socialLinks",$socialLinks  `
        -replace "#regards","C уважением," `
        -replace "#confidentiality",$confidentiality `
        -replace "#folder",$HTM_filesNoSpace)" | Out-File $localHTM_tmp2 -Encoding utf8

    $localHTMFromTMP = Get-Content $localHTM_tmp2 -Raw
    $head = ((Get-Content (Join-Path $DATA "head.htm") -Raw) -replace "#folder",$HTM_filesNoSpace)
    $filelist = ((Get-Content (Join-Path $DATA "filelist.xml") -Raw) -replace "#folder",$HTM_filesNoSpace -replace "#baseName","$($template.BaseName -replace " ","%20").htm")


    $localHTMFromTMP = $localHTMFromTMP -replace "#head",$head
    $localHTMFromTMP | Out-File $localHTM

    # Add n HTML comment at the last line of htm file, this is used to check for changes in AD and template file (md5 file checksum) later
    Add-Content $localHTM "<!-- $SAM,$jobTitle,$mobile,$telephone,$email,$md5 -->"

    $filelist | Out-File (Join-Path $localHTM_files "filelist.xml")

    Copy-Item -Path (Join-Path $DATA "colorschememapping.xml") -Destination $localHTM_files
    Copy-Item -Path (Join-Path $DATA "themedata.thmx") -Destination $localHTM_files

    Remove-Item $localHTM_tmp -Force
    Remove-Item $localHTM_tmp2 -Force

}

function Commit-Signatures($templates) {
    foreach ($template in $templates) {
        $md5 = (Get-FileHash $template.FullName -Algorithm MD5).Hash
        if (Test-Path (Join-Path $signaturePath $template.Name)) { # If template file exists

            # Check md5 in hashtables to see if signature is updated and needs replacing
            if ($md5 -notin $localSignatures.md5) {
                Write-Signature $md5 $template
                Send-Notification "Company Signature Updated" "Outlook signature [$($template.BaseName)] has been updated"
            } else {
                $findChanged = $localSignatures | Where-Object {$_.Name -match $template.Name}
                if (($findChanged.SAM -ne $SAM) -or ($findChanged.jobTitle -ne $jobTitle) -or ($findChanged.mobile -ne $mobile) -or ($findChanged.telephone -ne $telephone) -or ($findChanged.email -ne $email)) {
                    Write-Signature $md5 $template
                    Send-Notification "Company Signature Details Updated" "Outlook signature [$($template.BaseName)] has been updated to reflect changes of your profile in Active Directory (such as name, email, phone or mobile number)"
                }
            }

        } else { # Template file does not exist
            Write-Signature $md5 $template
            Send-Notification "Company Signature Added" "A new Outlook signature [$($template.BaseName)] has been added to your Outlook."
        }

    }
}

function link2social($networkName, $networkUrl){
    return "<p class=MsoNormal>
              <a href='$($networkUrl)'>
              <!--[if gte vml 1]>
                  <v:shape id='$($networkName)' o:spid='_x0000_i1025' type='#defaultImageType' href='$($networkUrl)' style='width:105pt;height:105pt;visibility:visible;mso-wrap-style:square' o:button='t'>
                    <v:fill o:detectmouseclick='t'/>
                    <v:imagedata src='#folder/$($networkName).jpg' o:title='$($networkName)'/>
                  </v:shape>
              <![endif]-->
              <![if !vml]><img border=0 width=140 height=140 src='#folder/$($networkName).jpg' v:shapes='$($networkName)'><![endif]>
              </a></p>"
}

# I named variable country templates because our OUs are based on countries. In this public version this variable is for LocationX
$countryTemplates = Get-ChildItem $templatePath -Filter "*.htm"
$defaultTemplates = Get-ChildItem $UNC -Filter "*.htm"
foreach ($ls in $localSignatures) {
    if ((($ls.Base -notin $countryTemplates.BaseName) -and $countryTemplates.count -gt 0) -or (($ls.Base -in $defaultTemplates.BaseName)-and $countryTemplates.count -gt 0) -or (($ls.Base -notin $defaultTemplates.BaseName)-and $countryTemplates.count -eq 0)){
        Remove-Item "$(Join-Path $ls.Path $ls.Base).htm" -Force -ErrorAction SilentlyContinue
        Remove-Item "$(Join-Path $ls.Path $ls.Base).rtf" -Force -ErrorAction SilentlyContinue
        Remove-Item "$(Join-Path $ls.Path $ls.Base).txt" -Force -ErrorAction SilentlyContinue
        Remove-Item "$(Join-Path $ls.Path $ls.Base)_files" -Recurse -Force -ErrorAction SilentlyContinue
        Send-Notification "Company Signature Removed" "An Outlook signature [$($ls.Base)] has been removed from your Outlook."
    }
}

if ($countryTemplates.count -eq 0) {
    if ($defaultTemplates.count -gt 0) {
        Commit-Signatures $defaultTemplates
    }
} else {
    Commit-Signatures $countryTemplates
}