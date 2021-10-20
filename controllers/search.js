const db = require('../firebase');
const {emiCalculator} = require('../utils/search');
const axios = require('axios');
const _ = require('lodash');

const hasMore = async (last) => {
    const carsInventoryRef = db.collection('inventory').orderBy('cost').startAfter(last).limit(1);
    const snapshot = await carsInventoryRef.get();

    if(snapshot.size != 0) {
        return true
    } else {
        return false
    } 
}

const next = async (profitAmount, last, limit) => {
    const carsInventoryRef = db.collection('inventory').orderBy('cost').startAfter(last).limit(limit);
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
            profit: parseInt(profitAmount)
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
    let adminFee = parseInt(req.body.adminFee);

    let downPayment = parseInt(req.body.downPayment);
    let termExtension = parseInt(req.body.termExtension);
    let interestBreak = parseInt(req.body.interestBreak);
    
    let tradeInAllowance = parseInt(req.body.tradeInAllowance);
    let tradeLienAmount = parseInt(req.body.tradeLienAmount);
    let docfee = parseInt(req.body.docfee);
    let warranty = parseInt(req.body.warranty);

    let response = [];

    let limit = 2;

    if(req.query.limit) {
        if(req.query.limit < 1) return res.status(400).json({"error": "limit cannot be less than 1"})
        limit = parseInt(req.query.limit);
    }

    if(!customerId) return res.status(400).json({"error": "customer id not provided"});

    if(!profitAmount) profitAmount = 3000;
    if(!adminFee) adminFee = 0;

    if(!downPayment) downPayment = 0;
    if(!termExtension) termExtension = 0;
    if(!interestBreak) interestBreak = 0;
    if(!tradeInAllowance) tradeInAllowance = 0;
    if(!tradeLienAmount) tradeLienAmount = 0;
    if(!docfee) docfee = 0;
    if(!warranty) warranty = 0;

    let tradeInValue = tradeInAllowance - tradeLienAmount;

    const customerRef = db.collection('customers').doc(customerId);
    const customer = await customerRef.get();
    const approvedBanks = customer.data().approvedBanks;
    const taxExemption = customer.data().taxExemption;

    let inventory = [];
    let last;

    console.log("Fetching inventory from firestore...");

    if(req.query.startAfter) {
        const nextInfo = await next(profitAmount, req.query.startAfter, limit);
        inventory = nextInfo.inventory;
        last = nextInfo.last;
    } else {
        const carsInventoryRef = db.collection('inventory').orderBy('cost').limit(limit);
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
                totalDamage: doc.data().carfax_total_damage,
                profit: req.body.profitAmount,
            }
            inventory.push(car);
        });
    }

    console.log("Fetched inventory from firestore");

    for(const car of inventory) {  
        console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
              
        let carStatus = {};

        const carDetailsResponse = await axios.get(`http://candecode.com/vins/${car.vin}`);

        console.log("---------------------------");
        console.log(`Fetching Car details from http://candecode.com/vins/${car.vin}...`);

        const carDetails = carDetailsResponse.data.result;

        if(carDetailsResponse.data.status == 'ok') {
            let carValue = {
                extraClean: carDetails["Extra Clean"],
                clean: carDetails.Clean,
                average: carDetails.Average,
                rough: carDetails.Rough
            };

            console.log("Recieved the data...");
            console.log("Updating prices based on options...");

            // loop through options 

            carDetails.Options.forEach((option) => {
                if(option.status == "Found") {
                    carValue.extraClean = carDetails["Extra Clean"] + parseInt(option.price);
                    carValue.clean = carDetails.Clean + parseInt(option.price);
                    carValue.average = carDetails.Average + parseInt(option.price);
                    carValue.rough = carDetails.Rough + parseInt(option.price);
                }
            });

            console.log("Completed price update based on options...");
            
            console.log("Processing data, please wait...");

            let selectedBank = [];
            let calculatedEmi = 0;

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

                let maximumAllowedLoan = ((parseInt(approvedBanks[i].bankProgram.Advance) / 100) * carValue[carStatus.type]).toFixed(2);

                // ! Added term extension
                const term = parseInt(carStatus.maxTerm) + termExtension;

                // ! added docfee wFarranty and profit Amount;

                const netCarPrice = (car.price + profitAmount) - downPayment - tradeInValue;
                console.log(netCarPrice);

                const interestRate = parseFloat(approvedBanks[i].interestRate) - interestBreak;

                if(netCarPrice <= parseInt(maximumAllowedLoan)) {
                    let emi = 0;

                    if(taxExemption) {
                        emi = emiCalculator(netCarPrice + warranty + docfee + adminFee, interestRate, term);
                    } else {
                        emi = emiCalculator(docfee * 1.12 + netCarPrice + ((car.price + profitAmount) - tradeInAllowance) * 0.12 + warranty * 1.05 + adminFee, interestRate, term);
                    }

                    approvedBanks[i].calculatedEmi = emi;
                    const bankValue = approvedBanks[i];

                    selectedBank.push(bankValue);
                    calculatedEmi = emi;
                }
            }

            const obj = {
                car: car,
                calculatedEmi: calculatedEmi,
                bank: selectedBank
            }

            if(calculatedEmi != 0) {
                console.log("----------final object: starts-----------");
                console.log(obj);
                console.log("---------ends-------");

                response.push(JSON.parse(JSON.stringify(obj)));
            }

            console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
        } else {
            console.log(`Warning: Failed to get data from API, for car ${ car.name } - ${ car.vin }, moving forward...`);
        }
    }

    res.send({
        hasMore: await hasMore(last.data().cost),
        lastDocRef: last.data().cost,
        result: response
    });
}