const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

const mongoose = require('mongoose');
const {Schema} = require("mongoose/lib/browser");
mongoose.connect(process.env.MONGO_URI).catch(err => {console.log(err)});

let userSchema = new Schema({
  username: {type: String}
});

let exerciseSchema = new Schema({
    description: String,
    duration: Number,
    date: String
});

let logSchema = new Schema({
    userId: {type: String, unique: true},
    logx: [exerciseSchema]
});

const User = mongoose.model("User", userSchema);
const Log = mongoose.model("Log", logSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.post(
    '/api/users',
    function (req, res) {
      let userName = req.body.username;
      let newUser = new User({username: userName});
      newUser.save(function (err, data) {
        if(err) res.send(err);
        //else console.log("Success with data: "+data);
      });
      res.send(newUser);
    }
);

app.get(
    '/api/users',
    function (req, res) {
        User.find({}, function (err, data) {
            if(err) res.send(err);
            res.send(data);
        });
    }
);

app.post(
    '/api/users/:_id/exercises',
    async function (req, res) {
        let userId = req.params._id;
        let doc = await User.findById(userId).exec();
        let username = doc.username;
        let description = req.body.description;
        let duration = parseInt(req.body.duration);
        let date = req.body.date;
        if(date===undefined){
            date = new Date().toDateString();
        } else {
            date = new Date(date).toDateString();
        }
        let exerciseData = new Exercise({
            description: description,
            duration: duration,
            date: date
        });
        let logDoc = await Log.findOne({userId:userId}).exec();
        if(logDoc===undefined||logDoc===null)
            logDoc = new Log({
                    userId: userId,
                    logx: [exerciseData]
                });
        else
            logDoc.logx.push(exerciseData);
        await logDoc.save();
        res.send({
            username: username,
            _id: userId,
            description: description,
            duration: duration,
            date: date
        });
    }
);

app.get(
    '/api/users/:_id/logs?',
    async function (req, res) {
        let userId = req.params._id;
        let userDoc = await User.findById(userId).exec();
        let logDoc = await Log.findOne({userId:userId}).exec();
        let username = userDoc.username;
        if (req.query.from) {
            let fromDate = new Date(req.query.from).getTime();
            let toDate = new Date(req.query.to).getTime();
            let limit = req.query.limit || logDoc.logx.length;
            let count = 0;
            let originalLogs = logDoc.logx;
            let modifiedLogs = [];
            for (let i=0;i<originalLogs.length;i++) {
                let currDate = new Date(originalLogs[i].date).getTime();
                if (fromDate<currDate && currDate<toDate && count<limit) {
                    modifiedLogs.push(originalLogs[i]);
                    count++;
                }
            }
            res.send({
                username: username,
                count: count,
                _id: userId,
                log: modifiedLogs
            });
        } else if (req.query.limit) {
            let limit = req.query.limit;
            logDoc.logx = logDoc.logx.slice(0,limit);
            let count = logDoc.logx.length;
            res.send({
                username: username,
                count: count,
                _id: userId,
                log: logDoc.logx
            });
        } else {
            let count = logDoc.logx.length;
            res.send({
                username: username,
                count: count,
                _id: userId,
                log: logDoc.logx
            });
        }
    }
);