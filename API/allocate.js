const mysql = require('mysql');
// import fetch from ('node-fetch');

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
    new transports.File({ filename: 'allocate.log' }),
  ],
});

const con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: 'edufi',
  password: 'password',
  database: 'edufi',
});

async function allocateClasses() {
  // Get bidding list
  // const bidAPIEndpoint = 'http://localhost:3000';
  // const classAPIEndpoint = 'http://localhost:3000';

  // Assumed returned data from bid api & class api
  let bidList = [
    { student_id: 1, bid: 1, class_id: 321 },
    { student_id: 5, bid: 128, class_id: 123 },
    { student_id: 2, bid: 130, class_id: 321 },
    { student_id: 3, bid: 130, class_id: 321 },
    { student_id: 12, bid: 130, class_id: 321 },
  ];

  bidList.sort((a, b) => parseFloat(b.bid) - parseFloat(a.bid));
  const classList = [{
    class_id: 123, lessons: [{ day: 'monday', start: '0900', end: '1000' }, { day: 'wednesday', start: '0900', end: '1000' }], module_code: 'DL', capacity: 1, enrolled: 0,
  },
  {
    class_id: 321, lessons: [{ day: 'monday', start: '1000', end: '1200' }, { day: 'wednesday', start: '1000', end: '1200' }], module_code: 'PRG', capacity: 3, enrolled: 0,
  }];

  con.connect((err) => {
    if (err) {
      logger.crit(`Error connecting to database. ${err.stack}`);
    }
  });

  const failedBids = [];
  // Add bids where bids < 3 to the failed bids list
  classList.forEach((y) => {
    const toRemove = bidList.filter((x) => x.class_id === y.class_id);
    if (toRemove.length < 3) {
      failedBids.push(...toRemove);
      bidList = bidList.filter((value) => toRemove.indexOf(value) === -1);
    }
  });

  const studentClassList = [];
  let currClass = null;
  for (let i = 0; i < bidList.length; i += 1) {
    // Get class details from class list
    currClass = classList.find((x) => x.class_id == bidList[i].class_id);
    if (currClass.enrolled < currClass.capacity) {
      // Add student to student-class list only if the enrolled value  is OK
      studentClassList.push({ student_id: bidList[i].student_id, class_id: currClass.class_id });
      currClass.enrolled += 1;
    } else {
      // push failed bid with bid amnt to another list
      failedBids.push({ student_id: bidList[i].student_id, bid_amount: bidList[i].bid });
    }
  }

  const uniqueClassIDs = [...new Set(studentClassList.map((x) => x.class_id))];
  const uniqueStudentIDs = [...new Set(studentClassList.map((x) => x.student_id))];

  // Create semester
  const today = new Date();
  const formattedSemStartDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  // Set end date to a week from start
  today.setDate(today.getDate() + 7);
  const formattedSemEndDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  let semesterID = -1;
  con.query(`INSERT INTO semester (start,end) VALUES ('${formattedSemStartDate}', '${formattedSemEndDate}')`, insertClass);

  // Insert calss data
  // Update module code if necessary
  function insertClass(error, results) {
    if (error) throw error;
    semesterID = results.insertId;
    const uniqueClassDetails = uniqueClassIDs.map((x) => {
      const { moduleCode } = classList.find((y) => y.class_id === x);
      return [x, moduleCode];
    });
    con.query({
      sql: 'INSERT INTO class VALUES ? ON DUPLICATE KEY UPDATE module_code=VALUES(module_code);',
      values: [uniqueClassDetails],
    }, insertLessons);
  }

  // Insert lessons
  function insertLessons() {
    const lessonDetails = uniqueClassIDs.map((x) => {
      const deets = [];
      const thisClass = classList.find((y) => y.class_id === x);
      thisClass.lessons.forEach((lesson) => {
        deets.push([x, lesson.start, lesson.end, lesson.day]);
      });
      return deets;
    });
    con.query({
      // pretend this is fine
      // TODO: refine data structure
      sql: 'DELETE FROM lesson',
    }, () => {
      con.query({
        sql: 'INSERT INTO lesson (class_id,start,end,day) VALUES ?',
        values: lessonDetails,
      }, insertStudent);
    });
  }

  // insert students
  function insertStudent(error) {
    if (error) throw error;
    const formattedStudentID = uniqueStudentIDs.map((x) => [x]);
    // Create students
    con.query({
      sql: 'INSERT IGNORE INTO student VALUES ?',
      values: [formattedStudentID],
    }, insertLink);
  }

  // Insert the timetable data
  function insertLink(error) {
    if (error) throw error;
    const studentLinkDetails = studentClassList.map(
      (x) => [x.student_id, x.class_id, semesterID],
    );
    // Create student-class linkage
    con.query({
      sql: 'INSERT INTO student_class_link VALUES ?',
      values: [studentLinkDetails],
    }, (error) => {
      if (error) throw error;
      con.end();
      // Log if all is good
      logger.log({ level: 'info', message: 'Classes successfully allocated' });
      // Call refund bids function
      refundBids(failedBids);
    });
  }
}

async function refundBids(failedBids) {
  // TOWRITE: Call wallet credit API for refunds
  console.log('refunded!');

  // for (let i = 0; i < failedBids.length; i++){
  //     await fetch(credit_api_endpoint, {
  //         method:'POST',
  //         body: JSON.stringify({ credits : failedBids[i].bid_amount, student : student_data["student_id"] })
  //     })
  // }
}

allocateClasses();
