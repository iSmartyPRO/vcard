const path = require('path')
const fs = require('fs')
const QRCode = require('easyqrcodejs-nodejs')
const AD = require('../utils/ActiveDirectory')
const ADUser = require('../models/ADUser')
const config = require('../config')
const outlookScript = require('../utils/outlookScript')


module.exports.home = (req, res) => {
    res.render('home', { config })
}

module.exports.detail = async(req, res) => {
    let user = await ADUser.findOne({ sAMAccountName: req.params.sAMAccountName.toLowerCase() }).lean()
    let messengers = {}
    let socialLinks = config.public.socialNetwork.networks
    if (user) {
        if (user.whatsapp) messengers.whatsapp = `https://wa.me/${user.whatsapp.replace(/\D/g, "")}`
        if (user.whatsapp) messengers.telegram = `https://t.me/${user.telegram}`
        if (user.thumbnailPhoto) {
            var thumb = new Buffer.from(user.thumbnailPhoto.buffer, 'binary').toString('base64');
        }
        res.render('detail', { user, config, thumb, messengers, socialLinks })
    } else {
        // if user doesn't exist display main info about company
        res.render('detail_nodata', { config })
    }
}

module.exports.update = async(req, res) => {
    console.log("Update started")
    let result = {}
    await AD.getADUsers().then(async(d) => {
        result.adUserCount = d.length

        if (d.length) { 
            // Delete all docs in Database
            await ADUser.deleteMany({})
                .then(function(){
                    console.log("All Docs deleted")
                    result.deletedAllDocs = 'Deleted all Docs'
                    result.deletedAllDocsDB = 'Deleted all records in database'
                })
                .catch(err => console.log(err))
                

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
            result.deletedVcf = 'Deleted all VCF files'

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
            result.deletedQRCodes = 'Deleted all QR Code files'


            // Add users to database
            for (let i = 0; i < d.length; i++) {
                await new ADUser({
                    dn: d[i].dn,
                    sAMAccountName: d[i].sAMAccountName.toLowerCase(),
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
            result.usersSaved = "Users saved to DataBase"

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
URL;WORK:https://${config.public.corporateWebsite}
EMAIL;PREF;INTERNET:${d[i].mail}${vCardThumb}
END:VCARD`
                await fs.writeFileSync(path.join(__dirname, '..', 'public', 'vcfs', `${d[i].sAMAccountName.toLowerCase()}.vcf`), vCardContent)
            }
            result.generateVcf = "Generated VCF files"

            // Generate QR Codes in qrCodes folder
            // QR Code for Official website
            let options = {
                text: `${config.public.corporateWebsiteWProtcol}`,
                width: 500,
                height: 500,
                colorDark: config.qrCodeColorDark,
                colorLight: config.qrCodeColorLight,
                correctLevel: QRCode.CorrectLevel.Q,
                dotScale: 0.9,
                backgroundImage: `${path.join(__dirname, '..', 'public')}${config.qrCodeLogo}`,
                backgroundImageAlpha: 0.5,
                // Orange color - #EE7300
                // Blue color - #2F3D58
                PO: config.qrCodeOuterColor, // Global Position Outer color. if not set, the default is `colorDark`
                PI: config.qrCodeInnerColor, // Global Position Inner color. if not set, the default is `colorDark`
                AO: config.qrCodeOuterColor, // Alignment Outer. if not set, the default is `colorDark`
                AI: config.qrCodeInnerColor, // Alignment Inner. if not set, the default is `colorDark`
            }
            let qrcode = new QRCode(options)
            qrcode.saveImage({
                path: path.join(__dirname, '..', 'public', 'qrCodes', `www.png`),
            })

            // Generate QR Codes for users
            for (let i = 0; i < d.length; i++) {
                let options = {
                    text: `${config.public.vCardUri}/p/${d[i].sAMAccountName}/`,
                    width: 500,
                    height: 500,
                    colorDark: config.qrCodeColorDark,
                    colorLight: config.qrCodeColorLight,
                    correctLevel: QRCode.CorrectLevel.Q, // L, M, Q, H
                    // dotScale
                    dotScale: 0.7,
                    /*   logo: `assets/${username}.jpg`,
                    logoWidth: 100,
                    logoHeight: 100, */

                    // Background Image
                    backgroundImage: `${path.join(__dirname, '..', 'public')}${config.qrCodeLogo}`,
                    backgroundImageAlpha: 0.5,

                    PO: config.qrCodeOuterColor, // Global Position Outer color. if not set, the default is `colorDark`
                    PI: config.qrCodeInnerColor, // Global Position Inner color. if not set, the default is `colorDark`
                    AO: config.qrCodeOuterColor, // Alignment Outer. if not set, the default is `colorDark`
                    AI: config.qrCodeInnerColor, // Alignment Inner. if not set, the default is `colorDark`
                }
                let qrcode = new QRCode(options)
                await qrcode.saveImage({
                    path: path.join(__dirname, '..', 'public', 'qrCodes', `${d[i].sAMAccountName.toLowerCase()}.png`),
                })
            }
            result.generateQRCodes = 'Generated QR Codes files'


            result.status = 'Completed'
        } else {
            result.status = 'No data'
        }
    });
    res.json(result)
}

module.exports.api = async(req, res) => {
    let user = await ADUser.findOne({ sAMAccountName: req.params.sAMAccountName }).select('-_id displayName description mail mobile pager title department l streetAddress telegram whatsapp').lean()
    return res.json(user)
}

module.exports.scriptTxt = (req, res) => {
    res.send(`#PowerShell Script for manual launch on local computer<br/>
iwr ${config.public.vCardUri}/ps | iex<br/>`)
}

module.exports.publicConfig = (req, res) => {
    res.json(config.public)
}

module.exports.scriptPowershell = (req, res) => {
    res.setHeader("Content-Type", "application/octet-stream")
    res.send(outlookScript.script)
}