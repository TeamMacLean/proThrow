const { parseString } = require("xml2js");
const axios = require("axios");
const config = require("../config.json");

const api_key = config.NCBIAPIKey;

const Tax = {
  search: function (search) {
    let url =
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?retmode=json&db=taxonomy&term=" +
      encodeURIComponent(search);
    if (api_key) {
      url += "&api_key=" + api_key;
    }

    const axiosConfig = {
      timeout: 5000,
    };

    // Only use proxy in production (when on NBI network)
    if (!config.devMode) {
      axiosConfig.proxy = {
        host: "swproxy.nbi.ac.uk",
        port: 8080,
      };
    }

    return axios.get(url, axiosConfig).then(function (response) {
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

    const axiosConfig = {
      timeout: 5000,
    };

    // Only use proxy in production (when on NBI network)
    if (!config.devMode) {
      axiosConfig.proxy = {
        host: "swproxy.nbi.ac.uk",
        port: 8080,
      };
    }

    return axios.get(url, axiosConfig).then(function (response) {
      return new Promise((resolve, reject) => {
        parseString(response.data, function (err, result) {
          if (err) {
            return reject(err);
          } else {
            return resolve(result.eSpellResult.CorrectedQuery);
          }
        });
      });
    });
  },
};

module.exports = Tax;
