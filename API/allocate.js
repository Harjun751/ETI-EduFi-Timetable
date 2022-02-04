const mysql = require('mysql');
const axios = require('axios');

const { createLogger, format, transports } = require('winston');
const { Console } = require('winston/lib/winston/transports');
const { connect } = require('./routes');

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

async function allocateClasses(){
  // ----- STEP 1: Get bids ----- //
  const nextMonday = new Date();
  while (nextMonday.getDay() !== 1) {
    nextMonday.setDate(nextMonday.getDate() + 1);
  }

  const semesterStartDate = `${nextMonday.getDate()}-${nextMonday.getMonth() + 1}-${nextMonday.getFullYear()}`;

  // Get bidding list
  const bidAPIEndpoint = `http://localhost:9221/api/v1/`;
  const apiKey = 'key=2c78afaf-97da-4816-bbee-9ad239abb298'

  // GET request to bid API
  let bidList;
  // await axios.get(bidAPIEndpoint + `bids?semesterStartDate=${semesterStartDate}&status=Pending&` + apiKey)
  // .then((response) => {
  //   bidList = response.data;
  // }).catch((error) => {
  //   logger.error(`Failed to get bid list. ${error}`);
  // });

  bidList = [
    {
      BidID: 1, SemesterStartDate: '29/1/2022', ClassID: 1, StudentID: 1, StudentName: 'Dingus', TokenAmount: 1, Status: 'Pending',
    },
    {
      BidID: 5, SemesterStartDate: '29/1/2022', ClassID: 2, StudentID: 5, StudentName: 'Bingus', TokenAmount: 128, Status: 'Pending',
    },
    {
      BidID: 7, SemesterStartDate: '29/1/2022', ClassID: 2, StudentID: 3, StudentName: 'Bingus', TokenAmount: 128, Status: 'Pending',
    },
    {
      BidID: 2, SemesterStartDate: '29/1/2022', ClassID: 1, StudentID: 2, StudentName: 'Wingus', TokenAmount: 130, Status: 'Pending',
    },
    {
      BidID: 3, SemesterStartDate: '29/1/2022', ClassID: 1, StudentID: 3, StudentName: 'Fingus', TokenAmount: 130, Status: 'Pending',
    },
    {
      BidID: 12, SemesterStartDate: '29/1/2022', ClassID: 1, StudentID: 12, StudentName: 'Lingus', TokenAmount: 130, Status: 'Pending',
    },
  ];

  // ----- STEP 2: GET Class Details ----- //
  let classList;
  await axios.get("http://localhost:9101/api/v1/class?key=2c78afaf-97da-4816-bbee-9ad239abb296").then((response) => {
    classList = response.data;
  }).catch((error) => {
    logger.error(`Failed to get class list. ${error}`);
  });
  // Add enrolled col to classlist for tracking
  classList = classList.map(x=> {x.enrolled = 0; return x;} );

  // ----- STEP 3: Allocate Classes to Students ----- //
  // Sort Bidlist in descending bid amount
  bidList.sort((a, b) => parseFloat(b.TokenAmount) - parseFloat(a.TokenAmount));

  // if class enrolment less than 3, no class
  // Hence if <3 ppl bid on a class automatically mark as fail
  // Get dict of class:amount of bids
  var bidsForClass = {}
  for (let bid of bidList){
    if (bidsForClass[bid.ClassID]?.push){
      bidsForClass[bid.ClassID].push(bid);
    }
    else{
      bidsForClass[bid.ClassID] = [bid];
    }
  }
  for (let class_ of Object.keys(bidsForClass)){
    if (bidsForClass[class_].length <= 3){
      currBids = bidsForClass[class_].map(x=>x.BidID);
      bidList = bidList.map(x=> {
        if (currBids.includes(x.BidID)){
          x.Status = "Failed"
        };
        return x
      })
    }
  }

  // Go through every bid and allocate til class cap is reached
  for (let bid of bidList){
    // Skip iteration if bid status is failed
    if (bid.Status==="Failed"){
      continue;
    }

    let class_ = classList.find(x=>x.classid===bid.ClassID);
    if (class_.enrolled<class_.classcap){
      // Assign Bid
      class_.enrolled+=1;
      bid.Status = "Success";
    }
    else{
      // Set faild status
      bid.Status = "Failed";
    }
  }

  // ----- STEP 4: Insert succeeded bids into timetable ----- //
  const studentLinkDetails = bidList.map(x => [x.StudentID, x.ClassID, semesterStartDate])
  con.query({
    sql: 'INSERT INTO student_class_link VALUES ?',
    values: [studentLinkDetails],
  }, function(error){
    if (error){
      logger.error(`Failed to insert timetable. ${error}`);   
    }
    // ---------- STEP 5: Update Bid List ---------- //

    
    // for (let i = 0; i < bidList.length; i += 1) {
    //   const url = `http://localhost:9221/api/v1/bids/${bidList[i].BidID}?key=2c78afaf-97da-4816-bbee-9ad239abb298`;
    //   axios.put(url, bidList[i])
    //     .then((response) => {
    //       console.log(response);
    //     }).catch((error) => {
    //       logger.error(`Failed to update bid list. ${error}`);
    //     });
    // }

    // ---------- STEP 6: Refund Failed Bids ---------- //
    var failedBids = bidList.filter(x=>x.Status==="Failed");

    // for (let i = 0; i < failedBids.length; i++) {
    //   axios.post("http://localhost:9072/api/v1/Transactions/maketransaction/1", {
    //     StudentID: '0', // "ADMINID"
    //     ToStudentID: failedBids[i].StudentID,
    //     TokenTypeID: 1,
    //     TransactionType: 'Failed Bid Refund',
    //     Amount: failedBids[i].TokenAmount,
    //   }).catch((error) => {
    //     logger.error(`Failed to refund bid. ${error}`);
    //   });
    // }

    // End connection
    con.end();
  });  
}


allocateClasses();