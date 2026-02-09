const session = require("express-session");
const { SESSION_SECRET } = require("./env");

const oneDayMs = 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";

module.exports = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "lax" : false,
    maxAge: oneDayMs,
  },
});
