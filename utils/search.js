const db = require('../firebase');

exports.emiCalculator = (loanAmount, interestRate, loanDuration) => {         
    var interestPerYear = (loanAmount * interestRate)/100; 
    var monthlyInterest = interestPerYear/12;
    
    var monthlyPayment = monthlyInterest + (loanAmount/loanDuration);
    return monthlyPayment;  
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