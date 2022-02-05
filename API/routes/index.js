if (!process.env.IS_PRODUCTION) {
  console.log('local env');
  require('dotenv').config();
}
const express = require('express');
const axios = require('axios');

const router = express.Router();
const mysql = require('mysql');

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: 'edufi',
  password: 'password',
  database: 'edufi',
});

const classAPIGet = `${process.env.CLASS_API}class?key=2c78afaf-97da-4816-bbee-9ad239abb296`;

router.get('/timetable', (req, res) => {
  // get authentication detail from cookie
  // check if tutor or student
  // return tutor/student 's timetable
});

router.get('/api/v1/timetable/student/:studentID', (req, res, next) => {
  const { studentID } = req.params;
  const prevMonday = getPreviousMonday();
  let classDetails;
  let allClasses;

  const queryPromise = new Promise((resolve, reject) => {
    pool.query(
      {
        sql: 'SELECT * from student_class_link WHERE student_id=? and semester=?',
        values: [studentID, prevMonday],
      },
      (error, results) => {
        if (error) {
        // pass error to expressjs error handler
          next(error);
          reject(error);
        }
        classDetails = results;
        resolve();
      },
    );
  });

  const getPromise = axios.get(classAPIGet).then((response) => {
    allClasses = response.data;
  }).catch((error) => {
    console.log(error);
  });

  // Wait for GET to Class MS and query to DB before next part
  Promise.all([queryPromise, getPromise]).then(() => {
    classDetails = classDetails.map((x) => x.class_id);
    allClasses = allClasses.filter((x) => classDetails.includes(x.classid));
    const html = createTable(allClasses);
    const uniqueModuleCodes = [...new Set(allClasses.map((x) => x.moduleid))];
    res.render('timetable', { html, uniqueModuleCodes });
  });
  // res.render('timetable', {html:"<h1>Unable to load data...</h1>"});
  res.render('timetable', { html: '<div class="h-14 pt-2 text-center text-lg col-start-2 col-end-4 row-start-3"><div class="h-10 c_transition pt-1 Your-Mother mx-5 text-center border-solid border-black border-2 rounded-xl">Your Mother</div></div>', uniqueModuleCodes: 'Your-Mother' });
});

router.get('/api/v1/timetable/tutor/:tutorID', (req, res, next) => {
  const { tutorID } = req.params;
  axios.get(classAPIGet).then((response) => {
    let classList = response.data;
    classList = classList.filter((x) => x.tutorid == tutorID);
    const uniqueModuleCodes = [...new Set(classList.map((x) => x.moduleid))];
    const html = createTable(classList);
    res.render('timetable', { html, uniqueModuleCodes });
  }).catch((error) => {
    next(error);
  });
});

router.get(
  '/api/v1/allocations/module/:module_code',
  async (req, res, next) => {
    const moduleCode = req.params.module_code;
    const prevMonday = getPreviousMonday();

    let classID;
    await axios.get(classAPIGet).then((response) => {
      const classList = response.data;
      const class_ = classList.find((x) => x.moduleid === moduleCode);
      classID = class_.classid;
    }).catch((error) => {
      next(error);
    });

    pool.query(
      {
        sql: 'SELECT * from student_class_link WHERE class_id = ? and semester = ?',
        values: [classID, prevMonday],
      },
      (error, results) => {
        if (error) {
          // pass error to expressjs error handler
          next(error);
        }
        res.send(results);
      },
    );
  },
);

router.get('/api/v1/allocations/class/:class_id', (req, res, next) => {
  const classID = req.params.class_id;
  const prevMonday = getPreviousMonday();
  pool.query(
    {
      sql: 'SELECT * from student_class_link WHERE class_id = ? and semester = ?',
      values: [classID, prevMonday],
    },
    (error, results) => {
      if (error) {
        // pass error to expressjs error handler
        next(error);
      }
      res.send(results);
    },
  );
});

module.exports = router;

function createTable(classList) {
  // Halfway support? 0930?
  const timeToCol = {
    '0900': 0 + 2,
    1000: 1 + 2,
    1100: 2 + 2,
    1200: 3 + 2,
    1300: 4 + 2,
    1400: 5 + 2,
    1500: 6 + 2,
    1600: 7 + 2,
    1700: 8 + 2,
  };
  const dayToRow = {
    monday: 2,
    tuesday: 3,
    wednesday: 4,
    thursday: 5,
    friday: 6,
  };
  const dayDict = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
  };
  // TODO: Refactor this if have time, fugly as hell
  for (let i = 0; i < classList.length; i += 1) {
    // Add row start value to class data
    classList[i].rowStart = dayToRow[classList[i].classdate.toLowerCase()];
    // Push lesson for the day to respective day lists
    dayDict[classList[i].classdate.toLowerCase()].push(classList[i]);
    dayDict[classList[i].classdate.toLowerCase()].sort();
  }
  let html = '';
  Object.keys(dayDict).forEach((key) => {
    const day = dayDict[key];
    for (let i = 0; i < day.length; i += 1) {
      const start = timeToCol[day[i].classstart];
      const end = timeToCol[day[i].classend];
      html
        += `<div class="h-14 pt-2 text-center text-lg col-start-${start} col-end-${end} row-start-${day[i].rowStart}"><div class="h-10 c_transition pt-1 ${day[i].moduleid} mx-5 text-center border-solid border-black border-2 rounded-xl">${
          day[i].moduleid
        }</div></div>`;
    }
  });
  return html;
}

function getPreviousMonday() {
  const prevMonday = new Date();
  while (prevMonday.getDay() !== 1) {
    prevMonday.setDate(prevMonday.getDate() - 1);
  }
  return `${prevMonday.getDate()}-${prevMonday.getMonth() + 1}-${prevMonday.getFullYear()}`;
}
