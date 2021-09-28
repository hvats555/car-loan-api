require('dotenv').config();

const cors = require("cors");
const express = require("express")
const admin = require('firebase-admin');
const csv=require('csvtojson')
const path = require('path');
const fs = require('fs');

const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })

const app = express();
app.use(cors());

app.use(express.urlencoded({ extended: false })) 
app.use(express.json())

var serviceAccount = require("./cars-development-1f062-firebase-adminsdk-380s6-6256a94373.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cars-development-1f062.firebaseio.com"
});

const db = admin.firestore();

const upload_carsInventory = (collection, jsonobjs) => {
    jsonobjs.forEach(async (element) => {
        await db.collection(collection).add(element);
    });

    console.log(`Upload completed in ${collection}`);
}

const upload_vehicalBookingGuide = async (collection, jsonobjs, bankId) => {
    console.log(collection);
    console.log(bankId);

    const bankRef = db.collection(collection).doc(bankId);
    await bankRef.update({vehicalBookingGuide: jsonobjs});

    console.log(`Upload completed in ${collection} for bank ${bankId}`);
}

app.post('/', (req, res) => {
    console.log(req.headers);
    res.send("ok");
});

app.post('/upload', upload.single('file'), function (req, res, next) {    
    const filePath = path.join('./uploads', req.file.filename);
    const fullPath =  path.resolve(filePath);
    console.log(fullPath);
    
    csv()
    .fromFile(fullPath)
    .then((jsonObj)=>{
        if(req.header('x-upload-collection') === 'banks') {
            upload_vehicalBookingGuide(req.header('x-upload-collection'), jsonObj, req.header('x-bankid'));
        } else if (req.header('x-upload-collection') === 'carsInventory') {
            upload_carsInventory(req.header('x-upload-collection'), jsonObj);
        }
        fs.unlinkSync(fullPath);
        res.send(jsonObj);
    })
  })

function emiCalculator(loanAmount, interestRate, loanDuration){         
    var interestPerYear = (loanAmount * interestRate)/100; 
    var monthlyInterest = interestPerYear/12;
    
    var monthlyPayment = monthlyInterest + (loanAmount/loanDuration);
    return monthlyPayment;  
}

const purgeSelectedCars = async (customerId, bankId) => {
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

app.post('/cars/search', async (req, res) => {
    const {bankId, customerId, profitAmount} = req.body;

    // purgeSelectedCars(customerId, bankId);
    purgeSelectedCars(customerId, bankId);

    console.log("Bank id", bankId);
    console.log("Customer id", customerId);
    console.log("profitAmount", profitAmount);

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
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log("Server is listening on port ", port);
})