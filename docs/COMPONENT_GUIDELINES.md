# Shared Component Architecture & Guidelines
**Atomic Design and Custom Layout Specs**

This document specifies the exact directory guidelines, naming conventions, and props interfaces for reusable UI elements inside `shared/ui/` in the **edu-core-web** React repository.

---

## 1. Directory Structure

All generic, reusable layout and semantic blocks must be located inside the global `shared/` directory:
```text
src/shared/
└── ui/                             # Reusable Atomic Elements
    ├── Badge.jsx                   # Semantic status pills
    ├── Progress.jsx                # Hour consumption progress bars
    ├── Drawer.jsx                  # Sliding drawers container
    ├── Timeline.jsx                # Vertical progression paths
    ├── EmptyState.jsx              # Centered descriptive cards
    ├── ErrorState.jsx              # Standard fallback error displays
    └── Skeleton.jsx                # Tabular placeholders
```

---

## 2. API Properties & Reusable Schemas

### **A. Component 1: `Badge`**
*   **Props:** `{ status, label }`
*   **Visual State:** Maps `ACTIVE`, `LOCKED`, `CANCELLED`, `PENDING` states automatically to colors and icons:
    ```javascript
    export const Badge = ({ status, label }) => {
      // Configures semantic background color classes, icons, and text
    };
    ```

### **B. Component 2: `Progress`**
*   **Props:** `{ value, max, warningThreshold }`
*   **Visual State:** Renders a horizontal progressive track. Automatically changes colors if value is close to max or threshold.

### **C. Component 3: `Drawer`**
*   **Props:** `{ open, onClose, children, title }`
*   **Visual State:** Slides out from the left (respecting RTL layout rules) and dims out the page background.

### **D. Component 4: `Timeline`**
*   **Props:** `{ events }` (Array of objects: `{ label, date, status, notes }`)
*   **Visual State:** Renders a clean chronological trace.

---

## 3. Empty, Loading, and Error States

To provide polished user ergonomics, all listings, dashboards, and profile views must implement standard placeholders:
*   **EmptyState:** Replaces tables and charts when data is missing:
    -   *Layout:* Centers a Lucide icon, displaying a localized title and description with an action button.
*   **Skeleton:** Skeletons must match the table row structure exactly instead of using full-screen loaders.
*   **ErrorState:** Automatically consumes the backend standard error catalog, parses error responses, and displays a clean message with a `Retry` action.
