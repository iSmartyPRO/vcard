const express = require("express")

const config = require("./config")
const app = require("./app")

app.listen(config.APP_PORT, () => { console.log(`Server is running on port ${config.APP_PORT}`)})