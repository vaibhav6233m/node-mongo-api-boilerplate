// const con = require('../database/mysql')
const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
const config = require('../../config');

const status = config.env;

/**
 * Function for Encrypting the data
 * @param {*} data (data to encrypt)
 * @param {*} return (encrypted data)
 */
function encryptData(data) {
  if (status === 'development') {
    return { encResponse: data };
  }
  const dataString = JSON.stringify(data);
  const response = CryptoJS.AES.encrypt(dataString, config.cryptokey);
  return { encResponse: response.toString() };
}

/**
 * Function for decrypting the data
 * @param {*} data (data to decrypt)
 * @param {*} return (decrypt data)
 */
function decryptData(data) {
  if (status === 'development') {
    return data;
  }
  const decrypted = CryptoJS.AES.decrypt(data, config.cryptokey);
  if (decrypted) {
    const userinfo = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    return userinfo;
  }
  return { userinfo: { error: 'Please send proper token' } };
}

/**
 * Function for Encrypting the password
 * @param {*} data (data to encrypt)
 * @param {*} return (encrypted data)
 */
function encryptPassword(data) {
  const response = CryptoJS.AES.encrypt(data, config.tokenkey);
  return response.toString();
}

/**
 * Function for decrypting the password
 * @param {*} data (data to decrypt)
 * @param {*} return (decrypt data)
 */
function decryptPassword(data) {
  const decrypted = CryptoJS.AES.decrypt(data, config.tokenkey);
  if (decrypted) {
    const userinfo = decrypted.toString(CryptoJS.enc.Utf8);
    return userinfo;
  }
  return { userinfo: { error: 'Please send proper token' } };
}

/**
 * Function for encryting the userId with session
 * @param {*} data (data to encrypt)
 * @param {*} return (encrypted data)
 */
async function tokenEncrypt(data) {
  const token = await jwt.sign({ data }, config.tokenkey, { expiresIn: 24 * 60 * 60 }); // Expires in 1 Day
  return token;
}

/**
 * Function for decryting the userId with session
 * @param {*} data (data to decrypt)
 * @param {*} return (decrypted data)
 */
async function tokenDecrypt(data) {
  try {
    const decode = await jwt.verify(data, config.tokenkey);
    return decode;
  } catch (error) {
    return error;
  }
}

/**
 * Function for creating response
 * @param {*} data (status, data, token)
 * @param {*} return (encrypted data)
 */
function responseGenerator(code, message, data = '') {
  const details = {
    status: { code, message },
    result: data
  };

  console.log(details);

  if (status === 'development') {
    return details;
  }
  return encryptData(details);
}

/**
 * Function for sending email
 * @param {*} data (to, sub)
 * @param {*} return (decrypted data)
 */
async function sendEmail(to, subject, message) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.SMTPemailAddress,
      pass: config.SMTPPassword
    }
  });

  const mailOptions = {
    from: 'developers.nodemongo@gmail.com',
    to,
    subject,
    html: message
  };

  try {
    const smsDetails = await transporter.sendMail(mailOptions);
    return smsDetails;
  } catch (error) {
    return error;
  }
}

/**
 * Function to randomly generate string
 * param
 * return (err, result)
 */
function generateRandomString(callback) {
  const referralCode = randomstring.generate({
    length: 9,
    charset: 'alphanumeric',
    capitalization: 'uppercase'
  });

  callback(referralCode);
}

module.exports = {
  encryptData,
  decryptData,
  encryptPassword,
  decryptPassword,
  tokenEncrypt,
  tokenDecrypt,
  responseGenerator,
  sendEmail,
  generateRandomString
};
