const csv=require('csvtojson')
const path = require('path');
const fs = require('fs');

const {uploadInventory, uploadVehicalBookingGuide} = require('../utils/upload');

exports.uploadInventory = (req, res, next) => {
    const filePath = path.join('./uploads', req.file.filename);
    const fullPath =  path.resolve(filePath);
    
    csv().fromFile(fullPath).then((json) => {
        uploadInventory(json);

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