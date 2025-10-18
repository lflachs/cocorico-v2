# Cocorico Development Instructions

**READ THIS FIRST** - These instructions must be followed for ALL code changes.

## 🎨 Design System & Color Palette

### Brand Color Palette (Cocorico Restaurant Theme)

**ALWAYS use these brand colors** - defined in `src/app/globals.css`:

```css
--brand-red: #e63946          /* Red Pantone - Alerts, urgent states */
--brand-honeydew: #f1faee      /* Honeydew - Light backgrounds */
--brand-blue-light: #a8dadc    /* Non-Photo Blue - Soft accents */
--brand-blue-medium: #457b9d   /* Cerulean - Interactive elements */
--brand-blue-dark: #1d3557     /* Berkeley Blue - Headers, dark elements */
```

### Semantic Color Tokens

**CRITICAL**: Use semantic tokens, NOT direct brand colors in components:

```typescript
// ✅ GOOD: Use semantic tokens
className="bg-primary text-primary-foreground"
className="bg-destructive text-destructive-foreground"
className="bg-warning text-warning-foreground"
className="bg-success text-success-foreground"
className="border-border text-foreground bg-background"

// ❌ BAD: Never use arbitrary colors
className="bg-blue-500 text-white"
className="bg-red-600 text-slate-900"
className="bg-amber-500"
```

### Semantic Token Reference

| Token | Usage | Foreground | Example |
|-------|-------|------------|---------|
| `primary` | Main brand color, headers, important buttons | `primary-foreground` | Navigation, CTAs |
| `secondary` | Secondary actions, less prominent | `secondary-foreground` | Cancel buttons |
| `destructive` | Errors, critical alerts, delete actions | `destructive-foreground` | Delete, Expired items |
| `warning` | Warnings, medium urgency alerts | `warning-foreground` | Low stock, expiring soon |
| `success` | Success states, confirmations | `success-foreground` | Success messages, good stock |
| `muted` | Subtle backgrounds, disabled states | `muted-foreground` | Disabled text, hints |
| `accent` | Highlights, hover states | `accent-foreground` | Hover effects |
| `info` | Informational messages | `info-foreground` | Tips, information |
| `border` | All borders | - | Card borders, dividers |
| `background` | Page background | `foreground` | Main page bg |
| `card` | Card backgrounds | `card-foreground` | Card components |

### Gradient Usage

Use subtle gradients for premium feel:

```typescript
// ✅ GOOD: Subtle, trendy gradients
className="bg-gradient-to-br from-primary via-primary/95 to-secondary"
className="bg-gradient-to-br from-warning/90 to-warning"
className="bg-gradient-to-br from-success/5 via-transparent to-transparent"

// ❌ BAD: Harsh, arbitrary gradients
className="bg-gradient-to-r from-blue-500 to-red-500"
```

### 3D Shadow System

Use layered shadows for depth (not excessive):

```typescript
// ✅ GOOD: Subtle 3D effect
className="shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all"
className="shadow-lg hover:shadow-xl"

// ❌ BAD: Flat or excessive
className="shadow-2xl"
className="shadow-none"
```

### UI Component Design

- **Sidebar:** `bg-primary` with `sidebar-accent` active states
- **Main content:** `bg-background` (honeydew-tinted white)
- **Cards:** `bg-card` with `shadow-md`, hover effects with lift
- **Buttons:** Gradients with semantic colors + white text
- **Alerts:** Color-coded by urgency (destructive/warning/muted)
- **Mobile:** Responsive with consistent color system
- **i18n:** English/French language switcher

### When to Use Each Color

| State | Color Token | When to Use |
|-------|-------------|-------------|
| **Critical/Urgent** | `destructive` | Expired items, errors, delete |
| **Warning/Attention** | `warning` | Expiring soon, low stock, pending |
| **Success/Good** | `success` | Good stock, success messages, confirmations |
| **Info/Neutral** | `info` or `muted` | General information, hints |
| **Primary Action** | `primary` | Main CTAs, navigation, headers |
| **Secondary Action** | `secondary` | Cancel, less important actions |

### Color System Rules

1. **ALWAYS** use semantic tokens (primary, destructive, etc.)
2. **NEVER** use arbitrary Tailwind colors (blue-500, red-600, etc.)
3. **ALWAYS** pair background with correct foreground token
4. **USE** gradients sparingly for premium touch
5. **APPLY** subtle shadows for 3D effect
6. **UPDATE** these instructions when discovering new patterns worth documenting

### Cursor & Interactivity Rules

**CRITICAL**: Always add `cursor-pointer` to interactive elements:

```typescript
// ✅ GOOD: Interactive elements with cursor-pointer
<button className="cursor-pointer">Click me</button>
<Link href="/page" className="cursor-pointer">Navigate</Link>
<div onClick={handleClick} className="cursor-pointer">Clickable</div>
<TabsTrigger className="cursor-pointer">Tab</TabsTrigger>

// ❌ BAD: Missing cursor-pointer
<button>Click me</button>
<div onClick={handleClick}>Clickable</div>
```

**When to add `cursor-pointer`:**
- All `<button>` elements
- All `<Link>` components
- All elements with `onClick` handlers
- Tabs, tab triggers
- Any clickable/interactive element
- Card components that link somewhere

**Exceptions (cursor is automatic):**
- Native `<a>` tags already have pointer cursor
- Some shadcn/ui components may include it

### Page Header Pattern

**CRITICAL**: Use consistent gradient headers for main pages to maintain visual cohesion:

```typescript
// ✅ GOOD: Consistent page header with gradient
<div className="bg-gradient-to-br from-primary via-primary/95 to-secondary rounded-xl p-6 md:p-8 text-white shadow-xl">
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <h1 className="text-3xl md:text-4xl font-bold mb-2">
        {t('page.title')}
      </h1>
      <p className="text-primary-foreground/90 text-base md:text-lg max-w-3xl">
        {t('page.subtitle')}
      </p>
    </div>
    <IconComponent className="w-12 h-12 md:w-16 md:h-16 text-white/20 hidden sm:block" />
  </div>
</div>

// ❌ BAD: Inconsistent or plain header
<h1>Page Title</h1>
<div className="bg-blue-500 p-4">
  <h1>Title</h1>
</div>
```

**When to use the page header pattern:**
- Main dashboard pages (Today, Inventory, Menu, DLC, Bills, Disputes)
- Top-level section pages
- Feature overview pages

**Header Components:**
1. **Gradient background**: `bg-gradient-to-br from-primary via-primary/95 to-secondary`
2. **Padding**: `p-6 md:p-8` (responsive)
3. **Text color**: `text-white` with proper contrast
4. **Shadow**: `shadow-xl` for depth
5. **Rounded corners**: `rounded-xl`
6. **Icon**: Use relevant Lucide icon at `w-12 h-12 md:w-16 md:h-16 text-white/20 hidden sm:block`
7. **Title**: `text-3xl md:text-4xl font-bold mb-2`
8. **Subtitle**: `text-primary-foreground/90 text-base md:text-lg max-w-3xl`

### Contextual Help & Hints

**CRITICAL**: Use contextual, inline hints instead of large help sections.

**Modern UX Approach:**
1. **Empty states** - Clear messaging with CTAs when no data exists
2. **Tooltips** - Small info icons with hover/tap tooltips for specific features
3. **Placeholder text** - Descriptive placeholders in inputs
4. **Inline hints** - Small muted text below fields/sections
5. **Progressive disclosure** - Show help exactly when and where needed

```typescript
// ✅ GOOD: Empty state with clear guidance
{items.length === 0 && (
  <div className="text-center py-12">
    <ChefHat className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold mb-2">No dishes yet</h3>
    <p className="text-muted-foreground mb-4">
      Create your first dish to start building your menu
    </p>
    <Button onClick={handleCreate}>Create Dish</Button>
  </div>
)}

// ✅ GOOD: Inline hint
<div>
  <Label>Par Level</Label>
  <Input type="number" placeholder="100" />
  <p className="text-xs text-muted-foreground mt-1">
    Minimum quantity to keep in stock
  </p>
</div>

// ❌ BAD: Large help card taking up space
<Card>
  <CardContent>
    <h3>Help Guide</h3>
    <p>Long explanation...</p>
    <p>More text...</p>
    <p>Even more text...</p>
  </CardContent>
</Card>
```

**Contextual Help Principles:**
1. **Just-in-time** - Show help when users need it, not upfront
2. **Minimal** - Short, clear hints (1-2 sentences max)
3. **Visual** - Use icons and empty states to guide users
4. **Mobile-first** - Especially important on small screens
5. **Progressive** - Start simple, add complexity as needed

---

## 🎯 Core Principles

### 1. File Size Limit: **MAX 150 LINES**
- If a file exceeds 150 lines, it MUST be split into smaller modules
- Count includes imports, types, and all code
- Exception: Generated files (Prisma schema, migrations)

### 2. Server Components First
- ALL pages are Server Components by default
- Add `'use client'` ONLY when absolutely necessary:
  - Using React hooks (useState, useEffect, useContext, useRef, etc.)
  - Adding event handlers (onClick, onChange, onSubmit, etc.)
  - Using browser APIs (localStorage, window, document, etc.)
  - Using third-party libraries that require client-side

### 3. Type Safety Everywhere
- No `any` types (use `unknown` if truly needed)
- All functions must have explicit return types
- Use Zod for runtime validation
- Prisma types as source of truth for database models

### 4. Use shadcn/ui for ALL UI Components
- DO NOT create custom UI primitives (Button, Input, Card, etc.)
- ALWAYS use shadcn/ui components from `@/components/ui/`
- If you need a component not installed, run: `npx shadcn@latest add <component>`
- Available components: https://ui.shadcn.com/docs/components

---

## 📁 Project Structure

### Directory Organization

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Route group for authentication (separate layout)
│   ├── (dashboard)/       # Route group for main app (dashboard layout)
│   └── api/               # API routes (only for webhooks, file uploads, third-party integrations)
│
├── components/            # UI components
│   └── ui/               # shadcn/ui components (from Radix UI + Tailwind)
│
├── lib/                  # Core business logic
│   ├── db/              # Database client and utilities
│   ├── services/        # Business logic (domain-driven)
│   ├── actions/         # Server Actions for mutations
│   ├── queries/         # Data fetching functions
│   ├── validations/     # Zod schemas
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Pure utility functions
│   ├── constants/       # App constants
│   └── types/           # Shared TypeScript types
│
└── providers/           # React Context providers
```

---

## 🔧 Naming Conventions

### Files & Folders
```
Components:         PascalCase.tsx       (ProductCard.tsx)
Services:           camelCase.service.ts (product.service.ts)
Actions:            camelCase.actions.ts (product.actions.ts)
Queries:            camelCase.queries.ts (product.queries.ts)
Validations:        camelCase.schema.ts  (product.schema.ts)
Utils:              camelCase.ts         (format.ts)
Types:              camelCase.types.ts   (domain.types.ts)
Route-specific:     _components/         (underscore prefix for private)
```

### Code Elements
```typescript
// Components & Types
export function ProductCard() {}
export type ProductInput = {}
export interface Product {}

// Functions
export function calculateTotal() {}
export async function createProduct() {}

// Constants
export const MAX_UPLOAD_SIZE = 5000000;
export const SUPPORTED_UNITS = ['kg', 'l', 'pc'] as const;

// Enums (use const objects instead)
export const DisputeStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;
```

---

## 📝 Code Organization Within Files

**Every file must follow this structure:**

```typescript
// 1. Imports (grouped and ordered)
import { type ReactNode } from 'react';              // React imports
import { redirect } from 'next/navigation';          // Next.js imports
import { z } from 'zod';                              // External library imports
import { Button } from '@/components/ui/button';      // Internal imports (alphabetical)
import { formatDate } from '@/lib/utils/format';     // Utility imports

// 2. Types & Interfaces (if not imported)
type Props = {
  children: ReactNode;
  className?: string;
};

interface ProductFormData {
  name: string;
  quantity: number;
}

// 3. Constants (file-scoped)
const MAX_ITEMS = 10;
const DEFAULT_CATEGORY = 'uncategorized';

// 4. Main export (component, function, etc.)
export default async function InventoryPage() {
  // Implementation
}

// OR for named exports
export async function getProducts() {
  // Implementation
}

// 5. Helper functions (private to this file)
function calculateSubtotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

---

## 🏗️ Architecture Patterns

### Server Components (Default)

```typescript
// app/(dashboard)/inventory/page.tsx
import { getProducts } from '@/lib/queries/product.queries';

export default async function InventoryPage() {
  const products = await getProducts(); // Direct database query

  return (
    <div>
      <h1>Inventory</h1>
      <ProductList products={products} />
    </div>
  );
}
```

### Client Components (When Needed)

```typescript
// app/(dashboard)/inventory/_components/ProductFilters.tsx
'use client';

import { useState } from 'react';

type Props = {
  onFilterChange: (filters: Filters) => void;
};

export function ProductFilters({ onFilterChange }: Props) {
  const [category, setCategory] = useState('all');

  return (
    <select value={category} onChange={(e) => setCategory(e.target.value)}>
      {/* Options */}
    </select>
  );
}
```

### Server Actions (Mutations)

```typescript
// lib/actions/product.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { productSchema } from '@/lib/validations/product.schema';
import { createProduct } from '@/lib/services/product.service';

export async function createProductAction(formData: FormData): Promise<ActionResult> {
  // 1. Parse and validate
  const rawData = {
    name: formData.get('name'),
    quantity: Number(formData.get('quantity')),
  };

  const validated = productSchema.parse(rawData);

  // 2. Execute business logic
  const product = await createProduct(validated);

  // 3. Revalidate and redirect
  revalidatePath('/inventory');
  redirect(`/inventory/${product.id}`);
}

type ActionResult = {
  success: boolean;
  error?: string;
  data?: any;
};
```

### Services (Business Logic)

```typescript
// lib/services/product.service.ts
import { db } from '@/lib/db/client';
import type { ProductInput } from '@/lib/validations/product.schema';

export async function createProduct(data: ProductInput) {
  return await db.product.create({
    data: {
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      trackable: true,
    },
  });
}

export async function updateProductQuantity(
  productId: string,
  quantity: number
): Promise<void> {
  await db.product.update({
    where: { id: productId },
    data: { quantity },
  });
}
```

### Queries (Data Fetching)

```typescript
// lib/queries/product.queries.ts
import { db } from '@/lib/db/client';
import { cache } from 'react';

// Use React cache for request memoization
export const getProducts = cache(async () => {
  return await db.product.findMany({
    orderBy: { name: 'asc' },
  });
});

export const getProductById = cache(async (id: string) => {
  return await db.product.findUnique({
    where: { id },
    include: {
      movements: true,
      recipeIngredients: true,
    },
  });
});
```

### Validations (Zod Schemas)

```typescript
// lib/validations/product.schema.ts
import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.enum(['kg', 'l', 'pc'], {
    errorMap: () => ({ message: 'Invalid unit' }),
  }),
  category: z.string().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductOutput = z.output<typeof productSchema>;
```

---

## 🎨 Component Patterns

### Using shadcn/ui Components

**All UI components come from shadcn/ui** - DO NOT create custom UI components.

```typescript
// ✅ GOOD: Use shadcn/ui components
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function ProductCard() {
  return (
    <Card>
      <CardHeader>
        <h3>Product Name</h3>
      </CardHeader>
      <CardContent>
        <Button>View Details</Button>
        <Badge>In Stock</Badge>
      </CardContent>
    </Card>
  );
}
```

```typescript
// ❌ BAD: Don't create custom UI primitives
// components/MyButton.tsx
export function MyButton() { ... } // Use shadcn's Button instead!
```

### Adding New shadcn Components

When you need a new UI component:

```bash
# Add the component from shadcn/ui
npx shadcn@latest add <component-name>

# Examples:
npx shadcn@latest add dropdown-menu
npx shadcn@latest add table
npx shadcn@latest add toast
```

**Available components:** https://ui.shadcn.com/docs/components

### shadcn Component Examples

```typescript
// Button variants
<Button>Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Close</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// Card
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Footer actions</CardFooter>
</Card>

// Badge
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

### Route-Specific Components

```typescript
// app/(dashboard)/inventory/_components/ProductList.tsx
import { type Product } from '@prisma/client';
import { ProductCard } from './ProductCard';

type Props = {
  products: Product[];
};

export function ProductList({ products }: Props) {
  if (products.length === 0) {
    return <p>No products found.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

---

## ✅ When Adding New Features

Follow this checklist for every new feature:

### 1. Define the Schema
```typescript
// lib/validations/dispute.schema.ts
export const disputeSchema = z.object({
  billId: z.string().uuid(),
  type: z.enum(['return', 'complaint', 'refund']),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});
```

### 2. Create the Service
```typescript
// lib/services/dispute.service.ts
export async function createDispute(data: DisputeInput) {
  // Business logic here
}
```

### 3. Create Server Action
```typescript
// lib/actions/dispute.actions.ts
'use server';
export async function createDisputeAction(formData: FormData) {
  // Validation + service call + revalidation
}
```

### 4. Create Query (if needed)
```typescript
// lib/queries/dispute.queries.ts
export const getDisputes = cache(async () => {
  // Fetch disputes
});
```

### 5. Create Page
```typescript
// app/(dashboard)/disputes/page.tsx
export default async function DisputesPage() {
  const disputes = await getDisputes();
  return <DisputeList disputes={disputes} />;
}
```

### 6. Create Components
```typescript
// app/(dashboard)/disputes/_components/DisputeList.tsx
// app/(dashboard)/disputes/_components/DisputeCard.tsx
// app/(dashboard)/disputes/_components/DisputeForm.tsx
```

---

## ❌ Never Do This

### 1. Large Files
```typescript
// ❌ BAD: 500-line component
export function GiantComponent() {
  // 500 lines of code
}

// ✅ GOOD: Split into smaller components
export function ParentComponent() {
  return (
    <>
      <Header />
      <Content />
      <Footer />
    </>
  );
}
```

### 2. Custom UI Components
```typescript
// ❌ BAD: Creating custom button
// components/MyButton.tsx
export function MyButton() {
  return <button className="...">Click</button>;
}

// ✅ GOOD: Use shadcn/ui
import { Button } from '@/components/ui/button';
export function MyFeature() {
  return <Button>Click</Button>;
}
```

### 3. Business Logic in Components
```typescript
// ❌ BAD: Database queries in component
export function ProductList() {
  const products = await db.product.findMany();
  // ...
}

// ✅ GOOD: Use services and queries
export async function ProductList() {
  const products = await getProducts(); // from queries
  // ...
}
```

### 4. Unnecessary Client Components
```typescript
// ❌ BAD: Client component for static content
'use client';
export function Header() {
  return <h1>Title</h1>;
}

// ✅ GOOD: Server component (default)
export function Header() {
  return <h1>Title</h1>;
}
```

### 5. API Routes for Mutations
```typescript
// ❌ BAD: API route for simple mutation
// app/api/products/route.ts
export async function POST(req: Request) {
  // ...
}

// ✅ GOOD: Server action
// lib/actions/product.actions.ts
'use server';
export async function createProduct(data: FormData) {
  // ...
}
```

### 6. Props Drilling
```typescript
// ❌ BAD: Passing props through many levels
<Parent user={user}>
  <Child user={user}>
    <GrandChild user={user} />
  </Child>
</Parent>

// ✅ GOOD: Use Context or Server Actions
// providers/AuthProvider.tsx
<AuthProvider>
  <Parent>
    <Child>
      <GrandChild /> {/* Gets user from context */}
    </Child>
  </Parent>
</AuthProvider>
```

---

## 🔍 Code Review Checklist

Before considering any code complete, verify:

- [ ] No file exceeds 150 lines
- [ ] Server Component by default (unless needs 'use client')
- [ ] All functions have explicit return types
- [ ] No `any` types used
- [ ] Zod validation for all external inputs
- [ ] Proper error handling (try/catch or error boundaries)
- [ ] Imports are organized (React → Next → External → Internal)
- [ ] Component follows single responsibility principle
- [ ] No duplicate code (DRY principle)
- [ ] Proper TypeScript types (no implicit any)
- [ ] Constants extracted (no magic numbers/strings)
- [ ] Naming follows conventions
- [ ] File is in correct directory

---

## 🚀 Common Tasks

### Adding a New Route
1. Create folder in appropriate route group
2. Create `page.tsx` (Server Component)
3. Create `_components/` folder for route-specific components
4. Update navigation if needed

### Adding a New API Route
Only create API routes for:
- File uploads
- Webhooks (Stripe, etc.)
- Third-party integrations

For mutations, use Server Actions instead!

### Updating Database Schema
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description_of_change`
3. Update related types/validations
4. Update services/queries

---

## 📚 Key Files Reference

```
Database:           lib/db/client.ts
Auth:               app/api/auth/[...nextauth]/route.ts
Middleware:         middleware.ts
Utils:              lib/utils/*.ts
Types:              lib/types/*.types.ts
Constants:          lib/constants/*.ts
```

---

## 💡 Best Practices

1. **Prefer composition over inheritance**
2. **Keep functions pure when possible**
3. **Use TypeScript's type system fully**
4. **Write self-documenting code (clear names)**
5. **Extract magic numbers/strings to constants**
6. **Handle errors explicitly**
7. **Validate at boundaries (inputs, API calls)**
8. **Use Server Components for better performance**
9. **Optimize for readability over cleverness**
10. **When in doubt, split the file**

---

## 🆘 When You're Unsure

If you're unsure about:
- **File organization** → Check this guide's structure section
- **Naming** → Check naming conventions section
- **Component type** → Default to Server Component
- **File size** → If over 100 lines, consider splitting
- **Where to put logic** → Business logic goes in services

---

**Remember:** The goal is maintainable, scalable code that your friend can understand and modify easily. When in doubt, favor clarity over cleverness.
