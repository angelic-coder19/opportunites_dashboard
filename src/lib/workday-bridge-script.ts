// Console script run on wd5.myworkday.com to import jobs via the dashboard bridge.

export function buildWorkdayBridgeScript(bridgeUrl: string, code: string): string {
  return `(async function uapbWorkdayBridge() {
  var BRIDGE_URL = ${JSON.stringify(bridgeUrl)};
  var CODE = ${JSON.stringify(code)};
  var BASE = "/uasys/internalapi/ccx/internalapi/talentMarketplace/v1/uasys/searchJobs";
  var LIMIT = 50;
  var captured = null;

  function headersFromInit(init) {
    if (!init || !init.headers) return null;
    var h = init.headers;
    if (typeof h.get === "function") {
      return {
        token: h.get("session-secure-token"),
        referer: h.get("referer") || document.referrer,
        client: h.get("x-workday-client"),
      };
    }
    return {
      token: h["session-secure-token"] || h["Session-Secure-Token"],
      referer: h.referer || h.Referer || document.referrer,
      client: h["x-workday-client"] || h["X-Workday-Client"],
    };
  }

  if (!window.__uapbWdHook) {
    window.__uapbWdHook = true;
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
      var url = typeof input === "string" ? input : input && input.url;
      if (url && url.indexOf("searchJobs") !== -1) {
        var hdrs = headersFromInit(init);
        if (hdrs && hdrs.token) captured = hdrs;
      }
      return origFetch.apply(this, arguments);
    };
  }

  if (!captured || !captured.token) {
    console.log("[UAPB] Scroll or change a filter on Jobs Hub, then run uapbWorkdayBridge() again.");
    return { ok: false, message: "No searchJobs request captured yet. Interact with Jobs Hub first." };
  }

  var offset = 0;
  var total = Infinity;
  var jobs = [];

  while (offset < total) {
    var res = await fetch(BASE + "?offset=" + offset + "&limit=" + LIMIT, {
      credentials: "include",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
        "session-secure-token": captured.token,
        Referer: captured.referer || location.href,
        ...(captured.client ? { "x-workday-client": captured.client } : {}),
      },
    });
    if (!res.ok) {
      return { ok: false, message: "Workday searchJobs failed with HTTP " + res.status };
    }
    var body = await res.json();
    var page = body.data || [];
    total = typeof body.total === "number" ? body.total : page.length;
    jobs = jobs.concat(page);
    offset += LIMIT;
    if (!page.length) break;
    console.log("[UAPB] Fetched " + jobs.length + " / " + total);
  }

  var importRes = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + CODE,
    },
    body: JSON.stringify({ jobs: jobs, total: total }),
  });
  var result = await importRes.json();
  console.log("[UAPB]", result);
  return result;
})();`;
}
