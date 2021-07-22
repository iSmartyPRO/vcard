const express = require("express")
const mongoose = require("mongoose")
const morgan = require("morgan")
const exphbs = require("express-handlebars")
const path = require("path")
const config = require("./config")

// Подключение к БД
mongoose.connect(config.mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
    })
    .then(() => console.log('Mongo DB Connected'))
    .catch(err => console.log(error))


const app = express()
const pagesRoutes = require("./routes/pages")
const { static } = require('express')

const hbs = exphbs.create({
    defaultLayout: 'main',
    extname: 'hbs',
})

app.engine('hbs', hbs.engine)
app.set('view engine', 'hbs')
app.set('views', 'views')

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static('public'))
app.use('/public/uikit', express.static(path.join(__dirname, 'node_modules', 'uikit', 'dist')))
app.use(morgan('combined'))
app.use("/", pagesRoutes)

module.exports = app