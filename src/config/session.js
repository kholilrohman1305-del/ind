const session = require("express-session");
const { SESSION_SECRET } = require("./env");

const oneDayMs = 24 * 60 * 60 * 1000;

module.exports = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: oneDayMs,
  },
});
