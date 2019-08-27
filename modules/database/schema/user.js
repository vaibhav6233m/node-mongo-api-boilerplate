const mongoose = require('mongoose');
const Country = require('../schema/country');

const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true
    },

    lastName: String,

    emailAddress: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: text => {
          if (text !== null && text.length > 0) {
            const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(text);
          }
          return false;
        },
        message: 'Invalid email address'
      }
    },

    userPassword: String,

    companyName: String,

    mobileNumber: String,

    address: String,
    country: String,
    regionCode: String,
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Country'
    },

    isEmailVerified: {
      type: Number,
      default: 0
    },

    isActive: {
      type: Number,
      default: 1
    }
  },
  { timestamps: true, collection: 'user' }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
