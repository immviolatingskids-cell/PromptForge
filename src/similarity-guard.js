export function distinctByCluster(entries, desiredCount) {
  const chosen = [];
  const clusters = new Set();
  for (const entry of entries) {
    const cluster = entry.metadata?.cluster || entry.metadata?.family || entry.id;
    if (!clusters.has(cluster)) { chosen.push(entry); clusters.add(cluster); }
    if (chosen.length === desiredCount) break;
  }
  return chosen;
}

export function selectDistinctRanked(entries, desiredCount, choose) {
  const remaining = [...entries]; const chosen = []; const clusters = new Set();
  while (remaining.length && chosen.length < desiredCount) {
    const eligible = remaining.filter((entry) => !clusters.has(entry.metadata?.cluster || entry.metadata?.family || entry.id));
    if (!eligible.length) break;
    const selected = choose(eligible); chosen.push(selected);
    clusters.add(selected.metadata?.cluster || selected.metadata?.family || selected.id);
    remaining.splice(remaining.findIndex((entry) => entry.id === selected.id), 1);
  }
  return chosen;
}
