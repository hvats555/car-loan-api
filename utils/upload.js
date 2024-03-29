const db = require('../firebase');
const admin = require('firebase-admin');

exports.uploadInventory = (jsonobjs) => {
    console.log("Upload started...");

    jsonobjs.forEach(async (element) => {
        await db.collection("inventory").add(element);
    });

    console.log("Inventory upload complete");
}

exports.uploadVehicalBookingGuide = async (jsonobjs, bankId) => {
    console.log("Upload started for vehical booking guide")
    const bankRef = db.collection("banks").doc(bankId);
    await bankRef.update({
        vehicalBookingGuide: jsonobjs,
        vehicalBookingGuideLastUpdate: admin.firestore.Timestamp.fromDate(new Date())
    });

    console.log(`Upload completed for bank ${bankId}`);
}

exports.uploadBankInterestFile= async (jsonobjs, bankId) => {
    console.log("Upload started for bank interestFile")
    const bankRef = db.collection("banks").doc(bankId);
    await bankRef.update({
        bankInterest: jsonobjs,
        bankInterestLastUpdate: admin.firestore.Timestamp.fromDate(new Date())
    });

    console.log(`Upload completed for bank interest file ${bankId}`);
}