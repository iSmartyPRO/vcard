const express = require("express")
const router = express.Router()
const controller = require("../controllers/pages")

router.get('/', controller.home)
router.get('/action/update', controller.update)
router.get('/p/:sAMAccountName', controller.detail)
router.get('/api/:sAMAccountName', controller.api)
router.get('/script', controller.scriptTxt)
router.get('/config', controller.publicConfig)
router.get('/script.ps1', controller.scriptPowershell)

module.exports = router