const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const socket = require('./socket');
const app = express();
const server = http.createServer(app);
const io = socket.init(server);
const iosend = socket.getIO();
const conn = require('./conn.js');
const connection = conn.connection;

dotenv.config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(fileUpload());
app.options('*', cors());
app.use(cors());

// Helper function to format date
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

async function insert_data(data) {
  const parts = data.split(',');
  const query_insert = 'INSERT INTO tb_data (ultrasonic1, ultrasonic2,ph1,ph2,ph3,tds1, tds2,tds3)values(?, ?,?,?,?,?,?,?)';
  const result_insert = await new Promise((resolve, reject) => {
    connection.query(query_insert, [parts[1], parts[2], parts[3], parts[4], parts[5], parts[6], parts[6], parts[6]], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  })
}


app.post('/', async (req, res) => {
  var { value } = req.body;

  const query_search = 'Select * from tb_data';

  try {
    const result_search = await new Promise((resolve, reject) => {
      connection.query(query_search, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    })

    var now = new Date();

    if (result_search.length > 0) {
      const last_data = result_search[result_search.length - 1];

      var converted_time_last = new Date(last_data.waktu);

      now = now.getTime();
      converted_time_last = converted_time_last.getTime();
      var differenceInSeconds = (now - converted_time_last) / 1000;
      console.log(differenceInSeconds, "second");
      if (differenceInSeconds > 10) {
        insert_data(value);
      }
    } else {
      insert_data(value);
    }

  } catch (error) {
    console.log("error post", error);
    res.status(500).send(error);
  }
  const query_status = 'Select * from tb_gerbang';

  const result_status = await new Promise((resolve, reject) => {
    connection.query(query_status, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  })

  const status = result_status[0].status;

  io.emit('data', { value, status });

  res.status(200).send(status);

  // res.status(200).send('idle');
})

app.get('/', async (req, res) => {
  const date = req.query.date;
  const query_search = 'Select * from tb_data order by waktu desc limit 10';

  const result_search = await new Promise((resolve, reject) => {
    connection.query(query_search, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  })
  res.status(200).send(result_search);
})

app.post('/gerbang', async (req, res) => {
  const query = 'Select * from tb_gerbang';

  const result = await new Promise((resolve, reject) => {
    connection.query(query, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  })

  const status_gerbang = result[0].status;
  const status_update = status_gerbang == "buka" ? "tutup" : "buka";

  const query_update = 'UPDATE tb_gerbang SET status = ?';

  const result_update = await new Promise((resolve, reject) => {
    connection.query(query_update, [status_update], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  })

  res.status(200).send(result);

})

// Helper function to get random number in range
const getRandomInRange = (min, max) => {
  return (Math.random() * (max - min) + min).toFixed(2);
};


app.post('/dummy_data', async (req, res) => {
  // Date range
  const startDate = new Date(2024, 5, 20); // July 15, 2024
  const endDate = new Date(2024, 6, 31);   // July 31, 2024

  // Value ranges
  const ultrasonicRange = [150, 200];
  const phRange = [6.26, 7.10];
  const tdsRange = [1370, 1410];

  // Loop to generate and insert data
  let currentDate = startDate;
  while (currentDate <= endDate) {
    for (let hour = 0; hour < 24; hour++) {
      currentDate.setHours(hour);

      // Generate random seconds
      const randomSeconds = Math.floor(Math.random() * 60);
      currentDate.setSeconds(randomSeconds);

      const waktu = formatDate(currentDate);
      const ultrasonic1 = getRandomInRange(...ultrasonicRange);
      const ultrasonic2 = getRandomInRange(...ultrasonicRange);
      const ph1 = getRandomInRange(...phRange);
      const ph2 = getRandomInRange(...phRange);
      const ph3 = getRandomInRange(...phRange);
      const tds1 = getRandomInRange(...tdsRange);
      const tds2 = getRandomInRange(...tdsRange);
      const tds3 = getRandomInRange(...tdsRange);

      const query = `INSERT INTO tb_data (waktu, ultrasonic1, ultrasonic2, ph1, ph2, ph3, tds1, tds2, tds3)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      connection.query(query, [waktu, ultrasonic1, ultrasonic2, ph1, ph2, ph3, tds1, tds2, tds3], (error) => {
        if (error) {
          console.error('Error inserting data:', error);
          return res.status(500).send('Error inserting data');
        }
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  res.send('Dummy data inserted successfully');
});
// GET endpoint to fetch and format data
app.get('/dummy_data', async (req, res) => {
  const query = 'SELECT * FROM tb_data';
  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching data:', error);
      return res.status(500).send('Error fetching data');
    }

    // Format the 'waktu' field for each result
    const formattedResults = results.map(row => ({
      ...row,
      waktu: formatDate(new Date(row.waktu))
    }));

    res.send(formattedResults);
  });
});

// app error handler
app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).send('Something broke!');
});

io.on('connection', (socket) => {
  let userID = socket.id;
  console.log('A user connected: ' + userID);

  socket.on('scan_dia', (data) => {
    console.log('Received scan_dia event: ' + data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected: ' + userID);
  });
});

module.exports = {
  app,
  server,
  io
};

const port = process.env.PORT || 3001;

// Start the server
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
