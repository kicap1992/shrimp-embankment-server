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


async function insert_data(water_height, status) {
  const query_insert = 'INSERT INTO tb_data (water_height, status) VALUES (?, ?)';
  const result_insert = await new Promise((resolve, reject) => {
    connection.query(query_insert, [water_height, status], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  })
}


app.post('/', async (req, res) => {
  var data = req.body;
  try {
    const query_search = 'Select * from tb_data';
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

    const status = data.danger_level == 1 ? 2 : data.warning_level == 1 ? 1 : 0;
    if (result_search.length > 0) {
      const last_data = result_search[result_search.length - 1];

      var converted_time_last = new Date(last_data.created_at);
      now = now.getTime();
      converted_time_last = converted_time_last.getTime();
      var differenceInSeconds = (now - converted_time_last) / 1000;
      console.log(differenceInSeconds, "second");


      const thresholds = {
        2: 30,
        1: 60,
        default: 120
      };

      const threshold = thresholds[status] || thresholds.default;

      if (differenceInSeconds > threshold) {
        insert_data(data.water_height, status);
      }





    } else {

      insert_data(data.water_height, status);
    }

    console.log(data);
    io.emit('data', data);
    res.status(200).json({ message: 'success', data: data });
  } catch (error) {
    console.log("ini error post", error);
    res.status(500).json({ message: 'Internal server error' });
  }

})


app.get('/', async (req, res) => {
  const date = req.query.date;
  console.log(date, "ini di get");
  
  const query_search = date == null 
  ? 'SELECT * FROM tb_data ORDER BY created_at DESC LIMIT 20' 
  : 'SELECT * FROM tb_data WHERE created_at LIKE "%' + date + '%" ORDER BY created_at DESC';

  const result_search = await new Promise((resolve, reject) => {
    connection.query(query_search, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  })
  res.status(200).json({ message: 'success', data: result_search });

})

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
