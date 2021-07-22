const mongoose = require('mongoose')
const Schema = mongoose.Schema

/*
    'dn', 'mail', 'displayName', 'description', 'l', 'streetAddress', 'company',
    'department', 'telephoneNumber', 'mobile', 'pager', 'title','thumbnailPhoto'
*/

const ADUserSchema = new Schema({
    dn: { type: String, required: false },
    sAMAccountName: { type: String, required: false },
    mail: { type: String, required: false },
    displayName: { type: String, required: false },
    description: { type: String, required: false },
    l: { type: String, required: false },
    streetAddress: { type: String, required: false },
    company: { type: String, required: false },
    department: { type: String, required: false },
    telephoneNumber: { type: String, required: false },
    mobile: { type: String, required: false },
    pager: { type: String, required: false },
    title: { type: String, required: false },
    thumbnailPhoto: { type: Buffer, required: false, default: null },
    wWWHomePage: { type: String, required: false, default: null },
    whatsapp: { type: String, required: false, default: null },
    telegram: { type: String, required: false, default: null },
}, { timestamps: true })

module.exports = mongoose.model('ADUser', ADUserSchema)