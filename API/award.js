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
  let student_data = [];

  await axios.get(`${process.env.STUDENT_API}students`).then((response) => {
    student_data = response.data;
  }).catch((error) => {
    logger.error(`Failed to get student list. ${error}`);
  });

  for (let i = 0; i < student_data.length; i++) {
    axios.post((process.env.TRANSACTION_API+"Transactions/maketransaction/2"), {
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
