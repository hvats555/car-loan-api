const express = require('express');
const router = express.Router();

const {search} = require('../controllers/search');

router.post('/', search);

module.exports = router;