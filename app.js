const express = require("express")
const mongoose = require("mongoose")
const morgan = require("morgan")
const exphbs = require("express-handlebars")
const path = require("path")
const config = require("./config")

const {
    MONGO_USERNAME,
    MONGO_PASSWORD,
    MONGO_HOSTNAME,
    MONGO_PORT,
    MONGO_DB
  } = process.env;

// Подключение к БД
const mongoURI = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOSTNAME}:${MONGO_PORT}/${MONGO_DB}?authSource=vcard` || config.mongoURI
console.log({mongoURI})
mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
    })
    .then(() => console.log('Mongo DB Connected'))
    .catch(err => console.log(err))


const app = express()
const pagesRoutes = require("./routes/pages")

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
app.get("*", function(req, res) {
    res.redirect("/")
})

module.exports = app