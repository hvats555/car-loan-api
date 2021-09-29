const db = require('../firebase');
const {emiCalculator, purgeSelectedCars} = require('../utils/search');

exports.search = async (req, res) => {
    const {bankId, customerId, profitAmount} = req.body;

    purgeSelectedCars(customerId, bankId);

    let approvedBank = {};

    const customerRef = db.collection('customers').doc(customerId);
    const customer = await customerRef.get();
    const approvedBanks = customer.data().approvedBanks;


    for(let i=0; i<approvedBanks.length; i++) {
        if(approvedBanks[i].bankId === bankId) {
            approvedBank = approvedBanks[i];
            break;
        }
    }

    console.log(approvedBank);

    const carsInventoryRef = db.collection('carsInventory');
    const snapshot = await carsInventoryRef.get();

    if (snapshot.empty) {
        console.log('No matching documents.');
        return;
    }  

    snapshot.forEach(async doc => {  
        let car = {
            price: parseInt(doc.data().cost) + profitAmount,
            mileage: parseInt(doc.data().mileage),
            year: parseInt(doc.data().year)
        }
        
        const bankRef = db.collection('banks').doc(bankId);
        const bank = await bankRef.get();
        const vehicalBookingGuide = bank.data().vehicalBookingGuide;
        let carStatus = {};

        for(let i=0; i<vehicalBookingGuide.length; i++) {
            if(parseInt(vehicalBookingGuide[i].year) === car.year) {
                if(car.mileage > vehicalBookingGuide[i].minMileage && car.mileage < vehicalBookingGuide[i].maxMileage) {
                    carStatus = vehicalBookingGuide[i];
                    break;
                }
            }
        }

        const emi = emiCalculator(car.price, parseInt(approvedBank.interestRate), parseInt(carStatus.maxTerm));
        console.log(emi);
        if(Math.round(emi) <= Math.round(parseInt(approvedBank.monthlyEmi))) {
            console.log(`Adding ${doc.name}`);
            await db.collection('selectedCars').add({
                car: doc.id,
                customer: customerId,
                bank: bankId,
                calculatedEmi: Math.round(emi)
            });
        }     
    });

    res.send("ok");
}