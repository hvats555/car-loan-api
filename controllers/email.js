const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const utils = require('util');
const ejs = require('ejs');

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_KEY);

const readFile = utils.promisify(fs.readFile);

const { result } = require('./result');

async function getTemplateHtml() {
    console.log("Loading template file in memory")
    try {
        const filePath = path.join('./template', 'index.html');
        const fullPath =  path.resolve(filePath);

        const quotationPath = path.resolve(fullPath);
        return await readFile(quotationPath, 'utf8');
    } catch (err) {
        console.log(err);
        return Promise.reject("Could not load html template");
    }
}

const func = (approvedBank, bank) => {
    for(let i=0; i<approvedBank.length; i++) {
        for(let j=0; j<bank.length; j++) {
            // less than login
            if(approvedBank[i].bankId == bank[j].bankId) {
                approvedBank[i].foundCount = 1;
                approvedBank[i].calculatedEmi = bank[j].calculatedEmi;
                break;
            } else {
                approvedBank[i].calculatedEmi = bank[j].calculatedEmi;
                approvedBank[i].foundCount = 0;
            }
        }        
    }
    return approvedBank;
}

exports.sendEmail = (async (req, res) => {
    const searchResults = req.body;
    // const searchResults = result;

    getTemplateHtml().then(async (file) => {
        const template = ejs.compile(file, {async: true});
        let ejsData = {
            res: searchResults
        };

        searchResults.results.forEach((result) => {
            ejsData.filteredBanks = func(searchResults.approvedBanks, result.bank);
        });

        console.log("preparing the data");
        const result = await template(ejsData);
        const html = result;
        
        const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(0);
        await page.setContent(html);

        const buffer = await page.pdf({format: 'A4', landscape:true});
        await browser.close();

        console.log("preparing the result");

        const filePath = '/tmp/searchReport.pdf';
        await fs.writeFile(filePath, buffer, async (err) => {
            if(err) {
                return res.status(500).json({"error": err});
            }
            console.log("Sending the email...");

            const attachment = fs.readFileSync(filePath).toString("base64");

            await sgMail.send({
                to: req.body.to,
                from: process.env.FROM_EMAIL,
                subject: 'Cars Search Results',
                text: 'Car Search Results are ready, find them in the attachments',
                attachments: [
                  {
                    content: attachment,
                    filename: "searchResults.pdf",
                    type: "application/pdf",
                    disposition: "attachment"
                  }
                ]
              }).catch(err => {
                  console.log(err.response.body);
                  res.status(500).json({"error": err});
              });

            console.log("Email successfully sent!");

            fs.unlinkSync(filePath);
            return res.status(200).send("OK");
        }); 
    });
});
