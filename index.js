if(process.env.NODE_ENV == 'production') {
    require('dotenv').config({ path: `.env.production` })
} else if (process.env.NODE_ENV == 'development') {
    require('dotenv').config({ path: `.env.development` })
} else {
    require('dotenv').config()
}


console.log(process.env.ENV_TYPE);

const cors = require("cors");
const express = require("express");

const search = require('./routes/search');
const upload = require('./routes/upload');
const email = require('./routes/emails');
const _ = require('lodash');

const app = express();

app.locals._ = _;

app.use(cors({
    origin: "*"
  }));

app.use(express.json())

app.get('/', (req, res) => {
    res.send("Status: OK");
});

app.use('/api/cars/search', search);
app.use('/api/upload', upload);
app.use('/api/email', email);
app.set("view engine","ejs")

let port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log("Server is listening on port ", port);
})