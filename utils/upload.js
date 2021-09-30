const db = require('../firebase');

exports.uploadInventory = (jsonobjs) => {
    jsonobjs.forEach(async (element) => {
        await db.collection("inventory").add(element);
    });

    console.log(`Upload completed in ${collection}`);
}

exports.uploadVehicalBookingGuide = async (jsonobjs, bankId) => {
    const bankRef = db.collection("banks").doc(bankId);
    await bankRef.update({vehicalBookingGuide: jsonobjs});

    console.log(`Upload completed for bank ${bankId}`);
}