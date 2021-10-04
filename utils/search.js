exports.emiCalculator = (loanAmount, interestRate, term, downPayment, tradeIn) => {         
    let amount = parseInt(loanAmount);
    let intRate = parseInt(interestRate);
    let months = parseInt(term);
    let down = parseInt(downPayment);
    let trade = parseInt(tradeIn);

    // let totalDown  = down + trade;
    let totalDown = 0;
    let annInterest = intRate;
    let monInt = annInterest/ 1200;

    var calc = ((monInt + (monInt / (Math.pow((1 + monInt), months) -1))) * (amount - (totalDown || 0))).toFixed(2);

    return calc; 
}