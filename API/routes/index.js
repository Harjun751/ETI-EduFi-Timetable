const express = require('express');

const router = express.Router();
const mysql = require('mysql');

// TODO: Replace these with envvars
const con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: 'edufi',
  password: 'password',
  database: 'edufi',
});

con.connect((err) => {
  if (err) {
    throw err;
  }
});

router.get('/timetable', (req, res) => {
  // get authentication detail from cookie
  // check if tutor or student
  // return tutor/student 's timetable
});

// write logic to get timetable from database from here?
router.get('/api/v1/timetable/student/:studentID', (req, res) => {
  const { studentID } = req.params;
  const prevMonday = getPreviousMonday();
  con.query(
    {
      sql: 'SELECT s.class_id, c.module_code, l.day, l.start, l.end from student_class_link as s INNER JOIN lesson as l on l.class_id = s.class_id INNER JOIN class as c on c.id = s.class_id where student_id=? and semester = ?',
      values: [studentID, prevMonday],
    },
    (error, results) => {
      if (error) throw error;
      const classDetails = results;
      const html = createTable(classDetails);
      const uniqueModuleCodes = [...new Set(classDetails.map(x => x.module_code))];
      res.render('timetable', { html, uniqueModuleCodes });
    },
  );
});

router.get('/api/v1/timetable/tutor/:tutorID', (req, res) => {
  const { tutorID } = req.params;
  // TODO: Get tutor allocation info from 3.8
  const classList = [{
    class_id: 123, lessons: [{ day: 'monday', start: '0900', end: '1000' }, { day: 'wednesday', start: '0900', end: '1000' }], module_code: 'DL', capacity: 1, enrolled: 0,
  },
  {
    class_id: 321, lessons: [{ day: 'monday', start: '1000', end: '1200' }, { day: 'wednesday', start: '1000', end: '1200' }], module_code: 'PRG', capacity: 3, enrolled: 0,
  }];
  const html = createTable(classDetails);
  res.render('timetable', { html });
});

router.get(
  '/api/v1/allocations/module/:module_code',
  (req, res) => {
    const moduleCode = req.params.module_code;
    const prevMonday = getPreviousMonday();
    con.query(
      {
        sql: 'SELECT student_id,class_id,semester from student_class_link INNER JOIN class ON student_class_link.class_id=class.id WHERE module_code = ? and semester = ?',
        values: [[moduleCode,prevMonday]],
      },
      (error, results) => {
        if (error) throw error;
        res.send(results);
      },
    );
  },
);

router.get('/api/v1/allocations/class/:class_id', (req, res) => {
  const classID = req.params.class_id;
  const prevMonday = getPreviousMonday();
  con.query(
    {
      sql: 'SELECT * from student_class_link WHERE class_id = ? and semester = ?',
      values: [classID,prevMonday],
    },
    (error, results) => {
      if (error) throw error;
      res.send(results);
    },
  );
});

module.exports = router;

function createTable(classList) {
  const timingsDict = {
    900:  0 + 2,
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
    "monday":2,
    "tuesday":3,
    "wednesday":4,
    "thursday":5,
    "friday":6,
  }
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
    classList[i].rowStart = dayToRow[classList[i].day]
    // Push lesson for the day to respective day lists
    dayDict[classList[i].day].push(classList[i]);
    dayDict[classList[i].day].sort();
  }
  let html = '';
  Object.keys(dayDict).forEach((key) => {
    const day = dayDict[key];
    for (let i = 0; i < day.length; i += 1) {
      const start = timingsDict[day[i].start];
      const end = timingsDict[day[i].end];
      html
        += `<div class="h-14 pt-2 text-center text-lg col-start-${ start } col-end-${ end } row-start-${ day[i].rowStart }"><div class="h-10 c_transition pt-1 ${ day[i].module_code } mx-5 text-center border-solid border-black border-2 rounded-xl">${
          day[i].module_code
        }</div></div>`;
    }
  });
  return html;
}

function getPreviousMonday(){
  const prevMonday = new Date();
  while (prevMonday.getDay() !== 1) {
    prevMonday.setDate(prevMonday.getDate() - 1);
  }
  return `${prevMonday.getDate()}-${prevMonday.getMonth() + 1}-${prevMonday.getFullYear()}`
}