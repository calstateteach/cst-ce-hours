/* Download CSV file from URL using https library & csv-parse package.
10.17.2017 tps
10.18.2017 tps Add labelRowData().
11.13.2017 tps Make sure to create a new parser for each invocation.
*/

const https = require('https');
const parse = require('csv-parse');

var debugMode = false;


/******************** Async Functions ********************/

function readCsvFromUrl(httpsUrl, callback) {
  /* Populate array with rows of spreadsheet fetched from a URL.
  callback signature: (<error>, <array of spreadsheet rows>)
  */

  var parser = parse();

  https.get(httpsUrl, (res) => {
    if (debugMode) {
      console.log('statusCode:', res.statusCode);
      console.log('headers:', res.headers);
    }

    if (res.statusCode != 200) {
      return callback(new Error(`Error: URL status code: ${res.statusCode}`));
    }

    // Feed csv parser with spreadsheet data.
    res.on('data', (d) => {
      if (debugMode) {
        process.stdout.write(d);
      }
      parser.write(d);
    });

    // When done, gather CSV rows into array and return to callback.
    res.on('end', () => {
      parser.end(); // Make sure the writeable stream is closed.

      let rows = [];
      let data;
      while(data = parser.read()) {
        rows.push(data);
      }

      callback(null, rows);
    });

  }).on('error', (e) => {
    parser.end();
    callback(e);
  });

}


/******************** Utility Functions ********************/

function labelRowData(oldRows) {
  /* Create a collection of CSV rows with data values accessible via
  property names matching column headers, to make it easier to
  access row data.
  */
  var newRows = [];

  var headers = oldRows[0]; // 1st row is assumed to contain column headers.
  let headerMax = headers.length; 
  let rowMax = oldRows.length;
  let rowIdx = 1;

  for (; rowIdx < rowMax; ++ rowIdx) {
    let dataRow = oldRows[rowIdx];
    let headerIdx = 0;
    for (; headerIdx < headerMax; ++headerIdx) {
      dataRow[headers[headerIdx]] = dataRow[headerIdx];
    }
    newRows.push(dataRow);
  } 

  return newRows;
}


/******************** Module Exports ********************/

exports.readCsvFromUrl = readCsvFromUrl;
exports.labelRowData = labelRowData;

exports.debug = function() { 
  debugMode = true;
  return this;
}