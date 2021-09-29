require('dotenv').config();
const cors = require("cors");
const express = require("express");

const search = require('./routes/search');
const upload = require('./routes/upload');

const app = express();
app.use(cors());

app.use(express.json())

app.post('/', (req, res) => {
    res.send("Status: OK");
});

app.use('/api/cars/search', search);
app.use('/api/upload', upload);

const port = process.env.PORT || 5001;

app.listen(port, () => {
    console.log("Server is listening on port ", port);
})