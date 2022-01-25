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

// write logic to get timetable from database from here?
router.get('/api/v1/timetable/student/:studentID', (req, res) => {
  const { studentID } = req.params;
  con.query(
    {
      sql: 'SELECT s.class_id, c.module_code, l.day, l.start, l.end from student_class_link as s INNER JOIN lesson as l on l.class_id = s.class_id INNER JOIN class as c on c.id = s.class_id where student_id=? and semester = (SELECT MAX(id) FROM semester)',
      values: [studentID],
    },
    (error, results) => {
      if (error) throw error;
      const classDetails = results;
      const html = createTable(classDetails);
      res.render('timetable', { html });
    },
  );
});

router.get('/api/v1/timetable/tutor/:tutorID', (req, res) => {
  const tutorID = req.params.tutorID;
  // TODO: Get tutor allocation info from 3.8
  const html = '';
  res.render('timetable', { html });
});

router.get(
  '/api/v1/allocations/module/:module_code',
  (req, res) => {
    const moduleCode = req.params.module_code;
    con.query(
      {
        sql: 'SELECT student_id,class_id,semester from student_class_link INNER JOIN class ON student_class_link.class_id=class.id WHERE module_code = ? and semester = (SELECT MAX(id)  FROM semester)',
        values: [[moduleCode]],
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
  con.query(
    {
      sql: 'SELECT * from student_class_link WHERE class_id = ? and semester = (SELECT MAX(id)  FROM semester)',
      values: [classID],
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
    '0900': 0,
    '1000': 1,
    '1100': 2,
    '1200': 3,
    '1300': 4,
    '1400': 5,
    '1500': 6,
    '1600': 7,
    '1700': 8,
  };
  const dayDict = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
  };
  for (let i = 0; i < classList.length; i += 1) {
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
        += `<div class="h-14 text-center text-lg col-start-${
          start + 2
        } col-end-${
          end + 3
        }"><div class="h-10 pt-1 bg-purple-300 mx-5 text-center border-solid border-black border-2 rounded-xl">${
          day[i].module_code
        }</div></div>`;
    }
  });
  return html;
}
