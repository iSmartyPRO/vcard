const express = require("express")
const cron = require('node-cron')
const fetch = require('node-fetch')

const config = require("./config")
const app = require("./app")

// Schedule updating users from Active Directory
cron.schedule(`${config.cronUpdateUsers}`, async function() {
    console.log('Cron - updating users!')
    console.log(`GET - ${config.public.vCardUri}/action/update`)
    await fetch(`${config.public.vCardUri}/action/update`)
        .then(res => res.json())
        .then(json => console.log(json))
})


app.listen(config.APP_PORT, () => { console.log(`Server is running on port ${config.APP_PORT}`) })