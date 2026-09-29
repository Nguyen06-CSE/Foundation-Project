```
src/
└── components/
    └── shared/
        └── DocumentCard/
            ├── index.ts                 # Export chính (Entry point)
            ├── DocumentCard.tsx         # Component điều hướng (Router component)
            ├── FileDocumentCard.tsx     # Sub-component cho file lẻ
            ├── BundleDocumentCard.tsx   # Sub-component cho bundle
            ├── DocumentCard.types.ts    # Gom toàn bộ TypeScript Types / Interfaces
            └── fileCard.utils.ts        # (Tùy chọn) Chứa helper mimeMap, theme colors
```