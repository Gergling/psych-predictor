// NOTE: If any authorisation issues occur, delete the token.json and rerun. It's usually just expired.
// TODO: Add variability such that you can choose the last date.
// TODO: Handle the fact that some days are missing by dividing the scores into the number of days found and multiplying by the days there are records for.

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

const config = require('./config.json');

const psychScores = require('./phq-9-gad-7');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const chosenDateStr = process.argv[2];

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), auth => {
    // listMajors(auth);
    getDailyReviewData(auth).then(data => {
      const view = getScoreView(data);
      console.log(view);
    });
  });
});

function getDateFromString(dateTimeString) {
  const [dateString] = dateTimeString.split(' ');
  const [day, month, year] = dateString.split('/');
  return new Date(year, month - 1, day);
}

function getScoreView(data) {
  const endDate = chosenDateStr ? new Date(chosenDateStr) : new Date();
  const dateTwoWeeksAgo = new Date(Date.now() - 1296e6); // or 12096e5. This is just to make sure it goes back to the correct date.
  dateTwoWeeksAgo.setHours(0,0,0,0);
  const isFromTheLastFortnight = row => {
    const [dateTimeString] = row;
    const date = getDateFromString(dateTimeString);
    return date.getTime() > dateTwoWeeksAgo.getTime() && date.getTime() < endDate.getTime();
  };
  const getPsychData = (obj, row) => {
    if (row[7]) {
      obj.phq9 += row[7];
    }
    if (row[8]) {
      obj.gad7 += row[8];
    }
    return obj;
  };

  const dailyData = data.filter(isFromTheLastFortnight);
  const psychData = dailyData.reduce(getPsychData, { phq9: '', gad7: ''});

  return {
    ...psychScores(psychData.phq9, psychData.gad7),
    from: dateTwoWeeksAgo,
    to: endDate,
    totalDays: dailyData.length
  };
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

async function getDailyReviewData(auth) {
  return new Promise((resolve, reject) => {
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: 'Form responses 1!A2:J',
    }, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res.data.values);
      }
    });
  });
}
