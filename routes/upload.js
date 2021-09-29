const express = require('express');
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })

let router = express.Router();

const {uploadInventory, uploadVehicalBookingGuide} = require('../controllers/upload');

router.post('/inventory', upload.single('file'), uploadInventory);
router.post('/vehicalBookingGuide', upload.single('file'), uploadVehicalBookingGuide);

module.exports = router;