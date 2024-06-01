const parseString = require("xml2js").parseString;
const axios = require("axios");
const config = require("../config");

const api_key = config.NCBIAPIKey;

Tax = {
  search: function (search) {
    let url =
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?retmode=json&db=taxonomy&term=" +
      encodeURIComponent(search);
    if (api_key) {
      url += "&api_key=" + api_key;
    }

    return axios
      .get(url, {
        proxy: {
          host: "swproxy.nbi.ac.uk",
          port: 8080,
        },
        timeout: 5000,
      })
      .then(function (response) {
        // console.log(response.data);
        return response.data.esearchresult.idlist;
      });
  },
  spell: function (search) {
    let url =
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/espell.fcgi?term=" +
      encodeURIComponent(search);

    if (api_key) {
      url += "&api_key=" + api_key;
    }

    return axios
      .get(url, {
        proxy: {
          host: "swproxy.nbi.ac.uk",
          port: 8080,
        },
        timeout: 5000,
      })
      .then(function (response) {
        // console.log(response.data);
        return response.data.esearchresult.idlist;
      });
      .then(function (response) {
      return new Promise((good, bad) => {
        parseString(response.data, function (err, result) {
          if (err) {
            return bad(err);
          } else {
            return good(result.eSpellResult.CorrectedQuery);
          }
        });
      });
    });
  },
};

module.exports = Tax;
