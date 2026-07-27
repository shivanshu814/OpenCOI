import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { GET as addressGet } from "@/app/api/geo/address/route";
import { GET as zipsGet } from "@/app/api/geo/zips/route";

afterEach(() => {
  mock.restoreAll();
});

describe("geo helper routes", () => {
  it("returns sorted unique ZIP suggestions for a city", async () => {
    mock.method(globalThis, "fetch", async () => {
      return new Response(
        JSON.stringify({
          places: [
            { "post code": "19107" },
            { "post code": "19103" },
            { "post code": "19107" },
          ],
        }),
        { status: 200 },
      );
    });

    const res = await zipsGet(
      new Request("https://certshield.test/api/geo/zips?state=PA&city=Philadelphia"),
    );
    const json = (await res.json()) as { state: string; zips: string[] };

    assert.equal(json.state, "PA");
    assert.deepEqual(json.zips, ["19103", "19107"]);
  });

  it("maps Census address matches into form-ready suggestions", async () => {
    mock.method(globalThis, "fetch", async () => {
      return new Response(
        JSON.stringify({
          result: {
            addressMatches: [
              {
                matchedAddress: "1200 MARKET ST, PHILADELPHIA, PA, 19107",
                addressComponents: {
                  zip: "19107",
                  city: "PHILADELPHIA",
                  state: "PA",
                  fromAddress: "1200",
                  streetName: "MARKET",
                  suffixType: "ST",
                },
              },
            ],
          },
        }),
        { status: 200 },
      );
    });

    const res = await addressGet(
      new Request(
        "https://certshield.test/api/geo/address?q=1200%20Market&state=PA&city=Philadelphia",
      ),
    );
    const json = (await res.json()) as {
      suggestions: Array<{
        label: string;
        address_line: string;
        city: string;
        state: string;
        postal_code: string;
      }>;
    };

    assert.deepEqual(json.suggestions, [
      {
        label: "1200 Market St, Philadelphia, PA 19107",
        address_line: "1200 Market St",
        city: "Philadelphia",
        state: "PA",
        postal_code: "19107",
      },
    ]);
  });
});
