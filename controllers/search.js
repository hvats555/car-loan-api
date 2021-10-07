const db = require('../firebase');
const {emiCalculator} = require('../utils/search');

const fs = require('fs');

db.settings({
    ignoreUndefinedProperties: true
})

const next = async (last, limit) => {
    const carsInventoryRef = db.collection('inventory').orderBy('price').startAfter(last).limit(limit);
    const snapshot = await carsInventoryRef.get();

    const inventory = [];

    snapshot.forEach(doc => {
        let car = {
            name: doc.data().name,
            price: parseInt(doc.data().cost),
            mileage: parseInt(doc.data().mileage),
            age: doc.data().age,
            year: parseInt(doc.data().year),
            vin: doc.data().VIN,
            coverImage: doc.data().cover_image,
            url: doc.data().cat_URL,
            stockNumber: doc.data()["stock#"],
            numberOfAccidents: doc.data().carfax_number_of_accidents,
            notes: doc.data().carfax_notes,
            totalDamage: doc.data().carfax_total_damage,
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
    let termExtension = parseInt(req.body.termExtension);
    let interestBreak = parseInt(req.body.interestBreak);

    let tradeInAllowance = parseInt(req.body.tradeInAllowance);
    let tradeLienAmount = parseInt(req.body.tradeLienAmount);
    let docfee = parseInt(req.body.docfee);
    let warranty = parseInt(req.body.warranty);

    console.log(req.body);

    let tradeInValue = tradeLienAmount - tradeInAllowance;
    console.log("trade in value", tradeInValue);

    let response = [];


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

    if(!tradeInAllowance) {
        tradeInAllowance = 0;
    }

    if(!tradeLienAmount) {
        tradeLienAmount = 0;
    }

    if(!docfee) {
        docfee = 0;
    }

    if(!warranty) {
        warranty = 0;
    }

    const customerRef = db.collection('customers').doc(customerId);
    const customer = await customerRef.get();
    const approvedBanks = customer.data().approvedBanks;
    const taxExemption = customer.data().taxExemption;

    let inventory = [];
    let last;

    if(req.query.startAfter) {
        const nextInfo = await next(req.query.startAfter, limit);
        inventory = nextInfo.inventory;
        last = nextInfo.last;
    } else {
        const carsInventoryRef = db.collection('inventory').orderBy('price').limit(limit);
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
                age: doc.data().age,
                stockNumber: doc.data()["stock#"],
                numberOfAccidents: doc.data().carfax_number_of_accidents,
                notes: doc.data().carfax_notes,
                totalDamage: doc.data().carfax_total_damage
            }
            inventory.push(car);
        });
    }

    let tryCalculatedEmi = [];
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
            
            // ! Added term extension
            const term = parseInt(carStatus.maxTerm) + termExtension;

            // ! added docfee warranty and profit Amount;
            const carPrice = car.price + profitAmount + warranty + docfee;

            const bank_fee = 0;

            const finance_net_vehicle = car.price + tradeInValue;


            let finance_GST = 0;
            let finance_PST = 0;

            if(!taxExemption) {
                finance_GST = (finance_net_vehicle + docfee) * 0.07;
                finance_PST = (finance_net_vehicle + docfee + warranty) * 0.05;
            }

            const finance_total = finance_net_vehicle + docfee + warranty + finance_GST + finance_PST + bank_fee - downPayment;
            
            if(interestBreak >= parseInt(approvedBanks[i].interestRate)) return res.status(400).json({"error": "interest break should be less than the approved bank interest."})
    
            const interestRate = parseInt(approvedBanks[i].interestRate) - interestBreak;

            const emi = emiCalculator(finance_total, interestRate, term, downPayment, tradeInValue);

            if(Math.round(emi) <= Math.round(parseInt(approvedBanks[i].monthlyEmi))) {
                const bankValue = approvedBanks[i];
                bankValue.emi = emi;
                selectedBank.push(bankValue);
                calculatedEmi = emi;
                tryCalculatedEmi.push(emi);
            }
        }

        // for(let i=0; i<selectedBank; i++) {
        //     selectedBank[i].calculatedEmi = tryCalculatedEmi[i];
        // }

        const obj = {
            car: car,
            calculatedEmi: calculatedEmi,
            bank: selectedBank
        }
        
        if(calculatedEmi != 0) {
            response = [
            ...response,
            obj,
            ];
        // }
        }
    }

    console.log(tryCalculatedEmi);

    for(let i=0; i<response.length; i++) {
        // selectedBank[i].calculatedEmi = tryCalculatedEmi[i];
        for(let j=0; j<response[i].bank.length; j++) {
            response[i].bank[j].newEmi = tryCalculatedEmi[j];
        }
    }

    res.send({
        lastDocRef: last.data().price,
        result: response
    });
}