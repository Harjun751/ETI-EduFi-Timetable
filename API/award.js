// import fetch from 'node-fetch';
const { createLogger, format, transports } = require('winston');

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
  console.log('awarded!');
  
  // get student list
  const student_api_endpoint = 'http://10.31.11.12:9211/api/v1/students/';
  const credit_api_endpoint = 'http://localhost:3000';

  let student_data = [];
  await fetch(student_api_endpoint, {
    method: 'GET',
  }).then(async (res) => {
      if (!res.ok) {
        logger.crit(`Request to student API failed. ${err.stack}`);
      }
      res.json();
    })
    .then((data) => { student_data = data; });

  // for (let i = 0; i < student_data.length; i++) {
  //   await fetch(credit_api_endpoint, {
  //     method: 'POST',
  //     body: JSON.stringify({ credits: 20, student: student_data.student_id }),
  //   });
  // }
}

award_tokens()
