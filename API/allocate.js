const mysql = require('mysql');
const axios = require('axios');

const { createLogger, format, transports } = require('winston');
const { Console } = require('winston/lib/winston/transports');

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
  // TODO: Check server time and docker scheduler
  const nextMonday = new Date();
  while (nextMonday.getDay() !== 1) {
    nextMonday.setDate(nextMonday.getDate() + 1);
  }

  const semesterStartDate = `${nextMonday.getDate()}-${nextMonday.getMonth() + 1}-${nextMonday.getFullYear()}`;

  // Get bidding list
  const bidAPIEndpoint = `http://localhost:9221/api/v1/bids?semesterStartDate=${semesterStartDate}&status=Pending&key=2c78afaf-97da-4816-bbee-9ad239abb298`;
  const classAPIEndpoint = 'http://localhost:3000';

  // let bidList;

  // await axios.get(bidAPIEndpoint).then((response) => {
  //   bidList = response.data;
  // }).catch((error) => {
  //   logger.error(`Failed to get bid list. ${error}`);
  // });

  // Assumed returned data from bid api & class api
  const bidList = [
    {
      BidID: 1, SemesterStartDate: '29/1/2022', ClassID: 321, StudentID: 1, StudentName: 'Dingus', TokenAmount: 1, Status: 'Pending',
    },
    {
      BidID: 5, SemesterStartDate: '29/1/2022', ClassID: 123, StudentID: 5, StudentName: 'Bingus', TokenAmount: 128, Status: 'Pending',
    },
    {
      BidID: 2, SemesterStartDate: '29/1/2022', ClassID: 321, StudentID: 2, StudentName: 'Wingus', TokenAmount: 130, Status: 'Pending',
    },
    {
      BidID: 3, SemesterStartDate: '29/1/2022', ClassID: 321, StudentID: 3, StudentName: 'Fingus', TokenAmount: 130, Status: 'Pending',
    },
    {
      BidID: 12, SemesterStartDate: '29/1/2022', ClassID: 321, StudentID: 12, StudentName: 'Lingus', TokenAmount: 130, Status: 'Pending',
    },
  ];

  bidList.sort((a, b) => parseFloat(b.TokenAmount) - parseFloat(a.TokenAmount));
  const classList = [{
    class_id: 123, lessons: [{ day: 'monday', start: '0900', end: '1000' }, { day: 'wednesday', start: '0900', end: '1000' }], module_code: 'DL', capacity: 1, enrolled: 0,
  },
  {
    class_id: 321, lessons: [{ day: 'monday', start: '1000', end: '1200' }, { day: 'wednesday', start: '1000', end: '1200' }], module_code: 'PRG', capacity: 3, enrolled: 0,
  }];

  con.connect((err) => {
    if (err) {
      logger.error(`Error connecting to database. ${err.stack}`);
    }
  });

  const failedBids = [];
  // Add bids where bids < 3 to the failed bids list
  classList.forEach((y) => {
    const toRemove = bidList.filter((x) => x.ClassID === y.class_id);
    if (toRemove.length < 3) {
      failedBids.push(...toRemove);
      for (let i = 0; i < toRemove.length; i += 1) {
        bidList.find((x) => x.BidID === toRemove[i].BidID).Status = 'Failed';
      }
    }
  });

  const studentClassList = [];
  let currClass = null;
  for (let i = 0; i < bidList.length; i += 1) {
    
    // TODO: check if a conditional is required here to skip the already failed bids
    
    // Get class details from class list
    currClass = classList.find((x) => x.class_id === bidList[i].ClassID);
    if (currClass.enrolled < currClass.capacity) {
      // Add student to student-class list only if the enrolled value  is OK
      studentClassList.push({ student_id: bidList[i].StudentID, class_id: currClass.class_id });
      bidList[i].Status = 'Success';
      currClass.enrolled += 1;
    } else {
      // push failed bid with bid amnt to another list
      bidList[i].Status = 'Failed';
      failedBids.push({ student_id: bidList[i].StudentID, bid_amount: bidList[i].TokenAmount });
    }
  }

  const uniqueClassIDs = [...new Set(studentClassList.map((x) => x.class_id))];
  const uniqueStudentIDs = [...new Set(studentClassList.map((x) => x.student_id))];

  // Insert class data
  // Update module code if necessary
  const uniqueClassDetails = uniqueClassIDs.map((x) => {
    const moduleCode = classList.find((y) => y.class_id === x).module_code;
    return [x, moduleCode];
  });
  con.query({
    sql: 'INSERT INTO class VALUES ? ON DUPLICATE KEY UPDATE module_code=VALUES(module_code);',
    values: [uniqueClassDetails],
  }, insertLessons);

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
      (x) => [x.student_id, x.class_id, semesterStartDate],
    );
    // Create student-class linkage
    con.query({
      sql: 'INSERT INTO student_class_link VALUES ?',
      values: [studentLinkDetails],
    }, updateBids);
  }
  function updateBids(error) {
    if (error) throw error;
    // Log if all is good
    logger.log({ level: 'info', message: 'Classes successfully allocated' });
    // update bid API on successful bids

    // for (let i = 0; i < bidList.length; i += 1) {
    //   const url = `http://localhost:9221/api/v1/bids/${bidList[i].BidID}?key=2c78afaf-97da-4816-bbee-9ad239abb298`;
    //   axios.put(url, bidList[i])
    //     .then((response) => {
    //       console.log(response);
    //     }).catch((error) => {
    //       logger.error(`Failed to update bid list. ${error}`);
    //     });
    // }
    // Call refund bids function
    refundBids(failedBids);
  }
}

async function refundBids(failedBids) {
  return;
  const credit_api_endpoint = 'http://localhost:9072/api/v1/Transactions/maketransaction/1';

  for (let i = 0; i < failedBids.length; i++) {
    axios.post(credit_api_endpoint, {
      StudentID: '0', // "ADMINID"
      ToStudentID: failedBids[i].StudentID,
      TokenTypeID: 1,
      TransactionType: 'Failed Bid Refund',
      Amount: failedBids[i].TokenAmount,
    }).catch((error) => {
      logger.error(`Failed to refund bid. ${error}`);
    });
  }
}

allocateClasses();
