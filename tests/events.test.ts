import { test } from "node:test";
import assert from "node:assert/strict";
import { isMapVisible } from "../src/lib/eventValidation";
import type { LocalEvent } from "../src/lib/event";
const event:LocalEvent={title:"Synthetic test only",description:"Never displayed or seeded",startAt:"2030-01-01T00:00:00.000Z",timezone:"UTC",latitude:0,longitude:0,categories:[],tags:[],priceType:"unknown",sourceType:"manual",status:"approved",verified:false};
test("approved future events with valid coordinates are visible",()=>assert.equal(isMapVisible(event,0),true));
test("pending and rejected events stay hidden",()=>{for(const status of ["pending","rejected"] as const) assert.equal(isMapVisible({...event,status},0),false);});
test("invalid and missing coordinates stay hidden",()=>{for(const latitude of [null,undefined,NaN,91]) assert.equal(isMapVisible({...event,latitude},0),false);assert.equal(isMapVisible({...event,longitude:181},0),false);});
test("ended and malformed dates stay hidden",()=>{assert.equal(isMapVisible({...event,endAt:"2030-01-01T03:00:00.000Z"},Date.parse("2030-01-01T03:00:00.000Z")),false);assert.equal(isMapVisible({...event,startAt:"unknown"},0),false);});
