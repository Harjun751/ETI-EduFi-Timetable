// import fetch from 'node-fetch';

async function award_tokens() {
  console.log('awarded!');
  return;
  // get student list
  const student_api_endpoint = 'http://localhost:3000';
  const credit_api_endpoint = 'http://localhost:3000';

  let student_data = [];
  await fetch(student_api_endpoint, {
    method: 'GET',
  })
    .then(async (res) => {
      if (!res.ok) {
        throw ('ERR getting students');
      }
      res.json();
    })
    .then((data) => { student_data = data; });

  for (let i = 0; i < student_data.length; i++) {
    await fetch(credit_api_endpoint, {
      method: 'POST',
      body: JSON.stringify({ credits: 20, student: student_data.student_id }),
    });
  }
}
