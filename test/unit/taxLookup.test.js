/**
 * Unit coverage for the NCBI taxonomy adapter.
 *
 * The browser and route tests mock this boundary; these tests exercise the two
 * real eutils calls and the production-only proxy configuration without making
 * the test suite depend on NCBI or institute DNS.
 */

function loadTaxLookup(overrides = {}) {
  jest.resetModules();

  const get = jest.fn();
  jest.doMock("axios", () => ({ get }));
  jest.doMock("../../config.json", () => ({
    devMode: true,
    NCBIAPIKey: "",
    ...overrides,
  }));

  return { Tax: require("../../lib/taxLookup"), get };
}

afterEach(() => {
  jest.useRealTimers();
  jest.resetModules();
  jest.dontMock("axios");
  jest.dontMock("../../config.json");
});

it("maps taxonomy search IDs to canonical scientific-name options", async () => {
  const { Tax, get } = loadTaxLookup();
  get
    .mockResolvedValueOnce({
      data: { esearchresult: { idlist: ["9606", "10090"] } },
    })
    .mockResolvedValueOnce({
      data: {
        result: {
          9606: { scientificname: "Homo sapiens" },
          10090: { scientificname: "Mus musculus" },
        },
      },
    });

  await expect(Tax.lookup("  homo sapiens  ")).resolves.toEqual([
    { label: "Homo sapiens", value: "Homo sapiens", taxId: "9606" },
    { label: "Mus musculus", value: "Mus musculus", taxId: "10090" },
  ]);

  expect(get).toHaveBeenCalledTimes(2);
  expect(get.mock.calls[0][0]).toContain("term=homo%20sapiens");
  expect(get.mock.calls[0][1]).toMatchObject({ timeout: 2000 });
  expect(get.mock.calls[1][0]).toContain("id=9606,10090");
});

it("appends the API key and tunnels through the institute proxy in production", async () => {
  const { Tax, get } = loadTaxLookup({
    devMode: false,
    NCBIAPIKey: "key with/slash",
  });
  get.mockResolvedValueOnce({ data: { esearchresult: { idlist: ["9606"] } } });

  await expect(Tax.search("human")).resolves.toEqual(["9606"]);

  expect(get.mock.calls[0][0]).toContain("api_key=key%20with%2Fslash");

  // A plain `proxy` option can't tunnel HTTPS (see taxLookup.js), so
  // production must go through an HttpsProxyAgent instead, with axios'
  // own proxy handling disabled so it doesn't re-apply *_proxy env vars.
  //
  // Not `toBeInstanceOf(HttpsProxyAgent)`: jest.resetModules() means
  // taxLookup.js loaded its own copy of the https-proxy-agent module, so its
  // agent fails an instanceof check against the class required up top here.
  const axiosConfig = get.mock.calls[0][1];
  expect(axiosConfig.timeout).toBe(2000);
  expect(axiosConfig.proxy).toBe(false);
  expect(axiosConfig.httpsAgent.constructor.name).toBe("HttpsProxyAgent");
  expect(axiosConfig.httpsAgent.proxy.href).toBe("http://swproxy.nbi.ac.uk:8080/");
});

it("honours Retry-After once when NCBI rate-limits a lookup", async () => {
  jest.useFakeTimers();
  const { Tax, get } = loadTaxLookup();
  get
    .mockResolvedValueOnce({
      data: { esearchresult: { idlist: ["9606"] } },
    })
    .mockRejectedValueOnce({
      response: { status: 429, headers: { "retry-after": "2" } },
    })
    .mockResolvedValueOnce({
      data: { result: { 9606: { scientificname: "Homo sapiens" } } },
    });

  const result = Tax.lookup("human");
  await jest.advanceTimersByTimeAsync(1999);
  expect(get).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(1);

  await expect(result).resolves.toEqual([
    { label: "Homo sapiens", value: "Homo sapiens", taxId: "9606" },
  ]);
  expect(get).toHaveBeenCalledTimes(3);
});

it("stops after one rate-limit retry", async () => {
  jest.useFakeTimers();
  const { Tax, get } = loadTaxLookup();
  const rateLimitError = {
    response: { status: 429, headers: { "retry-after": "1" } },
  };
  get
    .mockResolvedValueOnce({
      data: { esearchresult: { idlist: ["9606"] } },
    })
    .mockRejectedValueOnce(rateLimitError)
    .mockRejectedValueOnce(rateLimitError);

  const result = Tax.lookup("human");
  const rejection = expect(result).rejects.toBe(rateLimitError);
  await jest.runAllTimersAsync();

  await rejection;
  expect(get).toHaveBeenCalledTimes(3);
});

it("does not retry beyond the browser taxonomy request budget", async () => {
  const { Tax, get } = loadTaxLookup();
  const rateLimitError = {
    response: { status: 429, headers: { "retry-after": "10" } },
  };
  get
    .mockResolvedValueOnce({
      data: { esearchresult: { idlist: ["9606"] } },
    })
    .mockRejectedValueOnce(rateLimitError);

  await expect(Tax.lookup("human")).rejects.toBe(rateLimitError);
  expect(get).toHaveBeenCalledTimes(2);
});
