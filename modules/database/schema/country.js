const mongoose = require('mongoose')

const countrySchema = mongoose.Schema(
  {
    country_code: {
      type: String,
      maxLength: 2,
      require: true
    },

    country_name: {
      type: String,
      require: true
    }
  },
  { timestamps: true, collection: 'countries' }
)

const Country = mongoose.model('Country', countrySchema)

module.exports = Country
