const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_KEY);

const fs = require("fs");

exports.sendGridEmail = (to, filePath) => {
    const pathToAttachment = filePath;
    const attachment = fs.readFileSync(pathToAttachment).toString("base64");
    
    const msg = {
        to: to,
        from: 'hvats.hv@gmail.com',
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
      };
      sgMail.send(msg).catch(err => {
        console.log(err);
      });

      console.log("Email sent!");
}