// import fetch from 'node-fetch';
const { createLogger, format, transports } = require('winston');
const axios = require('axios');

const {
  combine, timestamp, prettyPrint,
} = format;

const logger = createLogger({
  format: combine(
    timestamp(),
    prettyPrint(),
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'award.log' }),
  ],
});

async function award_tokens() {
  // get student list
  const student_api_endpoint = 'http://10.31.11.12:9211/api/v1/students/';
  const credit_api_endpoint = 'http://localhost:9072/api/v1/Transactions/maketransaction/2';

  let student_data = [];
  // await fetch(student_api_endpoint, {
  //   method: 'GET',
  // }).then(async (res) => {
  //   if (!res.ok) {
  //     logger.crit(`Request to student API failed. ${err.stack}`);
  //   }
  //   res.json();
  // })
  //   .then((data) => { student_data = data; });

  student_data = [{ StudentID: 'S10198398' }, { StudentID: 'S10183726' }, { StudentID: 'S10198397' }, { StudentID: 'SSSSSSSS' }];

  for (let i = 0; i < student_data.length; i++) {
    axios.post(credit_api_endpoint, {
      StudentID: '0', // "ADMINID"
      ToStudentID: student_data[i].StudentID,
      TokenTypeID: 1,
      TransactionType: 'Automatic credit',
      Amount: 20,
    }).catch((error) => {
      logger.error(`Failed to automatically credit API data. ${error}`);
    });
  }
}

award_tokens();
