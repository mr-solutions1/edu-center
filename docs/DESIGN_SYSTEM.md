# Enterprise Design System Specifications
**Design Tokens, Layout Grids & Semantic System Guidelines**

This document specifies the global visual primitives, typography scales, spacing tokens, elevations, and responsive breakpoints governing the **edu-core-web** frontend client interface.

---

## 1. Global Design Tokens (System Variables)

These design tokens establish a cohesive, modern, and highly legible visual language for our educational and financial ERP:

### **A. Brand Primary & Semantic Palette**
*   **Slate Blue (Brand Trust):** `indigo-900` / `#1e3a8a` (Primary UI background, nav links, headers)
*   **Emerald (Billable / Success):** `emerald-700` / `#047857` (Accrual revenues, paid statuses)
*   **Amber (Warning / locked / outstanding):** `amber-700` / `#b45309` (Hour warnings, lock flags)
*   **Rose (Error / cancel / failed):** `rose-700` / `#be123c` (Refund actions, cancelled tags)
*   **Slate Cool (Muted / metadata):** `slate-500` / `#64748b` (Timelines, metadata, timestamps)

### **B. Typography Scale (Tajawal Standard)**
*   **Geometric Arabic Readability:** Standardized on `Cairo, Tajawal, system-ui, sans-serif` font families.
*   **Vertical Typographic Scale:**
    -   *Title 1 (Page Title):* `text-2xl font-black tracking-tight leading-normal` (24px)
    -   *Title 2 (Section Card Headers):* `text-lg font-extrabold leading-snug` (18px)
    -   *Body Text (Table Rows, Form Inputs):* `text-sm font-medium leading-relaxed` (14px)
    -   *Captions (Time Logs, Audit Details):* `text-xs font-semibold leading-none` (12px)

---

## 2. Spacing & Responsive Grid Layouts

*   **Fluid Padding & Spacing Scale:** Standardized on 4px geometric progression: `p-2` (8px), `p-4` (16px), `p-6` (24px), `p-8` (32px).
*   **Radii scale:** `rounded-xl` (12px) for general summary cards; `rounded-md` (6px) for table headers, checkboxes, and buttons.
*   **Layout Responsive Breakpoints:**
    -   *Mobile (< 640px):* Full-screen side drawers, collapsing tables into card-stacks.
    -   *Tablet (< 1024px):* Collapsed sidebar icons bar, floating action buttons.
    -   *Desktop (>= 1024px):* Persistent RTL side bar layout on the right.
*   **Elevation Shadows:** `shadow-sm` for list items; `shadow-md` (blur 12, opacity 0.05) for hover states and modal overlays.
