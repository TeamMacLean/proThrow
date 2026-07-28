const { parseString } = require("xml2js");
const axios = require("axios");
const config = require("../config.json");

const api_key = config.NCBIAPIKey;

/**
 * Build the axios config shared by every eutils call.
 *
 * The NBI proxy is only reachable from the institute network, so it is applied
 * in production only. This has to happen server-side: axios' `proxy` option is
 * a Node-only feature and is silently ignored in the browser.
 *
 * @returns {object}
 */
function eutilsAxiosConfig() {
  const axiosConfig = { timeout: 5000 };
  if (!config.devMode) {
    axiosConfig.proxy = { host: "swproxy.nbi.ac.uk", port: 8080 };
  }
  return axiosConfig;
}

/**
 * Append the API key when one is configured.
 *
 * Without a key NCBI caps callers at 3 requests/second, which the type-ahead
 * exceeds easily; the key must never be sent to the browser bundle.
 *
 * @param {string} url
 * @returns {string}
 */
function withApiKey(url) {
  return api_key ? `${url}&api_key=${encodeURIComponent(api_key)}` : url;
}

const Tax = {
  search: function (search) {
    const url = withApiKey(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?retmode=json&db=taxonomy&term=" +
        encodeURIComponent(search)
    );

    return axios.get(url, eutilsAxiosConfig()).then(function (response) {
      return response.data.esearchresult.idlist;
    });
  },

  spell: function (search) {
    const url = withApiKey(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/espell.fcgi?term=" +
        encodeURIComponent(search)
    );

    return axios.get(url, eutilsAxiosConfig()).then(function (response) {
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

  /**
   * Resolve a search term to canonical NCBI taxonomy entries.
   *
   * esearch only returns numeric taxonomy IDs, so a second esummary call is
   * needed to get the official scientific name. Previously the browser called
   * esearch directly and then stored whatever the user had typed, which meant a
   * misspelling that happened to match something was saved verbatim.
   *
   * @param {string} term
   * @param {number} [limit] - maximum options to return
   * @returns {Promise<Array<{label: string, value: string, taxId: string}>>}
   */
  lookup: async function (term, limit = 10) {
    const trimmed = (term || "").trim();
    if (!trimmed) return [];

    const searchUrl = withApiKey(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi" +
        `?retmode=json&db=taxonomy&retmax=${limit}&term=${encodeURIComponent(trimmed)}`
    );

    const searchResponse = await axios.get(searchUrl, eutilsAxiosConfig());
    const idList = searchResponse?.data?.esearchresult?.idlist || [];
    if (!idList.length) return [];

    const summaryUrl = withApiKey(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi" +
        `?retmode=json&db=taxonomy&id=${idList.join(",")}`
    );

    const summaryResponse = await axios.get(summaryUrl, eutilsAxiosConfig());
    const result = summaryResponse?.data?.result || {};

    return idList
      .map((id) => {
        const entry = result[id];
        const name = entry && (entry.scientificname || entry.ScientificName);
        if (!name) return null;
        return { label: name, value: name, taxId: String(id) };
      })
      .filter(Boolean);
  },
};

module.exports = Tax;
