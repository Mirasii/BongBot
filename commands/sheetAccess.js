
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('../client_secret.json');
const doc = new GoogleSpreadsheet('1kNaDMAmB8l5uu1ssoW86dDiRv-oEVbq5n5kuy6VjAqk');

async function accessSpreadsheet() {

    await doc.useServiceAccountAuth({
        client_email: creds.client_email,
        private_key: creds.private_key,
    });
    
    await doc.getInfo();
    const sheet = doc.sheetsByIndex[0];
 
    const rows = await sheet.getRows();
    var tokenList =[];
    rows.forEach(row => tokenList.push(row.token));
    return tokenList;
}

async function appendSpreadsheet(channeldef) {

    console.log('enter');

    await doc.useServiceAccountAuth({
        client_email: creds.client_email,
        private_key: creds.private_key,
    });

    await doc.getInfo();
    const sheet = doc.sheetsByIndex[0];

    var check = false;
    const rows = await sheet.getRows();
    rows.forEach(row => {
        if (row.guild == channeldef.guild.id) {
            row.token = channeldef.id;
            row.save();
            check = true;
        }
    });

    if (check == false) {
        console.log ('enter check')
        row = {
            token: channeldef.id,
            guild: channeldef.guild.id
        };
        await sheet.addRow(row);
        console.log('added');
    }
    return true;
}

module.exports = {
    name: 'sheet',
    description:'',
    async access(){
        var toReturn = await accessSpreadsheet().then((value) => {return value});
        return toReturn;
    },
    
    async add(channeldef) {
        var toReturn = await appendSpreadsheet(channeldef).then((result) => {return result;}); 
        return toReturn;
    }
}

