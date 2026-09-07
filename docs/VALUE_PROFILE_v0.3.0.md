# Value Profile v0.3.0

## Data model

Personas store named value roles at `personality.values`:

```json
{
  "primary": { "id": "independence" },
  "secondary": { "id": "family_loyalty" },
  "tension": { "id": "stability" }
}
```

Secondary and tension may be `null`. Legacy single objects and arrays normalize to primary-only profiles when opened; no additional values are generated during migration.

## Cluster audit

The v0.2.9-style catalogue contained 96 values, 18 families, and 96 clusters, so clusters were effectively labels rather than reusable semantic neighbourhoods. The audit preserved distinct related concepts and consolidated only two clear synonym neighbourhoods:

- `freedom` and `personal_freedom` share `liberty`.
- `truth` and `honesty` share `truthfulness`.

The result is 94 clusters. No entries were removed and no broad population pass was performed.

## Tension model

Sparse `metadata.tension_with` arrays use canonical value IDs. Relationships are symmetric, validated for existence, shape, self-reference, and symmetry, and represent competing priorities rather than moral opposites. The catalogue contains 16 curated undirected relationships across 23 values.

Selection uses contextual compatibility, distinct clusters, a soft family-diversity preference, and a strong curated-relationship signal. Internal explanations record contextual selection, semantic distinction, competing-priority status, and a PromptForge-relative `moderate` or `strong` strength.

## Profile depth and diagnostics

Centralized probabilities are Grounded 82% secondary / 15% tension, Varied 95% / 45%, and Chaotic 90% / 65%. Tension remains relationship-constrained in every mode.

A deterministic 500-profile sample per mode produced:

| Mode | Secondary | Tension | Top primary share | Top pair share | Top triple share |
|---|---:|---:|---:|---:|---:|
| Grounded | 80.6% | 9.8% | 2.2% | 0.5% | 4.1% |
| Varied | 94.6% | 43.0% | 2.6% | 0.6% | 0.9% |
| Chaotic | 89.4% | 57.6% | 2.0% | 0.7% | 0.7% |

All 96 values appeared as primaries. Pair and triple results show no pathological repeated-profile dominance. Grounded's realized tension rate is lower than its configured conditional probability because it also generates fewer secondary values.
