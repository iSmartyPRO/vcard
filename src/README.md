# vCard System
This application is designed to store and display Virtual Cards of Active Directory Employees.

## Programming Languages, Database
- NodeJS
- PowerShell
- MongoDB

## Features:
- web based Active Directory show contact info
- generate qrCodes to web profile of employee
- generate VCF files for easy import them to Address Book (with photo embedded)
- generate Outlook signature
- Social Links in Outlook signature


## How to start
- configure DNS record Ex. vcard.example.com
- clone project
- rename config.sample.json to config.json
- edit config.json with your preferred data (including credentials to AD and MongoDB)
- install dependencies with command npm i
- run project in dev mode npm start dev
- PowerShell Script which generates Outlook Signature http://localhost:8094/script.ps1
- Enjoy



## readme will be updated soon


# Docker

## Install via docker

### Install process
npm install
docker-compose up -d

### View logs
docker-compose logs

## Clear docker

docker-compose down
docker image rm nodejs
docker builder prune
rm -rf node_modules


## Others

### Mass update address

#### TPU
Get-ADUser -Filter * -SearchBase "OU=Users,OU=ТПУ,OU=Accounts,DC=gescons,DC=ru" | Set-ADUser -StreetAddress "проспект Андропова 9, вл.1" "Москва" -Company 'ООО "ГЭС КОНСТРАКШН"' 

#### PRB
Get-ADUser -Filter * -SearchBase "OU=Users,OU=ПРБ,OU=Accounts,DC=gescons,DC=ru" | Set-ADUser -StreetAddress "ул. 1-я Бухвостова , дом 1" "Москва" -Company 'ООО "ГЭС КОНСТРАКШН"' -


## Set Photo to user
Set-ADUser username -Replace @{thumbnailPhoto=([byte[]](Get-Content "D:\username.jpg" -Encoding byte))}

Create user in mongodb
Connect to Mongo
```
# mongo vcard -u username -p password
```
create user 
```
> db = db.getSiblingDB('vcard')
> db.createUser( { user: "vcard", pwd: "vCardParolASAAcc3ss", roles: [ "readWrite", "dbAdmin" ]} )
```

Optional
```
use vcard
db.createUser(
   {
     user: "vcardUser",
     pwd: "vcardUserPassword!",
     roles: [ "readWrite", "dbAdmin" ]
   }
)
```
