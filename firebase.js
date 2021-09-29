require('dotenv').config();
const admin = require('firebase-admin');

var serviceAccount = require("./cars-development-1f062-firebase-adminsdk-380s6-6256a94373.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cars-development-1f062.firebaseio.com"
});

const db = admin.firestore();
module.exports = db;