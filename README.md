# vCard System
This application is designed to store and display Virtual Cards of Active Directory Employees.

## Programming Languages, Database
- NodeJS
- PowerShell
- MongoDB

## Feature:
- web based Active Directory show contact info
- generate qrCodes to web profile of employee
- generate VCF files for easy import them to Address Book (with photo embedded)
- generate Outlook signature
- Social Links in Outlook signature


## How to start
- configure DNS record Ex. vcard.example.com
- clone project
- rename config.sample.json to config.json
- edit config.son with your preferred data (including credentials to AD and MongoDB)
- install dependencies with command npm i
- run project in dev mode npm start dev
- Enjoy

## readme will be updated soon