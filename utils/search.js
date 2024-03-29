exports.emiCalculator = (loanAmount, interestRate, term) => {         
    let amount = parseFloat(loanAmount).toFixed(2);
    let intRate = parseFloat(interestRate).toFixed(2);
    let months = parseInt(term);

    let totalDown = 0;
    let annInterest = intRate;
    let monInt = annInterest/ 1200;

    var calc = ((monInt + (monInt / (Math.pow((1 + monInt), months) -1))) * (amount - (totalDown || 0))).toFixed(2);

    return calc; 
}