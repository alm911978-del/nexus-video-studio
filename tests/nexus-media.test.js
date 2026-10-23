import test from "node:test";
import assert from "node:assert/strict";
import { createCharacterLock, buildCharacterContinuityPrompt } from "../src/nexus/character-lock.js";
import { selectMediaProvider, validateMediaProvider } from "../src/nexus/media-provider-contract.js";
import { runMediaJob } from "../src/nexus/media-pipeline.js";
import { runLipSyncJob } from "../src/nexus/lipsync.js";

test("character lock reports missing identity anchors", () => {
  const lock = createCharacterLock({ name: "Kael" });
  assert.deepEqual(lock.missingRequiredFields, ["face", "hair", "wardrobe"]);
});

test("character continuity prompt includes stable traits and scene", () => {
  const lock = createCharacterLock({name:"Kael", face:"small scar above left eyebrow", hair:"short messy black", wardrobe:"olive jacket"});
  const prompt = buildCharacterContinuityPrompt(lock, "At the desert crater");
  assert.match(prompt, /small scar above left eyebrow/);
  assert.match(prompt, /Do not redesign the face/);
  assert.match(prompt, /At the desert crater/);
});

test("provider selection never assumes an unconfigured provider", () => {
  assert.equal(selectMediaProvider([], "image-to-video").status, "no-configured-provider");
  assert.equal(selectMediaProvider([{id:"off", enabled:false, capabilities:["image-to-video"], adapter:async()=>({})}], "image-to-video").ok, false);
});

test("provider contract requires explicit enablement and adapter", () => {
  assert.equal(validateMediaProvider({id:"p", enabled:true, capabilities:["image-to-video"], adapter:async()=>({})}).valid, true);
  assert.equal(validateMediaProvider({id:"p", capabilities:["image-to-video"]}).valid, false);
});

test("media pipeline rejects missing prompt and unsupported ratio", async () => {
  const providers = [{id:"mock", enabled:true, capabilities:["image-to-video"], adapter:async()=>({status:"completed",assetUrl:"https://example.test/video.mp4"})}];
  assert.equal((await runMediaJob({mode:"image-to-video", providers, input:{}})).status, "invalid-input");
  assert.equal((await runMediaJob({mode:"image-to-video", providers, input:{prompt:"scene",aspectRatio:"2:1"}})).status, "invalid-input");
});

test("media pipeline only reports completed after adapter returns an asset", async () => {
  const providers = [{id:"mock", enabled:true, capabilities:["image-to-video"], adapter:async()=>({status:"completed",assetUrl:"https://example.test/video.mp4",mediaType:"video/mp4"})}];
  const result = await runMediaJob({mode:"image-to-video", providers, input:{prompt:"cinematic scene",quality:"high"}});
  assert.equal(result.ok, true);
  assert.equal(result.providerId, "mock");
  const badProviders = [{id:"mock-bad", enabled:true, capabilities:["image-to-video"], adapter:async()=>({status:"completed"})}];
  assert.equal((await runMediaJob({mode:"image-to-video", providers:badProviders, input:{prompt:"scene"}})).status, "provider-did-not-return-verified-asset");
});

test("media pipeline rejects insecure, malformed and credential-bearing asset URLs", async () => {
  const unsafeUrls = [
    "javascript:alert(1)",
    "data:video/mp4;base64,AAAA",
    "http://example.test/video.mp4",
    "/relative/video.mp4",
    "https://user:secret@example.test/video.mp4",
    "https://example.test/video.mp4\\nforged-header: value"
  ];
  for (const assetUrl of unsafeUrls) {
    const providers = [{
      id: "untrusted-url-provider",
      enabled: true,
      capabilities: ["image-to-video"],
      adapter: async () => ({ status: "completed", assetUrl, mediaType: "video/mp4" })
    }];
    const result = await runMediaJob({
      mode: "image-to-video",
      providers,
      input: { prompt: "cinematic scene" }
    });
    assert.equal(result.ok, false, "Should reject asset URL: " + assetUrl);
    assert.equal(result.status, "provider-did-not-return-verified-asset");
  }
});

test("lip-sync requires dialogue or audio and uses only configured capability", async () => {
  assert.equal((await runLipSyncJob({providers:[], input:{}})).status, "invalid-input");
  const providers = [{id:"mock-lipsync", enabled:true, capabilities:["audio-lip-sync"], adapter:async({input})=>({status:"completed",assetUrl:"https://example.test/lipsync.mp4",mediaType:"video/mp4",receivedPrompt:input.prompt})}];
  const result = await runLipSyncJob({providers, input:{text:"مرحبا بالعالم",language:"Arabic"}});
  assert.equal(result.ok, true);
  assert.match(result.assetUrl, /lipsync\.mp4/);
});
