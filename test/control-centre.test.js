import test from 'node:test';
import assert from 'node:assert/strict';
import { HubStore, defaults, greeting, coverageLabel, applyAppearance } from '../src/hub-store.js';
import { pages, renderPage, poolCard, healthSummary, timeline } from '../src/hub-views.js';
const memory = () => { const values = new Map(); return {getItem:key => values.get(key),setItem:(key,value) => values.set(key,value)}; };
const context = data => ({model:structuredClone(defaults), data, activity:[], query:'',filter:'all',selected:'',settings:[],session:[]});
test('every Control Centre page handles empty state and missing profile', () => {
  for (const page of Object.keys(pages)) assert.ok(renderPage(page,context(null)).length > 20);
  assert.equal(greeting('',20),'Good evening');
  assert.match(timeline([]),/No activity yet/);
  assert.match(healthSummary(null),/Not audited/);
});
test('preferences, appearance, presets and meaningful activity persist in one store', () => {
  const storage=memory(),store=new HubStore(storage);
  store.update('preferences',{mode:'grounded',autoCopy:true});
  store.update('appearance',{theme:'light',reducedMotion:true});
  store.savePreset({id:'a',name:'Test',mode:'varied',anchors:{}});
  store.record('presets','Saved Test');
  const reopened=new HubStore(storage);
  assert.equal(reopened.data.preferences.mode,'grounded');
  assert.equal(reopened.data.appearance.reducedMotion,true);
  assert.equal(reopened.data.presets.length,1);
  assert.equal(reopened.data.activity[0].title,'Saved Test');
  assert.equal(reopened.session.length,0);
  reopened.deletePreset('a'); assert.equal(new HubStore(storage).data.presets.length,0);
});
test('malformed and inaccessible storage degrade safely; failed writes do not update state', () => {
  assert.equal(new HubStore({getItem:()=>'{broken'}).data.profile.name,'');
  const store=new HubStore({getItem:()=>null,setItem:()=>{throw new Error('quota');}});
  assert.throws(()=>store.update('profile',{name:'Lost'}),/quota/);
  assert.equal(store.data.profile.name,'');
});
test('appearance resolves system mode and reduced-motion preference', () => {
  const root={dataset:{}};
  applyAppearance({...defaults.appearance,theme:'system',reducedMotion:true},root,true);
  assert.equal(root.dataset.theme,'light');assert.equal(root.dataset.motion,'reduced');
});
test('all coverage statuses retain thresholds, gaps, and encoded navigation', () => {
  for (const status of ['deficient','minimum','healthy','target_met','saturated','Complete']) {
    const html=poolCard({kind:'deep',branch:'appearance/hair',current:12,target:40,minimum:10,healthy:20,needed_to_minimum:0,needed_to_healthy:8,needed_to_target:28,status});
    assert.ok(html.includes(coverageLabel(status)));assert.match(html,/Gap 28/);assert.match(html,/#hub\/forge\/deep%3Aappearance%2Fhair/);
  }
});
test('populated overview and diagnostics use actual values and escape user content', () => {
  const audit={at:'2026-09-08T12:00:00Z',summary:{errors:2,warnings:3,info:4},findings:[{severity:'ERROR',code:'structural',message:'<script>',category:'core/settings'}]};
  const ctx=context({pools:[],entries:1234,catalogues:7,deep_pools:9,templates:2,versions:{application_version:'0.4.0'},audit,backups:[]});
  ctx.model.profile.name='<img onerror=x>';
  assert.match(renderPage('overview',ctx),/1,234/);
  assert.ok(!renderPage('overview',ctx).includes('<img onerror=x>'));
  assert.match(renderPage('diagnostics',ctx),/&lt;script&gt;/);
  assert.match(healthSummary(audit),/>2<\/strong>/);
});
