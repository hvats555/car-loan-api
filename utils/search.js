const db = require('../firebase');

exports.emiCalculator = (loanAmount, interestRate, term, downPayment, tradeIn) => {         
    let amount = parseInt(loanAmount);
    let intRate = parseInt(interestRate);
    let months = parseInt(term);
    let down = parseInt(downPayment);
    let trade = parseInt(tradeIn);

    let totalDown  = down + trade;
    let annInterest = intRate;
    let monInt = annInterest/ 1200;

    var calc = ((monInt + (monInt / (Math.pow((1 + monInt), months) -1))) * (amount - (totalDown || 0))).toFixed(2);

    return calc; 
}

exports.purgeSelectedCars = async (customerId, bankId) => {
    const selectedCarsQuery = db.collection('selectedCars').where('customer', '==', customerId).where('bank', '==', bankId);

    const selectedCarsSnapshot = await selectedCarsQuery.get();

    if(selectedCarsSnapshot.empty) {
        console.log('Found no cars to purge, continuing...');
        return;
    } else {
        console.log(`Found ${selectedCarsSnapshot.size} to purge...`);

        selectedCarsSnapshot.forEach((selectedCar) => {
            console.log(`Purging ${selectedCar.id}`)
            selectedCar.ref.delete();
        });
    }
}