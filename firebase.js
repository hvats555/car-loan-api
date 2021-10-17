if(process.env.NODE_ENV) {
  require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` })
} else {
  require('dotenv').config();
}

const admin = require('firebase-admin');

if(process.env.NODE_ENV == 'production') {
  var serviceAccount = require("./firebase.production.json");
}else if(process.env.NODE_ENV == 'development') {
  var serviceAccount = require("./firebase.development.json");
} else {
  var serviceAccount = require("./firebase.local.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cars-development-1f062.firebaseio.com"
});

const db = admin.firestore();
module.exports = db;