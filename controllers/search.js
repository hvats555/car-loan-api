const db = require('../firebase');
const {emiCalculator} = require('../utils/search');
const axios = require('axios');
const _ = require('lodash');

const consola = require('consola')

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
            carFaxLink: doc.data().carfax_link,
            location: doc.data().location,
            profit: parseInt(profitAmount),
            featuresFound: [],
            featuresNotFound: []
        }

        last = snapshot.docs[snapshot.docs.length - 1];

        inventory.push(car);
    });

    return {
        inventory: inventory,
        last: last
    };
}

const searchCars = async (searchOptions, startAfter, limit) => {
    let customerId = searchOptions.customerId;
    let profitAmount = parseFloat(parseFloat(searchOptions.profitAmount).toFixed(2));
    let adminFee = parseFloat(parseFloat(searchOptions.adminFee).toFixed(2));

    let downPayment = parseFloat(parseFloat(searchOptions.downPayment).toFixed(2));
    let termExtension = parseFloat(parseFloat(searchOptions.termExtension).toFixed(2));
    let interestBreak = parseFloat(parseFloat(searchOptions.interestBreak).toFixed(2));
    
    let tradeInAllowance = parseFloat(parseFloat(searchOptions.tradeInAllowance).toFixed(2));
    let tradeLienAmount = parseFloat(parseFloat(searchOptions.tradeLienAmount).toFixed(2));
    let docfee = parseFloat(parseFloat(searchOptions.docfee).toFixed(2));
    let warranty = parseFloat(parseFloat(searchOptions.warranty).toFixed(2));
    let response = [];

    if(limit) {
        if(limit < 1) return res.status(400).json({"error": "limit cannot be less than 1"})
        limit = parseInt(limit);
    } else {
        limit = 10
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
    const approvedBanks = [];

    const approvedBanksRef = db.collection(`customers/${customerId}/approvedBanks`);
    const approvedBanksSnap = await approvedBanksRef.get();

    approvedBanksSnap.forEach((doc) => {
        approvedBanks.push(doc.data())
    })

    const taxExemption = customer.data().taxExemption;

    let inventory = [];
    let last;

    if(startAfter) {
        const nextInfo = await next(profitAmount, startAfter, limit);
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
                location: doc.data().location,
                carFaxLink: doc.data().carfax_link,
                profit: searchOptions.profitAmount,
                featuresFound: [],
                featuresNotFound: []
            }
            inventory.push(car);
        });
    }

    for(const car of inventory) {                
        let carStatus = {};
        let isVinsError;
        const carDetailsResponse = await axios.get(`http://candecode.com/api/v1/vins/${car.vin}`).catch((err) => {
            isVinsError = err
        });

        if(!isVinsError) {
            const carDetails = carDetailsResponse.data.result;

            if(carDetailsResponse.data.status == 'ok') {
                let carValue = {
                    extraClean: carDetails["Extra Clean"],
                    clean: carDetails.Clean,
                    average: carDetails.Average,
                    rough: carDetails.Rough
                };
        
                carDetails.Options.forEach((option) => {
                    if(option.status == "Found") {
                        carValue.extraClean = carDetails["Extra Clean"] + parseInt(option.price);
                        carValue.clean = carDetails.Clean + parseInt(option.price);
                        carValue.average = carDetails.Average + parseInt(option.price);
                        carValue.rough = carDetails.Rough + parseInt(option.price);
                        car.featuresFound.push(option.label)
                    } 
                    
                    if(option.status == "Not Found") {
                        car.featuresNotFound.push(option.label)
                    }
                });
    
                let selectedBank = [];
                let calculatedEmi = 0;

                for(let i=0; i<approvedBanks.length; i++) {
                    let emi = 0;
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
    
                    const interestRate = parseFloat(approvedBanks[i].interestRate) - interestBreak;

                    if(taxExemption) {
                        emi = emiCalculator(netCarPrice + warranty + docfee + adminFee, interestRate, term);
                    } else {
                        emi = emiCalculator(docfee * 1.12 + netCarPrice + ((car.price + profitAmount) - tradeInAllowance) * 0.12 + warranty * 1.05 + adminFee, interestRate, term);
                    }

                    console.log(emi);

                    approvedBanks[i].calculatedEmi = emi;

                    approvedBanks[i].cbb = {
                        condition: carStatus.type,
                        value: carValue[carStatus.type]
                    }

                    approvedBanks[i].interestRate = interestRate;
                    approvedBanks[i].term = term;

                    const bankValue = approvedBanks[i];

                    if(netCarPrice <= parseInt(maximumAllowedLoan) && emi > 0 && emi <= parseInt(approvedBanks[i].monthlyEmi)) {
                        selectedBank.push(bankValue);
                        calculatedEmi = emi;
                    }
                }

    
                const obj = {
                    car: car,
                    calculatedEmi: calculatedEmi,
                    bank: selectedBank
                }

                if(selectedBank.length > 0) {
                    response.push(JSON.parse(JSON.stringify(obj)));
                }
    
            } else {
                consola.info(`Warning: Failed to get data from API, for car ${ car.name } - ${ car.vin }, moving forward...`);
            }
        } else {
            consola.warn("VINS error", isVinsError.response.status)
        }
    }

    return {
        hasMore: await hasMore(last.data().cost),
        lastDocRef: last.data().cost,
        result: response
    };
}

exports.search = async (req, res) => {
    let result = await searchCars(req.body, req.query.startAfter, req.query.limit);

    console.log(result);

    while(result.hasMore && result.result.length == 0) {
        result = await searchCars(req.body, result.lastDocRef, req.query.limit);
    }

    res.send(result)
}