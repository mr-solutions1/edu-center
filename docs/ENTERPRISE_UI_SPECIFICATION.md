# Enterprise UI Specification & Component Guidelines
**High-Fidelity Visual Workflows & Interaction Ergonomics**

This specification defines the interactive elements, cards, badging, and timelines required to align the **edu-core-web** React interface with our robust accounting, lock, and signature backend capabilities.

---

## 1. Status Component Architecture

To prevent redundant, page-by-page badge implementations, we standardize a single unified **Status Component System** inside `shared/ui/Badge`:

```mermaid
graph TD
    ACTIVE[ACTIVE / نشط] ──► Emerald_Pill[Emerald Pill / CheckCircle Icon]
    COMPLETED[COMPLETED / مكتمل] ──► Blue_Pill[Blue Pill / CheckSquare Icon]
    LOCKED[LOCKED / مؤمن مغلق] ──► Amber_Badge[Amber Badge / Lock Icon]
    CANCELLED[CANCELLED / ملغي] ──► Gray_Pill[Gray Pill / Line-through / XCircle Icon]
```

---

## 2. Standardized Interactive Timelines

We introduce two distinct timeline component layouts to illustrate progression and history:

### **A. Sibling Activity Lifecycle Timeline (`shared/ui/Timeline`)**
Renders a vertical progress path showing chronological transactions:
-   **Step 1:** `تم الشراء` - *شراء باقة ساعات لمادة الرياضيات (10 ساعات)*
-   **Step 2:** `تسجيل دفعة` - *استلام دفعة مالية بقيمة 50 د.ك*
-   **Step 3:** `تخصيص FIFO` - *تخصيص 50 د.ك لباقة مادة الرياضيات*
-   **Step 4:** `استهلاك الساعات` - *حضور أول حصة (1.5 ساعة مستهلكة)*

### **B. Payroll Consecutive Signature Stepper**
Displays sequential multi-level administrative approvals:
-   `المحاسب (Accountant)`: `[تم التوقيع بنجاح 🟢]` - *أ/ محمد رضا - 2026-07-21*
-   `الإدارة (Admin)`: `[قيد الانتظار 🟡]` - *بانتظار توقيع تفويض الصرف الفوري*

---

## 3. Financial Explainability Panels

Computed totals must be visually explainable to users. We introduce specific **Explainability Panels** to decompose mathematical calculations:

### **A. Student Package Total**
```text
  ┌────────────────────────────────────────────────────────┐
  │ تفاصيل احتساب قيمة باقة الاشتراك (Explainability Panel)│
  ├────────────────────────────────────────────────────────┤
  │ [ عدد الساعات المشتراة ]   : 10 ساعات                   │
  │ [ سعر الساعة الافتراضي ]   : 12.000 د.ك                 │
  │ [ إجمالي السعر الأساسي ]  : 120.000 د.ك                │
  │ [ الخصم الأخوي المستحق ]  : 15% (الابن الثاني مسجل)     │
  │                                                        │
  │ الحسبة المعتمدة:                                       │
  │ 120.000 د.ك - (120.000 د.ك * 0.15) = 102.000 د.ك صافي   │
  └────────────────────────────────────────────────────────┘
```

### **B. Teacher Completed Lessons Earnings**
```text
  ┌────────────────────────────────────────────────────────┐
  │ تفاصيل احتساب أجر الحصة المكتملة                      │
  ├────────────────────────────────────────────────────────┤
  │ [ سعر الحصة المعتمد عهد العقد ]: 10.000 د.ك            │
  │ [ نسبة المعلم المجمدة ]: 75%                            │
  │ [ قيمة الأجر الأساسي المستحق ]: 7.500 د.ك              │
  │ [ خصم سيارة الأكاديمية ]: 0.500 د.ك (المعلم يركب الحافلة)│
  │                                                        │
  │ الحسبة المعتمدة:                                       │
  │ (10.000 د.ك * 0.75) - 0.500 د.ك = 7.000 د.ك صافي المستحق│
  └────────────────────────────────────────────────────────┘
```

---

## 4. Interaction, Focus & RTL Rules

*   **RTL Typography:** All screens use a consistent Arabic numerals formatting (`0.000` KWD precision) and Tajawal/Cairo fonts with right-to-left layout grids.
*   **Touch Targets:** Clickable icons, button menus, and dropdown options must maintain a minimum touch target area of `44x44px` on viewports `< 640px`.
*   **Focus Ring:** All clickable elements must render a visible `ring-2 ring-primary/50` on focus to ensure proper accessibility compliance.
