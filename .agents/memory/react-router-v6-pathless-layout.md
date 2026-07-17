---
name: React Router v6 pathless layout route
description: Why path="/*" outranks path="/" and the correct pattern for protected layouts
---

## Rule
Never use `path="/*"` as a sibling to `path="/"` in a flat `<Routes>`. In React Router v6, `path="/*"` scores higher than `path="/"`, so it wins for the exact URL `/`, causing the wrong component to render (protected layout fires before the login page).

**Why:** React Router v6 ranking gives wildcards a higher cumulative score than a bare `/` segment when both are top-level siblings.

**How to apply:** Use a *pathless* layout route (no `path` attribute) to wrap protected children:

```jsx
<Routes>
  <Route path="/" element={<Login />} />           {/* public */}
  <Route element={<ProtectedLayout />}>             {/* pathless — passes through */}
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="guards"    element={<Guards />} />
    ...
  </Route>
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

The pathless route doesn't compete with `path="/"` for scoring; its children define their own full paths.
