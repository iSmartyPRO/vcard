const path = require('path')
const fs = require('fs')
const QRCode = require('easyqrcodejs-nodejs')
const AD = require('../utils/ActiveDirectory')
const ADUser = require('../models/ADUser')
const config = require('../config')


module.exports.home = (req, res) => {
    res.render('home')
}

module.exports.detail = async(req, res) => {
    let user = await ADUser.findOne({ sAMAccountName: req.params.sAMAccountName }).lean()
    if (user) {
        if (user.thumbnailPhoto) {
            var thumb = new Buffer.from(user.thumbnailPhoto.buffer, 'binary').toString('base64');
        }
        res.render('detail', { user, config, thumb })
    } else {
        // if user doesn't exist display main info about company
        res.render('detail_nodata', { config })
    }
}

module.exports.update = async (req, res) => {
    await AD.getADUsers().then(async(d) => {
        console.log(`Got ${d.length} users from Active Directory`)
        if (d.length) {
            // Delete all docs in Database
            await ADUser.deleteMany({}, (err) => {
                if (err) console.warn("Error: ", err)
                console.log('Deleted all Docs')
            })
            console.log('Deleted all records in database')

            // Delete all vcf files
            fs.readdir(path.join(__dirname, '..', 'public', 'vcfs'), (err, files) => {
                if (err) {
                    console.warn(err)
                } else {
                    for (const file of files) {
                        if (file.endsWith('.vcf')) {
                            fs.unlink(path.join(__dirname, '..', 'public', 'vcfs', file), err => {
                                if (err) {
                                    console.warn(err)
                                }
                            })
                        }
                    }
                }
            })
            console.log('Deleted all VCF files')

            // Delete all QR Code files
            fs.readdir(path.join(__dirname, '..', 'public', 'qrCodes'), (err, files) => {
                if (err) {
                    console.warn(err)
                } else {
                    for (const file of files) {
                        if (file.endsWith('.png')) {
                            fs.unlink(path.join(__dirname, '..', 'public', 'qrCodes', file), err => {
                                if (err) {
                                    console.warn(err)
                                }
                            })
                        }
                    }
                }
            })
            console.log('Deleted all QR Code files')


            // Add users to database
            for (let i = 0; i < d.length; i++) {
                await new ADUser({
                    dn: d[i].dn,
                    sAMAccountName: d[i].sAMAccountName,
                    mail: d[i].mail,
                    displayName: d[i].displayName,
                    description: d[i].description,
                    l: d[i].l,
                    streetAddress: d[i].streetAddress,
                    company: d[i].company,
                    department: d[i].department,
                    telephoneNumber: d[i].telephoneNumber,
                    mobile: d[i].mobile,
                    pager: d[i].pager,
                    title: d[i].title,
                    thumbnailPhoto: d[i].thumbnailPhoto,
                    wWWHomePage: d[i].wWWHomePage,
                    whatsapp: d[i].homePhone,
                    telegram: d[i].ipPhone
                }).save()
            }
            console.log("Users saved to DataBase")

            // Generate vCard files in vcfs folder
            for (let i = 0; i < d.length; i++) {
                let descriptionArr = d[i].description.split(' ')
                let fName = descriptionArr[1]
                let lName = descriptionArr[0]
                let vCardThumb = d[i].thumbnailPhoto ? `\n` + 'PHOTO;ENCODING=b;TYPE=jpeg: ' + await new Buffer.from(d[i].thumbnailPhoto).toString('base64') : ``
                let vCardMobile = d[i].mobile ? `\nTEL;PREF;CELL;VOICE:${d[i].mobile}` : ``
                let vCardAdrWork = d[i].streetAddress ? `\nADR;WORK;CHARSET=utf-8:;;${d[i].streetAddress};${d[i].l}` : ``
                let vCardContent = `BEGIN:VCARD
VERSION:3.0
N;CHARSET=utf-8:${lName};${fName}
FN;CHARSET=utf-8:${fName} ${lName}
ORG;CHARSET=utf-8:${d[i].company};${d[i].department}
TITLE;CHARSET=utf-8:${d[i].title}${vCardMobile}
TEL;WORK;VOICE:${config.public.corporatePhone}${vCardAdrWork}
URL;WORK:https://${config.public.corporateWeb}
EMAIL;PREF;INTERNET:${d[i].mail}${vCardThumb}
END:VCARD`
                await fs.writeFileSync(path.join(__dirname, '..', 'public', 'vcfs', `${d[i].sAMAccountName}.vcf`), vCardContent)
            }
            console.log("Generated VCF files")

            // Generate QR Codes in qrCodes folder
            // QR Code for Official website
            let options = {
                text: `https://www.gencoindustry.com/`,
                width: 500,
                height: 500,
                colorDark: "#2F3D58",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.Q,
                dotScale: 0.9,
                backgroundImage: config.qrCodeLogo,
                backgroundImageAlpha: 0.5,
                // Orange color - #EE7300
                // Blue color - #2F3D58
                PO: '#EE7300', // Global Position Outer color. if not set, the default is `colorDark`
                PI: '#2F3D58', // Global Position Inner color. if not set, the default is `colorDark`
                AO: '#EE7300', // Alignment Outer. if not set, the default is `colorDark`
                AI: '#2F3D58', // Alignment Inner. if not set, the default is `colorDark`
            }
            let qrcode = new QRCode(options)
            qrcode.saveImage({
                path: path.join(__dirname, '..', 'public', 'qrCodes', `www.png`),
            })

            // Generate QR Codes for users
            for (let i = 0; i < d.length; i++) {
                let options = {
                    text: `https://vcard.gencoindustry.com/p/${d[i].sAMAccountName}/`,
                    width: 500,
                    height: 500,
                    colorDark: "#2F3D58",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.Q, // L, M, Q, H
                    // dotScale
                    dotScale: 0.9,
                    /*   logo: `assets/${username}.jpg`,
                    logoWidth: 100,
                    logoHeight: 100, */

                    // Background Image
                    backgroundImage: config.qrCodeLogo,
                    backgroundImageAlpha: 0.5,

                    PO: '#EE7300', // Global Posotion Outer color. if not set, the defaut is `colorDark`
                    PI: '#2F3D58', // Global Posotion Inner color. if not set, the defaut is `colorDark`
                    AO: '#EE7300', // Alignment Outer. if not set, the defaut is `colorDark`
                    AI: '#2F3D58', // Alignment Inner. if not set, the defaut is `colorDark`
                }
                let qrcode = new QRCode(options)
                await qrcode.saveImage({
                    path: path.join(__dirname, '..', 'public', 'qrCodes', `${d[i].sAMAccountName}.png`),
                })
            }
            console.log('Generated QR Codes files')


            console.log('Completed')
        } else {
            console.warn('No data')
        }
    });
    res.render('update')
}

module.exports.api = async(req, res) => {
    let user = await ADUser.findOne({ sAMAccountName: req.params.sAMAccountName }).select('-_id displayName description mail mobile pager title department l streetAddress telegram whatsapp').lean()
    return res.json(user)
}

module.exports.scriptTxt = (req, res) => {
    res.send(`#PowerShell Script for manual launch on local computer<br/>
$Script = Invoke-WebRequest '${config.public.vCardUri}/assets/outlook-signature/script.ps1'<br/>
$ScriptBlock = [Scriptblock]::Create($Script)<br/>
Invoke-Command -ScriptBlock $ScriptBlock`)
}

module.exports.publicConfig = (req, res) => {
    res.json(config.public)
}