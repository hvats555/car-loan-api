const express = require('express');
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })

let router = express.Router();

const {uploadInventory, uploadVehicalBookingGuide, uploadBankInterestFile} = require('../controllers/upload');

router.post('/inventory', upload.single('file'), uploadInventory);
router.post('/vehicalBookingGuide/:bankId', upload.single('file'), uploadVehicalBookingGuide);
router.post('/bankInterestFile/:bankId', upload.single('file'), uploadBankInterestFile);


module.exports = router;