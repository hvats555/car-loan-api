const db = require('../firebase');

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
    await bankRef.update({vehicalBookingGuide: jsonobjs});

    console.log(`Upload completed for bank ${bankId}`);
}