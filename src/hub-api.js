export async function hubRequest(action) {
  const response = await fetch(action ? `/api/hub/${action}` : "/api/hub", action ? {method:"POST", headers:{"X-Forge-Action":"1"}} : {cache:"no-store"});
  if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error("Start the studio with python start.py to connect live Forge data.");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The Forge could not complete this action.");
  return data;
}
export async function hubPost(path, payload) {
  const response = await fetch(path, {method:"POST", headers:{"Content-Type":"application/json","X-Forge-Action":"1"}, body:JSON.stringify(payload)});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The Forge could not complete this action.");
  return data;
}
