const cron = require('node-cron')
const controller = require("./controllers/pages")

const config = require("./config")
const app = require("./app")

cron.schedule(`${config.cronUpdateUsers}`, async function() {
    console.log('Cron Task -> updating users!')
    await controller.update();
})

const port = process.env.PORT
app.listen(port, () => { console.log(`Server is running on port ${port}`) })