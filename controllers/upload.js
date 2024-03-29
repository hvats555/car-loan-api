const csv=require('csvtojson')
const path = require('path');
const fs = require('fs');
const db = require('../firebase');

const {purgeInventory} = require('../utils/purgeInventory');
const {uploadInventory, uploadVehicalBookingGuide, uploadBankInterestFile} = require('../utils/upload');

exports.uploadInventory = async (req, res, next) => {
    const filePath = path.join('./uploads', req.file.filename);
    const fullPath =  path.resolve(filePath);

    // if(req.params.purge) {
    await purgeInventory();
    // }
    
    csv().fromFile(fullPath).then(async (json) => {
        await uploadInventory(json);

        fs.unlinkSync(fullPath);
        res.send(json);
    })
}

exports.uploadVehicalBookingGuide = (req, res, next) => {
    const bankId = req.params.bankId;

    const filePath = path.join('./uploads', req.file.filename);
    const fullPath =  path.resolve(filePath);
    
    csv().fromFile(fullPath).then((json) => {
        uploadVehicalBookingGuide(json, bankId);

        fs.unlinkSync(fullPath);
        res.send(json);
    })
}

exports.uploadBankInterestFile = (req, res, next) => {
    const bankId = req.params.bankId;

    const filePath = path.join('./uploads', req.file.filename);
    const fullPath =  path.resolve(filePath);
    
    csv().fromFile(fullPath).then((json) => {
        uploadBankInterestFile(json, bankId);

        fs.unlinkSync(fullPath);
        res.send(json);
    })
}