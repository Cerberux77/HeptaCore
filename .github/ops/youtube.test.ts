import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeYouTubeFormat, withShortsMarker, youtubePublisher } from "../youtube.js";
import { ProviderError } from "../types.js";
import { buildPub06DryRun, normalizePub06PublishingFormat } from "../../../app/api/publishing/pub06-formats.js";

const originalFetch = globalThis.fetch;
const MEDIA_URL = "https://cdn.example.com/video.mp4";
const UPLOAD_URL = "https://upload.googleapis.com/session/pub07";
afterEach(() => { globalThis.fetch = originalFetch; });

const video = { id:"video", url:MEDIA_URL, filename:"video.mp4", mimeType:"video/mp4", width:1920, height:1080, sizeBytes:10_000_000, durationSeconds:300, order:1, role:"primary" };
const short = { ...video, id:"short", width:1080, height:1920, durationSeconds:45 };
const thumb = { id:"thumb", url:"https://cdn.example.com/thumb.jpg", filename:"thumb.jpg", mimeType:"image/jpeg", width:1280, height:720, sizeBytes:200_000, durationSeconds:null, order:2, role:"thumbnail" };

describe("PUB-07 YouTube format contract", () => {
  it("normalizes video and shorts", () => {
    assert.equal(normalizePub06PublishingFormat("YOUTUBE", "VIDEO"), "YOUTUBE_VIDEO");
    assert.equal(normalizePub06PublishingFormat("YOUTUBE", "Shorts"), "YOUTUBE_SHORT");
    assert.equal(normalizeYouTubeFormat("shorts"), "YOUTUBE_SHORT");
  });
  it("builds valid provider-specific dry-runs for 16:9 video and 9:16 Shorts", () => {
    const long=buildPub06DryRun("YOUTUBE_VIDEO", [video as any, thumb as any]);
    assert.equal(long.valid,true);
    assert.equal(long.previewData.platform,"YOUTUBE");
    const vertical=buildPub06DryRun("YOUTUBE_SHORT", [short as any]);
    assert.equal(vertical.valid,true);
    assert.equal(vertical.previewData.aspectRatio,"9 / 16");
  });
  it("fails closed for invalid Shorts and missing Video thumbnail", () => {
    const bad=buildPub06DryRun("YOUTUBE_SHORT", [{...video,durationSeconds:200} as any]);
    assert.equal(bad.valid,false);
    assert.ok(bad.errors.some((e)=>e.code==="ASSET_ASPECT_RATIO"));
    assert.ok(bad.errors.some((e)=>e.code==="ASSET_DURATION"));
    const missing=buildPub06DryRun("YOUTUBE_VIDEO", [video as any]);
    assert.equal(missing.valid,false);
    assert.ok(missing.errors.some((e)=>e.code==="THUMBNAIL_REQUIRED"));
  });
  it("declares only validated live formats and OAuth upload scope", () => {
    assert.deepEqual(youtubePublisher.supportedFormats,["YOUTUBE_VIDEO","YOUTUBE_SHORT"]);
    assert.equal(youtubePublisher.credentialLabel,"youtube_oauth");
    assert.ok(youtubePublisher.requiredScopes.includes("https://www.googleapis.com/auth/youtube.upload"));
  });
});

describe("PUB-07 YouTube resumable provider", () => {
  it("returns only the provider video id and tags Shorts idempotently", async () => {
    let body:any=null;
    globalThis.fetch=(async (input:any, init?:any) => {
      const url=String(input); const method=(init?.method??"GET").toUpperCase();
      if(url===MEDIA_URL&&method==="GET") return new Response(new Uint8Array([1,2,3]),{status:200,headers:{"content-type":"video/mp4"}});
      if(url.includes("uploadType=resumable")&&method==="POST") { body=JSON.parse(init.body); return new Response(null,{status:200,headers:{location:UPLOAD_URL}}); }
      if(url===UPLOAD_URL&&method==="PUT") return new Response(JSON.stringify({id:"yt_real_123",status:{privacyStatus:"private"}}),{status:200,headers:{"content-type":"application/json"}});
      return new Response("not found",{status:404});
    }) as typeof fetch;
    const result=await youtubePublisher.publish({targetId:"channel",accessToken:"token",mediaUrl:MEDIA_URL,caption:"caption",title:"Title",description:"Desc",format:"YOUTUBE_SHORT",mediaType:"VIDEO"});
    assert.equal(result.externalPostId,"yt_real_123");
    assert.match(body.snippet.description,/#Shorts/);
    assert.equal(withShortsMarker("YOUTUBE_SHORT","T","#Shorts already").description,"#Shorts already");
  });
  it("marks provider success without a video id as ambiguous instead of fabricating success", async () => {
    globalThis.fetch=(async (input:any, init?:any) => {
      const url=String(input); const method=(init?.method??"GET").toUpperCase();
      if(url===MEDIA_URL) return new Response(new Uint8Array([1]),{status:200,headers:{"content-type":"video/mp4"}});
      if(url.includes("uploadType=resumable")) return new Response(null,{status:200,headers:{location:UPLOAD_URL}});
      if(url===UPLOAD_URL&&method==="PUT") return new Response(JSON.stringify({}),{status:200,headers:{"content-type":"application/json"}});
      return new Response("not found",{status:404});
    }) as typeof fetch;
    await assert.rejects(() => youtubePublisher.publish({targetId:"channel",accessToken:"token",mediaUrl:MEDIA_URL,caption:"x",title:"x",format:"YOUTUBE_VIDEO",mediaType:"VIDEO"}), (e:any) => e instanceof ProviderError && e.isAmbiguous===true);
  });
});

describe("PUB-07 route integration contract", () => {
  const source=readFileSync(new URL("../../../app/api/publishing/publish/route.ts",import.meta.url),"utf8");
  it("passes title/description/thumbnail and excludes thumbnail from video upload", () => {
    assert.match(source,/publishInput\.title = draft\.title/);
    assert.match(source,/publishInput\.thumbnailUrl = youtubeThumbnail\?\.url/);
    assert.match(source,/a\.role !== "thumbnail"/);
  });
  it("keeps ambiguous provider outcomes network-generic and IN_REVIEW", () => {
    const idx=source.indexOf("LIVE_RECONCILIATION_REQUIRED");
    const section=source.slice(idx,idx+700);
    assert.match(section,/\$\{network\} devolvio un resultado ambiguo/);
    assert.doesNotMatch(section,/Meta devolvio/);
    assert.match(section,/IN_REVIEW/);
  });
});
