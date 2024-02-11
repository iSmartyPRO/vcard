var ActiveDirectory = require('activedirectory2');
const config = require('../config')

const queryConstructor = (excludeList) => {
    let q = '(&(title=*)(description=*))';
    if(excludeList.length > 0){
      q = q + "(&(objectCategory=person)(objectClass=user)"
      excludeList.forEach(u => {
        q = q +`(!(sAMAccountName=${u}))`
      });
      q = q + ")"
    }
    return q
  }

module.exports.getADUsers = () => {
    const customParser = function(entry, raw, callback) {
        if (raw.hasOwnProperty("thumbnailPhoto")) { entry.thumbnailPhoto = raw.thumbnailPhoto; }
        callback(entry)
    }
    return new Promise((resolve, reject) => {
        var conf = {
            url: `ldap://${config.AD_Server}`,
            baseDN: config.AD_BaseDN,
            username: config.AD_Username,
            password: config.AD_Password,
            attributes: {
                user: [
                    'dn', 'mail', 'sAMAccountName', 'displayName', 'description', 'l', 'streetAddress', 'company',
                    'department', 'telephoneNumber', 'mobile', 'pager', 'title', 'thumbnailPhoto', 'wWWHomePage', 'homePhone', 'ipPhone'
                ]
            },
            entryParser: customParser
        }
        var ad = new ActiveDirectory(conf);
        var query = queryConstructor(config.excludeList)
        ad.findUsers(query, false, function(err, users) {
            if (err) {
                reject(err)
            }
            if ((!users) || (users.length == 0)) reject(err);
            else {
                resolve(users)
            }
        });
    })

}