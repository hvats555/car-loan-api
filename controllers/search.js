const temp = require('busboy');
const db = require('../firebase');
const {emiCalculator} = require('../utils/search');

const next = async (last, limit) => {
    const carsInventoryRef = db.collection('carsInventory').orderBy('price').startAfter(last).limit(limit);
    const snapshot = await carsInventoryRef.get();

    const inventory = [];

    snapshot.forEach(doc => {
        let car = {
            name: doc.data().name,
            price: parseInt(doc.data().cost),
            mileage: parseInt(doc.data().mileage),
            year: parseInt(doc.data().year),
            vin: doc.data().VIN,
            coverImage: doc.data().cover_image,
            url: doc.data().cat_URL,
            stockNumber: doc.data()["stock#"]
        }
        last = snapshot.docs[snapshot.docs.length - 1];

        inventory.push(car);
    });

    return {
        inventory: inventory,
        last: last
    };
}


exports.search = async (req, res) => {
    let customerId = req.body.customerId;
    let profitAmount = parseInt(req.body.profitAmount);
    let downPayment = parseInt(req.body.downPayment);
    let tradeInValue = parseInt(req.body.tradeInValue);
    let termExtension = parseInt(req.body.termExtension);
    let interestBreak = parseInt(req.body.interestBreak);

    let response = [];

    console.log(profitAmount);

    let limit = 2;

    if(req.query.limit) {
        if(req.query.limit < 1) return res.status(400).json({"error": "limit cannot be less than 1"})
        limit = parseInt(req.query.limit);
    }


    if(!customerId) {
        return res.status(400).json({"error": "customer id not provided"});
    }

    if(!profitAmount) {
        profitAmount = 3000;
    }

    if(!downPayment) {
        downPayment = 0;
    }

    if(!tradeInValue) {
        tradeInValue = 0;
    }

    if(!termExtension) {
        termExtension = 0;
    }

    if(!interestBreak) {
        interestBreak = 0;
    }

    const customerRef = db.collection('customers').doc(customerId);
    const customer = await customerRef.get();
    const approvedBanks = customer.data().approvedBanks;

    let inventory = [];
    let last;

    if(req.query.startAfter) {
        const nextInfo = await next(req.query.startAfter, limit);
        inventory = nextInfo.inventory;
        last = nextInfo.last;
    } else {
        const carsInventoryRef = db.collection('carsInventory').orderBy('price').limit(limit);
        const snapshot = await carsInventoryRef.get();
    
        last = snapshot.docs[snapshot.docs.length - 1];

        snapshot.forEach(doc => {
            let car = {
                name: doc.data().name,
                price: parseInt(doc.data().cost),
                mileage: parseInt(doc.data().mileage),
                year: parseInt(doc.data().year),
                vin: doc.data().VIN,
                coverImage: doc.data().cover_image,
                url: doc.data().cat_URL,
                stockNumber: doc.data()["stock#"]
            }
            inventory.push(car);
        });
    }

    for(const car of inventory) {
        const selectedBank = [];
        let calculatedEmi = 0;
        
        let carStatus = {};

        for(let i=0; i<approvedBanks.length; i++) {
            const bankRef = db.collection('banks').doc(approvedBanks[i].bankId);

            const bank = await bankRef.get();
            const vehicalBookingGuide = bank.data().vehicalBookingGuide;

            for(let i=0; i < vehicalBookingGuide.length; i++) {
                if(parseInt(vehicalBookingGuide[i].year) === car.year) {
                    if(car.mileage > vehicalBookingGuide[i].minMileage && car.mileage < vehicalBookingGuide[i].maxMileage) {
                        carStatus = vehicalBookingGuide[i];
                        break;
                    }
                }
            }

            const term = parseInt(carStatus.maxTerm) + termExtension;
            const carPrice = car.price + profitAmount;
            
            if(interestBreak >= parseInt(approvedBanks[i].interestRate)) return res.status(400).json({"error": "interest break should be less than the approved bank interest."})
    
            const interestRate = parseInt(approvedBanks[i].interestRate) - interestBreak;
    
            const emi = emiCalculator(carPrice, interestRate, term, downPayment, tradeInValue);
            if(Math.round(emi) <= Math.round(parseInt(approvedBanks[i].monthlyEmi))) {
                const bankValue = approvedBanks[i];
                bankValue.calculatedEmi = emi;
                selectedBank.push(bankValue);
                calculatedEmi = emi;
            }
        }

        if(calculatedEmi != 0) {
            response.push({
                car: car,
                calculatedEmi: calculatedEmi,
                bank: selectedBank
            })
        }
    }

    res.send({
        lastDocRef: last.data().price,
        result: response
    });
}