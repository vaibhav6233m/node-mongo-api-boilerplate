const util = require('util');
const validator = require('validator');
const fs = require('fs');
const functions = require('../common/functions');
const config = require('../../config');
const code = require('../common/code');
const message = require('../common/message');

const User = require('../database/schema/user');

class UserService {
  /**
   * API for user registration
   * @param {*} req (user detials)
   * @param {*} res (json with success/failure)
   */
  async registration(info) {
    try {
      if (validator.isEmail(info.data.emailAddress)) {
        const exist = await User.findOne({ emailAddress: info.data.emailAddress });

        if (exist) {
          console.log('User exists');
          return { code: code.invalidDetails, message: message.userExists };
        }
        info.data.userPassword = functions.encryptPassword(info.data.userPassword);
        const user = new User(info.data);
        const registrationDetails = await user.save();
        console.log('TCL: UserService -> registration -> registrationDetails', registrationDetails);
        try {
          let token = await functions.tokenEncrypt(info.data.emailAddress);
          token = Buffer.from(token, 'ascii').toString('hex');
          registrationDetails.userPassword = token;

          let emailMessage = fs
            .readFileSync('./modules/emailtemplate/welcome.html', 'utf8')
            .toString();
          emailMessage = emailMessage
            .replace('$fullname', info.data.firstName)
            .replace('$link', config.emailVerifiedLink + token);
          try {
            const emailDetails = await functions.sendEmail(
              info.data.emailAddress,
              message.registrationEmailSubject,
              emailMessage
            );
            console.log('TCL: UserService -> registration -> emailDetails', token);
            return { code: code.success, message: message.registration, data: registrationDetails };
          } catch (error) {
            return { code: code.invalidDetails, message: message.invalidDetails, data: error };
          }
        } catch (error) {
          return { code: code.invalidDetails, message: message.invalidDetails, data: error };
        }
      } else {
        return { code: code.invalidDetails, message: message.invalidDetails };
      }
    } catch (e) {
      console.log('TCL: UserService -> registration -> e', e);
      return { code: code.invalidDetails, message: message.tryCatch, data: e };
    }
  }

  /**
   * API for email verification
   * @param {*} req (email)
   * @param {*} res (json with success/failure)
   */
  async verifyEmail(info) {
    if (info.data.emailAddress) {
      const token = Buffer.from(info.data.emailAddress, 'hex').toString('ascii');
      try {
        const tokenDecrypt = await functions.tokenDecrypt(token);
        console.log('TCL: UserService -> verifyEmail -> tokenDecrypt', tokenDecrypt);
        if (tokenDecrypt.message === 'jwt expired') {
          return { code: code.sessionExpire, message: message.emailLinkExpired };
        }
        try {
          const verifyEmailDetails = await User.updateOne(
            { emailAddress: tokenDecrypt.data },
            { isEmailVerified: 1 }
          );
          return {
            code: code.success,
            message: message.emailVerificationSuccess,
            data: verifyEmailDetails
          };
        } catch (error) {
          return { code: code.dbCode, message: message.dbError, data: error };
        }
      } catch (e) {
        return { code: code.invalidDetails, message: message.tryCatch, data: e };
      }
    } else {
      return { code: code.invalidDetails, message: message.invalidDetails };
    }
  }

  /**
   * API for user login
   * @param {*} req (email address & password)
   * @param {*} res (json with success/failure)
   */
  async login(info) {
    try {
      if (validator.isEmail(info.data.emailAddress)) {
        const userDetails = await User.findOne({ emailAddress: info.data.emailAddress })
          .populate('countryId')
          .exec();
        if (userDetails.emailAddress) {
          const password = functions.decryptPassword(userDetails.userPassword);
          if (password === info.data.userPassword) {
            if (userDetails.isActive === 1) {
              if (userDetails.isEmailVerified === 1) {
                userDetails.userPassword = null;
                const token = await functions.tokenEncrypt(userDetails);
                userDetails.set('token', token);
                return { code: code.success, message: message.success, data: userDetails, token };
              }
              return { code: code.invalidDetails, message: message.emailVerify };
            }
            return { code: code.invalidDetails, message: message.accountDisable };
          }
          return { code: code.invalidDetails, message: message.invalidLoginDetails };
        }
      } else {
        return { code: code.invalidDetails, message: message.invalidLoginDetails, data: [] };
      }
    } catch (error) {
      return { code: code.dbCode, message: message.dbError, data: error };
    }
  }

  /**
   * API to Change password
   * @param {*} req (old password, token, new password )
   * @param {*} res (json with success/failure)
   */
  async changePassword(userInfo, info) {
    try {
      const userDetails = await User.findOne({ _id: userInfo._id }, 'userPassword');
      if (userDetails.userPassword) {
        let password = functions.decryptPassword(userDetails.userPassword);
        if (password === info.data.oldPassword) {
          // Encrypt password for the user
          password = functions.encryptPassword(info.data.newPassword);
          userDetails.userPassword = password;
          try {
            // const updatePasswordDetails =
            await userDetails.save();
            return {
              code: code.success,
              message: message.passwordChanged
              // data: updatePasswordDetails
            };
          } catch (e) {
            return { code: code.dbCode, message: message.dbError, data: e };
          }
        } else {
          return { code: code.invalidDetails, message: message.invalidDetails, data: [] };
        }
      } else {
        return { code: code.invalidDetails, message: message.invalidDetails, data: [] };
      }
    } catch (e) {
      return { code: code.dbCode, message: message.dbError, data: e };
    }
  }

  /**
   * API for Forgot Password
   * @param {*} req (email address )
   * @param {*} res (json with success/failure)
   */
  async forgotPassword(info) {
    try {
      if (validator.isEmail(info.data.emailAddress)) {
        const userDetail = await User.findOne({ emailAddress: info.data.emailAddress }, [
          'emailAddress',
          'firstName'
        ]);
        if (userDetail.emailAddress) {
          const to = userDetail.emailAddress;
          let token = await functions.tokenEncrypt(to);
          token = Buffer.from(token, 'ascii').toString('hex');
          const subject = message.forgotPasswordSubject;
          const link = config.resetPasswordLink + token;
          let emailMessage = fs
            .readFileSync('./modules/emailtemplate/reset.html', 'utf8')
            .toString();
          emailMessage = emailMessage
            .replace('$fullname', userDetail.firstName)
            .replace('$link', link)
            .replace('$emailId', config.supportEmail);
          try {
            const emailDetails = await functions.sendEmail(to, subject, emailMessage);
            return { code: code.success, message: message.resetLink, data: emailDetails };
          } catch (error) {
            return { code: code.invalidDetails, message: message.dbError, data: error };
          }
        } else {
          return { code: code.invalidDetails, message: message.invalidEmail, data: [] };
        }
      } else {
        return { code: code.invalidDetails, message: message.invalidEmail, data: [] };
      }
    } catch (error) {
      return { code: code.dbCode, message: message.dbError, data: error };
    }
  }

  /**
   * API for Reset Password
   * @param {*} req (emailAddress )
   * @param {*} res (json with success/failure)
   */
  async resetPassword(info) {
    try {
      if (info.data.emailAddress) {
        const emailAddress = Buffer.from(info.data.emailAddress, 'hex').toString('ascii');
        const emailAddressDetails = await functions.tokenDecrypt(emailAddress);
        if (emailAddressDetails.data) {
          // Encrypt password for the user
          const password = functions.encryptPassword(info.data.newPassword);
          const passwordDetails = await User.updateOne(
            { emailAddress: emailAddressDetails.data },
            { userPassword: password }
          );
          return { code: code.success, message: message.passwordReset, data: passwordDetails };
        }
        return { code: code.invalidDetails, message: message.emailLinkExpired, data: null };
      }
      return { code: code.invalidDetails, message: message.invalidEmail };
    } catch (e) {
      return { code: code.invalidDetails, message: message.tryCatch, data: e };
    }
  }

  /**
   * API to update profile
   * @param {*} req (token, user information )
   * @param {*} res (json with success/failure)
   */
  async updateProfile(userInfo, info) {
    try {
      if (
        !validator.isEmpty(info.data.firstName) &&
        !validator.isEmpty(info.data.middleName) &&
        !validator.isEmpty(info.data.lastName) &&
        !validator.isEmpty(info.data.address)
      ) {
        const userDetail = await User.updateOne({ _id: userInfo._id }, info.data);
        return { code: code.success, message: message.profileUpdate, data: userDetail };
      }
      return { code: code.invalidDetails, message: message.allFieldReq };
    } catch (error) {
      return { code: code.dbCode, message: message.dbError, data: error };
    }
  }

  /**
   * API for user history
   * @param {*} req (userId)
   * @param {*} res (json with success/failure)
   */
  async userInformation(userInfo) {
    try {
      const userInformation = await User.findOne({ _id: userInfo._id })
        .populate('countryId')
        .exec();
      if (userInformation) {
        userInformation.userPassword = null;
        return { code: code.success, message: message.success, data: userInformation };
      }
      return { code: code.invalidDetails, message: message.noData };
    } catch (error) {
      return { code: code.dbCode, message: message.dbError, data: error };
    }
  }

  /**
   * API for uploading user profile pic
   * @param {*} req (userId, base64 data)
   * @param {*} res (json with success/failure)
   */
  async uploadProfilePicUsingBase64Data(id, info) {
    try {
      const base64Data = info.data.profilePic.replace(/^data:image\/png;base64,/, '');
      const path = `upload/profilepic/${id}-${Date.now()}.png`;
      try {
        const fs = require('fs');
        const writeFile = util.promisify(fs.writeFile).bind(fs);
        const uploadInfo = await writeFile(path, base64Data, 'base64');
        // const uploadProfilePicDetails = await query(
        //   'UPDATE user SET profileImagePath = ? WHERE id = ?',
        //   [path, id]
        // )
        // return { code: code.success, message: message.success, data: uploadProfilePicDetails }
      } catch (error) {
        return { code: code.invalidDetails, message: message.invalidDetails, data: error };
      }
    } catch (error) {
      return { code: code.dbCode, message: message.dbError, data: error };
    }
  }
}

module.exports = {
  userService() {
    return new UserService();
  }
};
