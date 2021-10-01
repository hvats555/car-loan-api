const db = require('../firebase');

exports.purgeInventory = async () => {
    console.log("Purge started");
    const inventoryQuery = db.collection('inventory');

    const inventorySnapshot = await inventoryQuery.get();

    if(inventorySnapshot.empty) {
        console.log('Found no cars in inventory to purge, continuing...');
        return;
    } else {
        console.log(`Found ${inventorySnapshot.size} to purge...`);
        console.log("Purging...");

        inventorySnapshot.forEach((selectedCar) => {
            selectedCar.ref.delete();
        });
    }
    console.log("Purge Completed...")
}

