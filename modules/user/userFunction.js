const functions = require('../common/functions')
const config = require('../../config')
const validator = require('validator')
const code = require('../common/code')
const message = require('../common/message')
const fs = require('fs')
const User = require('../database/schema/user')

/**
 * API for user registration
 * @param {*} req (user detials)
 * @param {*} res (json with success/failure)
 */
function registration(info) {
  return new Promise((resolve, reject) => {
    try {
      if (validator.isEmail(info.data.emailAddress)) {
        info.data.userPassword = functions.encryptPassword(info.data.userPassword)
        const user = new User(info.data)
        user.save((err, regDetails) => {
          if (err) {
            reject({ code: code.dbCode, message: message.dbError, data: err })
          } else {
            let token = functions.tokenEncrypt(info.data.emailAddress)
            token = Buffer.from(token, 'ascii').toString('hex')
            console.log('token', token)

            const to = info.data.emailAddress
            const subject = message.registrationEmailSubject
            const link = config.emailVerifiedLink + token
            let emailMessage = fs
              .readFileSync('./modules/emailtemplate/welcome.html', 'utf8')
              .toString()
            emailMessage = emailMessage
              .replace('$fullname', info.data.firstName)
              .replace('$link', link)
            functions.sendEmail(to, subject, emailMessage, function(err, result) {
              resolve({ code: code.success, message: message.registration })
            })
          }
        })
      } else {
        reject({ code: code.invalidDetails, message: message.invalidEmail })
      }
    } catch (e) {
      reject({ code: code.invalidDetails, message: message.tryCatch, data: e })
    }
  })
}

/**
 * API for email verification
 * @param {*} req (email)
 * @param {*} res (json with success/failure)
 */
function verifyEmail(info) {
  return new Promise((resolve, reject) => {
    try {
      if (info.data.emailAddress) {
        const token = Buffer.from(info.data.emailAddress, 'hex').toString('ascii')
        functions.tokenDecrypt(token, function(err, result) {
          if (result) {
            User.updateOne({ emailAddress: result.data }, { isEmailVerified: 1 }, (err, result) => {
              if (err) {
                reject({ code: code.dbCode, message: message.dbError, data: err })
              } else if (result) {
                resolve({ code: code.success, message: message.emailVerificationSuccess })
              }
            })
          } else {
            reject({ code: code.sessionExpire, message: message.emailLinkExpired })
          }
        })
      } else {
        reject({ code: code.invalidDetails, message: message.invalidDetails })
      }
    } catch (e) {
      reject({ code: code.invalidDetails, message: message.tryCatch, data: e })
    }
  })
}

/**
 * API for user login
 * @param {*} req (email address & password)
 * @param {*} res (json with success/failure)
 */
function login(info) {
  return new Promise((resolve, reject) => {
    try {
      if (validator.isEmail(info.data.emailAddress)) {
        User.findOne({ emailAddress: info.data.emailAddress })
          .populate('countryId')
          .exec((err, userDetails) => {
            if (err) {
              reject({ code: code.dbCode, message: message.dbError, data: err })
            } else if (userDetails.emailAddress) {
              const password = functions.decryptPassword(userDetails.userPassword)
              if (password === info.data.userPassword) {
                if (userDetails.isActive === 1) {
                  if (userDetails.isEmailVerified === 1) {
                    userDetails.userPassword = null

                    resolve({ code: code.success, message: message.success, data: userDetails })
                  } else {
                    reject({ code: code.invalidDetails, message: message.emailVerify })
                  }
                } else {
                  reject({ code: code.invalidDetails, message: message.accountDisable })
                }
              } else {
                reject({ code: code.invalidDetails, message: message.invalidLoginDetails })
              }
            } else {
              reject({ code: code.invalidDetails, message: message.invalidLoginDetails })
            }
          })
      } else {
        reject({ code: code.invalidDetails, message: message.invalidLoginDetails })
      }
    } catch (e) {
      reject({ code: code.invalidDetails, message: message.tryCatch, data: e })
    }
  })
}

/**
 * API to Change password
 * @param {*} req (old password, token, new password )
 * @param {*} res (json with success/failure)
 */
function changePassword(info, userInfo) {
  return new Promise((resolve, reject) => {
    try {
      User.findOne({ _id: userInfo._id }, 'userPassword', (err, passwordDetails) => {
        if (err) {
          reject({ code: code.dbCode, message: message.dbError, data: err })
        } else if (passwordDetails.userPassword) {
          let password = functions.decryptPassword(passwordDetails.userPassword)

          if (password === info.data.oldPassword) {
            // Encrypt password for the user
            password = functions.encryptPassword(info.data.newPassword)

            passwordDetails.userPassword = password

            passwordDetails.save((err, updateDetails) => {
              if (err) {
                reject({ code: code.dbCode, message: message.dbError, data: err })
              } else {
                resolve({ code: code.success, message: message.passwordChanged })
              }
            })
          } else {
            reject({ code: code.invalidDetails, message: message.invalidDetails })
          }
        } else {
          reject({ code: code.invalidDetails, message: message.invalidDetails })
        }
      })
    } catch (e) {
      reject({ code: code.invalidDetails, message: message.tryCatch, data: e })
    }
  })
}

/**
 * API for Forget Password
 * @param {*} req (email address )
 * @param {*} res (json with success/failure)
 */
function forgetPassword(info) {
  return new Promise((resolve, reject) => {
    try {
      if (validator.isEmail(info.data.emailAddress)) {
        User.findOne(
          { emailAddress: info.data.emailAddress },
          ['emailAddress', 'firstName'],
          (err, userDetails) => {
            if (err) {
              reject({ code: code.dbCode, message: message.dbError, data: err })
            } else if (userDetails) {
              const to = userDetails.emailAddress

              let token = functions.tokenEncrypt(to)
              token = Buffer.from(token, 'ascii').toString('hex')
              console.log('token', token)

              const subject = message.forgotPasswordSubject
              const link = config.resetPasswordLink + token
              let emailMessage = fs
                .readFileSync('./modules/emailtemplate/reset.html', 'utf8')
                .toString()
              emailMessage = emailMessage
                .replace('$fullname', userDetails.firstName)
                .replace('$link', link)
                .replace('$emailId', config.supportEmail)

              functions.sendEmail(to, subject, emailMessage, function(err, result) {
                if (result) {
                  resolve({ code: code.success, message: message.resetLink })
                } else {
                  reject({ code: code.invalidDetails, message: message.dbError })
                }
              })
            } else {
              reject({ code: code.invalidDetails, message: message.invalidEmail })
            }
          }
        )
      } else {
        reject({ code: code.invalidDetails, message: message.invalidEmail })
      }
    } catch (e) {
      reject({ code: code.invalidDetails, message: message.tryCatch, data: e })
    }
  })
}

/**
 * API for Reset Password
 * @param {*} req (emailAddress )
 * @param {*} res (json with success/failure)
 */
function resetPassword(info) {
  return new Promise((resolve, reject) => {
    try {
      if (info.data.emailAddress) {
        const emailAddress = Buffer.from(info.data.emailAddress, 'hex').toString('ascii')
        functions.tokenDecrypt(emailAddress, function(err, emailAddressDetails) {
          if (emailAddressDetails) {
            //Encrypt password for the user
            const password = functions.encryptPassword(info.data.newPassword)

            User.updateOne(
              { emailAddress: emailAddressDetails.data },
              { userPassword: password },
              (err, emailAddressDetails) => {
                if (err) {
                  reject({ code: code.dbCode, message: message.dbError, data: err })
                } else {
                  resolve({ code: code.success, message: message.passwordReset })
                }
              }
            )
          } else {
            reject({ code: code.invalidDetails, message: message.emailLinkExpired, data: null })
          }
        })
      } else {
        reject({ code: code.invalidDetails, message: message.invalidEmail })
      }
    } catch (e) {
      reject({ code: code.invalidDetails, message: message.tryCatch, data: e })
    }
  })
}

/**
 * API to update profile
 * @param {*} req (token, user information )
 * @param {*} res (json with success/failure)
 */
function updateProfile(info, userInfo) {
  return new Promise((resolve, reject) => {
    try {
      if (
        !validator.isEmpty(info.data.firstName) &&
        !validator.isEmpty(info.data.lastName) &&
        !validator.isEmpty(info.data.address)
      ) {
        User.updateOne({ _id: userInfo._id }, info.data, (err, updateDetails) => {
          if (err) {
            reject({ code: code.dbCode, message: message.dbError, data: err })
          } else {
            resolve({ code: '00', message: message.profileUpdate })
          }
        })
      } else {
        reject({ code: code.invalidDetails, message: message.allFieldReq })
      }
    } catch (e) {
      reject({ code: code.invalidDetails, message: message.tryCatch, data: e })
    }
  })
}

/**
 * API for user history
 * @param {*} req (userId)
 * @param {*} res (json with success/failure)
 */
function userInformation(userInfo) {
  return new Promise((resolve, reject) => {
    try {
      User.find({ _id: userInfo._id })
        .populate('countryId')
        .exec((err, userDetail) => {
          if (err) {
            reject({ code: code.dbCode, message: message.dbError, data: err })
          } else if (userDetail) {
            resolve({ code: code.success, message: message.success, data: userDetail })
          } else {
            reject({ code: code.invalidDetails, message: message.noData })
          }
        })
    } catch (e) {
      reject({ code: code.invalidDetails, message: message.tryCatch, data: e })
    }
  })
}

module.exports = {
  registration,
  login,
  verifyEmail,
  changePassword,
  forgetPassword,
  resetPassword,
  updateProfile,
  userInformation
}
