# Nexus CRM – Implementation Phases

> Phase-by-phase roadmap for Claude Code. Each phase has a focused prompt, clear scope, and built-in self-verification.
> **Rule:** Complete and verify each phase before starting the next.

---

## How to Use This File

1. Copy the **Claude Code Prompt** for the current phase
2. Paste it into Claude Code
3. Let Claude Code implement + self-test
4. Review the ✅/❌ report Claude Code produces
5. Fix any ❌ items
6. Move to the next phase

---

## Phase Overview

| Phase | Name | Est. Effort | Dependencies |
|-------|------|-------------|--------------|
| 0 | Project Bootstrap | 30 min | None |
| 1 | Supabase Schema + Auth | 2-3 hrs | Phase 0 |
| 2 | Layout Shell + Navigation | 2-3 hrs | Phase 1 |
| 3 | Account Settings | 2-3 hrs | Phase 2 |
| 4 | Workspace Settings (General + Members) | 2-3 hrs | Phase 2 |
| 5 | Object System (Definitions + Attributes) | 3-4 hrs | Phase 4 |
| 6 | Records CRUD + Table View | 3-4 hrs | Phase 5 |
| 7 | Record Detail Page | 3-4 hrs | Phase 6 |
| 8 | Lists | 2-3 hrs | Phase 6 |
| 9 | Deal Pipeline (Kanban) | 2-3 hrs | Phase 6 |
| 10 | Notes + Tasks | 2-3 hrs | Phase 7 |
| 11 | Ask Neo (AI Chat) | 3-4 hrs | Phase 2 |
| 12 | Email/Calendar (Unipile) | 3-4 hrs | Phase 7 |
| 13 | Enrichment System | 3-4 hrs | Phase 6 |
| 14 | Campaigns + Workflows (Basic) | 2-3 hrs | Phase 6 |
| 15 | Polish + Advanced Features | Ongoing | All above |

---

## PHASE 0 – Project Bootstrap

### Claude Code Prompt

```
Read CLAUDE.md and docs/DATA_MODEL.md for full context.

This project is currently a Vite + React app. We are migrating to Next.js App Router.

STEP 1 – MIGRATE FROM VITE TO NEXT.JS:

1a. Remove Vite:
   - Delete vite.config.js (or vite.config.ts)
   - Remove vite, @vitejs/plugin-react from package.json devDependencies
   - Delete the root index.html (Vite entry point)

1b. Install Next.js:
   - npm install next@latest react@latest react-dom@latest
   - npm install -D @types/node

1c. Create next.config.js (or next.config.ts):
   - Enable images.remotePatterns for Supabase storage domain
   - Set reactStrictMode: true

1d. Update package.json scripts:
   - "dev": "next dev"
   - "build": "next build"
   - "start": "next start"
   - "lint": "next lint"

1e. Restructure to App Router:
   - Create src/app/layout.tsx (root layout with <html>, <body>, Inter font import)
   - Create src/app/page.tsx (temporary home page, just "Nexus CRM" text)
   - Move existing reusable components to src/components/ (keep what's useful, delete Vite-specific wrappers)
   - Delete old entry files: index.tsx, App.tsx, main.tsx or similar Vite entry points
   - Keep existing supabase/ folder (migrations etc.) if present

1f. Clean up:
   - Remove any remaining Vite-specific imports or configs
   - Ensure tsconfig.json has Next.js paths: "paths": { "@/*": ["./src/*"] }
   - Delete unused old files (constants.tsx, metadata.json if Vite-specific)
   - Keep .env.example and existing .gitignore (update for .next/)

STEP 2 – SET UP PROJECT FOUNDATION:

2a. Install/verify dependencies:
   - shadcn/ui (init): npx shadcn-ui@latest init (select New York style, slate color, src/ alias)
   - Required shadcn components: button, input, label, select, switch, tabs, dialog, dropdown-menu, avatar, badge, toast, card, separator, tooltip, popover, command
   - Additional packages: @supabase/supabase-js, @supabase/ssr, zustand, react-hook-form, @hookform/resolvers, zod, lucide-react, date-fns

2b. Create the folder structure as defined in CLAUDE.md:
   - src/app/ (App Router pages)
   - src/components/ui/ (shadcn)
   - src/components/layout/ (sidebar, header, settings layout)
   - src/components/records/ (record components)
   - src/components/settings/ (settings components)
   - src/components/shared/ (reusable: avatar, badge, etc.)
   - src/lib/supabase/ (clients + types)
   - src/lib/hooks/ (custom hooks)
   - src/lib/stores/ (Zustand stores)
   - src/lib/utils/ (helpers)
   - src/types/ (app-wide TS types)

2c. Set up Supabase client files:
   - src/lib/supabase/client.ts (browser client using createBrowserClient)
   - src/lib/supabase/server.ts (server client using createServerClient with cookies)
   - src/lib/supabase/middleware.ts (auth middleware that refreshes session)

2d. Create src/middleware.ts that uses the Supabase middleware for auth session refresh

2e. Set up environment variables template (.env.local.example):
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   OPENROUTER_API_KEY=

2f. Configure Tailwind with the Nexus theme:
   - Extend colors: nexus-cream (#FDF6EC), nexus-green (#16A34A as accent), neutral grays
   - Font: Inter (import from Google Fonts in layout.tsx via next/font/google)

Do NOT create any pages or UI beyond the root layout + temporary home page. Just the infrastructure.
Commit message: "migrate from Vite to Next.js App Router + project bootstrap"

--- SELF-CHECK ---
When implementation is complete, run these checks and report results:

1. Verify Vite is fully removed:
   - vite.config.js/ts does NOT exist
   - No "vite" in package.json dependencies
   - No root index.html (Vite entry point) – Next.js uses src/app/layout.tsx instead
2. Run `npm run build` and confirm 0 errors. If errors, fix them first.
3. Run `npm run dev` and confirm Next.js dev server starts (should show "ready" on localhost:3000).
4. Verify these files exist and are non-empty:
   - next.config.js (or .ts)
   - src/app/layout.tsx (root layout)
   - src/app/page.tsx (temp home)
   - src/lib/supabase/client.ts
   - src/lib/supabase/server.ts
   - src/lib/supabase/middleware.ts
   - src/middleware.ts
   - .env.local.example (with all 4 vars)
5. Verify Tailwind config contains nexus-cream and nexus-green color extensions.
6. Verify these shadcn components are installed: button, input, dialog, dropdown-menu, avatar, badge, toast, tabs.
7. Verify folder structure: src/app/, src/components/ui/, src/components/layout/, src/lib/hooks/, src/lib/stores/, src/lib/utils/
8. Verify no old Vite artifacts remain (no vite imports, no index.html entry point).

Report as:
## Phase 0 – Self-Check Report
- [ ] Vite fully removed (no vite.config, no vite in package.json, no root index.html)
- [ ] Next.js installed and configured (next.config.js exists)
- [ ] `npm run build` passes with 0 errors
- [ ] `npm run dev` starts Next.js on localhost:3000
- [ ] Root layout (src/app/layout.tsx) + temp home page exist
- [ ] Supabase client files exist (client.ts, server.ts, middleware.ts)
- [ ] Auth middleware at src/middleware.ts exists
- [ ] .env.local.example has all 4 vars (Supabase x3 + OpenRouter)
- [ ] Tailwind config has Nexus theme colors (nexus-cream, nexus-green)
- [ ] All required shadcn/ui components installed
- [ ] Folder structure matches CLAUDE.md spec
- [ ] No old Vite artifacts remain
- [ ] Git committed and pushed

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 1 – Supabase Schema + Auth

### Claude Code Prompt

```
Read docs/DATA_MODEL.md for the complete schema.

Implement the database and authentication:

1. Create Supabase migration files in supabase/migrations/ following the exact order in DATA_MODEL.md (001 through 025). Copy the SQL exactly as specified.

2. Create the RLS policies as specified in Section 4 of DATA_MODEL.md.

3. Build the auth pages at src/app/(auth)/:
   - /login – Email/password login form. Clean, centered card layout. "Don't have an account? Sign up" link.
   - /signup – Email/password + first name + last name. Creates auth user + triggers profile creation. "Already have an account? Sign in" link.
   - /forgot-password – Email input + "Send reset link" button.
   - Use Supabase Auth (signInWithPassword, signUp, resetPasswordForEmail).
   - After signup: auto-create workspace "My Workspace" + add user as admin member + call seed_workspace_defaults function.
   - After login: redirect to /home.
   - Style: Clean, professional. Nexus logo at top. White card on light gray background.

4. Create a workspace context provider (src/lib/stores/workspace-store.ts using Zustand):
   - Stores current workspace ID
   - Stores current user's role in workspace
   - Fetches workspace data on mount
   - Provides switchWorkspace function

5. Generate TypeScript types from Supabase schema:
   - Create src/lib/supabase/types.ts with Database type (use `npx supabase gen types typescript` or manually define matching types)

Auth flow: Unauthenticated → /login. Authenticated without workspace → auto-create. Authenticated with workspace → /home.

--- SELF-CHECK ---
When implementation is complete, run these checks and report results:

1. Run `npm run build` – must pass with 0 errors.
2. Count migration files in supabase/migrations/ – should be 25+.
3. Verify each migration file is valid SQL (check first few lines of each).
4. Verify auth pages exist and have proper form fields:
   - src/app/(auth)/login/page.tsx – has email + password inputs
   - src/app/(auth)/signup/page.tsx – has first name, last name, email, password
   - src/app/(auth)/forgot-password/page.tsx – has email input
5. Verify workspace store exists at src/lib/stores/workspace-store.ts with workspaceId, userRole, switchWorkspace.
6. Verify src/lib/supabase/types.ts exists with Database type.
7. Verify signup flow creates: auth user → user_profile → workspace → workspace_member (admin) → seed_workspace_defaults call.

Report as:
## Phase 1 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] 25+ migration files created in supabase/migrations/
- [ ] RLS policies included (enable RLS + policies for workspaces, records, etc.)
- [ ] Login page renders with email/password form
- [ ] Signup page renders with name + email + password form
- [ ] Forgot password page exists
- [ ] Signup flow: creates user → profile → workspace → admin member → seeds defaults
- [ ] Login redirects to /home
- [ ] Workspace Zustand store created with workspaceId, userRole, switchWorkspace
- [ ] TypeScript Database types file exists
- [ ] Unauthenticated users redirected to /login (middleware)

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 2 – Layout Shell + Navigation

### Claude Code Prompt

```
Read CLAUDE.md and docs/SETTINGS_SPEC.md sections 1.1 and 1.2 for navigation spec.

Build the main application layout:

1. Dashboard layout at src/app/(dashboard)/layout.tsx:
   - Left sidebar (256px fixed width, cream/warm background matching current Nexus design)
   - Main content area (flex-1, white background, scrollable)
   - Sidebar components in src/components/layout/

2. Sidebar structure (see SETTINGS_SPEC.md §1.2):
   - Top: Workspace name dropdown (§1.1 – workspace name, switch workspace, account settings, workspace settings, invite, sign out)
   - Search bar with ⌘K shortcut hint
   - Navigation items with COLORED icons (emoji-style, not monochrome):
     - Home, Notifications, Tasks, Notes, Emails, Calls, Reports, Automations
   - Favorites section (collapsible, empty state: "Pin items for quick access")
   - Records section: Companies, People, Deals (each with colored icon)
   - Lists section (dynamic, loaded from DB)
   - Bottom: User avatar + name + settings gear icon

3. Settings layout at src/app/settings/layout.tsx:
   - Settings sidebar (240px, LEFT side) with MONOCHROME Lucide icons (gray-500)
   - Content area (max-width 720px, centered, scrollable)
   - Settings sidebar items per §3.0 of SETTINGS_SPEC.md
   - Active item: left accent bar + bold text

4. Create placeholder pages that just show "Coming soon" with the page title:
   - /home, /notifications, /tasks, /notes, /emails
   - /settings/account/profile, /settings/account/appearance, etc.
   - /settings/workspace/general, /settings/workspace/members, etc.

5. Implement the workspace dropdown menu (§1.1):
   - Shows workspace name with checkmark
   - Account settings → /settings/account/profile
   - Workspace settings → /settings/workspace/general
   - Invite team members → placeholder modal
   - Sign out → Supabase signOut + redirect

Design: Follow Attio's clean aesthetic. Cream sidebar with subtle borders. Active nav items have accent highlight. Smooth transitions.

--- SELF-CHECK ---
When implementation is complete, run these checks and report results:

1. Run `npm run build` – must pass with 0 errors.
2. Verify layout files exist: src/app/(dashboard)/layout.tsx, src/app/settings/layout.tsx.
3. Verify sidebar component(s) exist in src/components/layout/.
4. Verify all placeholder pages exist and render (check file exists + has default export):
   - /home, /tasks, /notes, /emails
   - /settings/account/profile, appearance, notifications
   - /settings/workspace/general, members, objects, lists
5. Verify sidebar has nav items: Home, Tasks, Notes, Companies, People, Deals.
6. Verify workspace dropdown has: Account settings, Workspace settings, Sign out.
7. Verify settings sidebar uses monochrome Lucide icons (gray classes).
8. Verify dashboard sidebar uses colored icons.

Report as:
## Phase 2 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] Dashboard layout with sidebar (256px) + main content area
- [ ] Sidebar has workspace dropdown with all menu items (§1.1)
- [ ] Sidebar nav items: Home, Notifications, Tasks, Notes, Emails (colored icons)
- [ ] Records section: Companies, People, Deals (colored icons)
- [ ] Favorites section (collapsible, empty state)
- [ ] Settings layout with settings sidebar (240px, monochrome Lucide icons)
- [ ] Settings sidebar items match §3.0 (General, Members, Objects, Lists, etc.)
- [ ] Active nav item highlighted (accent bar or bold)
- [ ] All placeholder pages created and render
- [ ] Sign out works (clears session, redirects to /login)
- [ ] Navigation between pages works (no broken links)

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 3 – Account Settings

### Claude Code Prompt

```
Read docs/SETTINGS_SPEC.md sections 2.1 through 2.6 for complete specs.

Build all Account Settings pages:

1. Profile (§2.1) at /settings/account/profile:
   - Profile picture upload (avatar with initials fallback)
   - First name, Last name inputs
   - Primary email (read-only with "Edit" button)
   - Banner: "Changes to your profile will apply to all of your workspaces."
   - Save changes button → updates user_profiles table

2. Time Preferences (§2.2) – can be on the profile page or separate:
   - Timezone dropdown (all IANA timezones, default Europe/Berlin)
   - Week start dropdown (Monday / Sunday)

3. Appearance (§2.3) at /settings/account/appearance:
   - Theme selector: 3 cards with preview thumbnails (Light / Dark / System)
   - Selected card has dashed border
   - Accent color: horizontal row of color dots (blue, cyan, amber, orange, pink, purple, green)
   - Selected dot has ring
   - Changes save immediately (no save button needed)
   - Apply theme/accent via CSS variables or Tailwind dark mode

4. Notifications (§2.5) at /settings/account/notifications:
   - Daily digest toggle with description
   - Notification types table: each type has label + email checkbox
   - Types: Mentions, Replies, Email Grants, Task Assignments, Shared Resources, Sequence delegated sender, Deal Stage Changes, Birthday Reminders, Enrichment Complete
   - Save to user_notification_prefs table

5. Ask Neo (§2.6) at /settings/account/ask-neo:
   - Tabs: General / Prompts
   - General: Privacy settings (web search dropdown, share downvoted dropdown)
   - Default model dropdown
   - Model favorites list with provider logos (16px), model name, star toggle
   - Prompts tab: placeholder "Custom prompts coming soon"
   - Save to user_ai_settings table

6. Email & Calendar (§2.4) at /settings/account/email-calendar:
   - Connected accounts list (placeholder – will integrate Unipile later)
   - "+ Connect Account" button (placeholder modal)
   - Purpose assignment dropdowns (Email / Calendar / LinkedIn) – placeholder UI
   - Team access toggle

Use React Hook Form + Zod for form validation. Use Supabase for data persistence. Toast notifications on save.

--- SELF-CHECK ---
When implementation is complete, run these checks and report results:

1. Run `npm run build` – must pass with 0 errors.
2. Verify each settings page exists and has form/interactive elements:
   - /settings/account/profile – has first_name, last_name inputs + avatar upload
   - /settings/account/appearance – has theme cards + accent color dots
   - /settings/account/notifications – has toggle switches for each notification type
   - /settings/account/ask-neo – has tabs (General/Prompts) + dropdowns
   - /settings/account/email-calendar – has placeholder UI
3. Verify Supabase integration (profile → user_profiles, notifications → user_notification_prefs, AI → user_ai_settings).
4. Verify form validation (Zod schemas defined for profile form).
5. Verify toast notifications on form submit.
6. Verify appearance page saves immediately (onChange handlers, no save button).

Report as:
## Phase 3 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] Profile page: name fields + avatar upload + email (read-only) + save button
- [ ] Profile: banner text "Changes apply to all workspaces" present
- [ ] Time preferences: timezone dropdown + week start dropdown
- [ ] Appearance: 3 theme cards with dashed-border selection
- [ ] Appearance: 7 accent color dots with ring selection
- [ ] Appearance: changes save immediately (no save button)
- [ ] Notifications: daily digest toggle + 9 notification type checkboxes
- [ ] Notifications: saves to user_notification_prefs table
- [ ] Ask Neo: General/Prompts tabs + privacy dropdowns + model favorites
- [ ] Email/Calendar: placeholder UI with Connect Account button
- [ ] Form validation with Zod on profile form
- [ ] Toast notifications on successful save
- [ ] All data persists to Supabase (reload page → values still there)

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 4 – Workspace Settings (General + Members)

### Claude Code Prompt

```
Read docs/SETTINGS_SPEC.md sections 3.1 and 3.2 for specs.

Build Workspace Settings pages (admin-only):

1. General (§3.1) at /settings/workspace/general:
   - Workspace logo upload (with first-letter fallback in accent color)
   - Workspace name text input
   - Slug (read-only after creation) with copy button
   - Export workspace data section: "Start new export" button + exports table (placeholder)
   - Danger zone: Red "Delete workspace" button – ADMIN ONLY (hide for non-admins)
   - Delete confirmation modal requires typing workspace name

2. Members (§3.2) at /settings/workspace/members:
   - Tabs: Members / Teams (Teams = placeholder)
   - Members tab:
     - Search "Search name or email" input
     - Filter by role button
     - "Invite team members" primary button → Modal: email input + role selector (Admin/Member/Viewer/Guest) → sends invite via Supabase
     - Member table: columns = User (avatar + name + email) / Role (badge) / Teams / ⋮ menu
     - ⋮ menu: Make admin, Change role, Suspend, End sessions
     - Role badges: Admin (purple), Member (blue), Viewer (gray), Guest (amber)

3. Access control:
   - Add a server-side check: Only users with role='admin' can access /settings/workspace/*
   - Non-admins trying to access get redirected to /settings/account/profile
   - The "Workspace settings" link in the sidebar dropdown only shows for admins

4. Ask Neo Usage (§3.3) at /settings/workspace/ask-neo-usage:
   - 3 summary cards across top (placeholder values)
   - Workspace credits progress bar
   - Member-level usage table (placeholder)

5. Placeholder pages for: Call recorder, Developers, Migrate CRM, Apps – each shows "Coming soon" with relevant icon.

Data: All changes persist to Supabase. Member role changes update workspace_members table.

--- SELF-CHECK ---
When implementation is complete, run these checks and report results:

1. Run `npm run build` – must pass with 0 errors.
2. Verify General page: workspace name + logo + slug (read-only) + copy button + delete button (admin-only).
3. Verify Members page: search + role filter + invite button + member table + ⋮ menu.
4. Verify access control: admin role check in workspace settings layout.
5. Verify placeholder pages: call-recorder, developers, migrate, apps.

Report as:
## Phase 4 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] General: workspace name input + logo upload + slug with copy button
- [ ] General: export section with "Start new export" button (placeholder)
- [ ] General: danger zone with admin-only delete button
- [ ] General: delete confirmation modal requires typing workspace name
- [ ] Members: search + role filter + invite button
- [ ] Members: table with User/Role/Teams/Menu columns
- [ ] Members: ⋮ menu has Make admin, Change role, Suspend, End sessions
- [ ] Members: invite modal with email + role selector
- [ ] Members: role badges colored (Admin=purple, Member=blue, etc.)
- [ ] Access: only admins can access /settings/workspace/* pages
- [ ] Access: "Workspace settings" hidden in dropdown for non-admins
- [ ] Ask Neo Usage page with 3 summary cards (placeholder)
- [ ] Placeholder pages: call recorder, developers, migrate, apps

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 5 – Object System (Definitions + Attributes)

### Claude Code Prompt

```
Read docs/SETTINGS_SPEC.md sections 3.5 and 3.5.1 for complete specs.
Read docs/DATA_MODEL.md sections 2.8 and 2.9 for the schema.

Build the Object configuration system:

1. Objects list at /settings/workspace/objects:
   - Table: Object (icon + name) / Type (Standard/Custom badge) / Records (count) / Attributes (count) / ⋮ menu
   - Default objects from seed: Companies, People, Deals
   - ⋮ menu: Deactivate (standard) / Delete (custom only)
   - "+ New custom object" button → Modal with: plural noun, singular noun, slug, icon selector, Create button

2. Object detail at /settings/workspace/objects/[objectSlug]:
   - Header: Icon + Object Name + Standard/Custom badge
   - Tabs: Configuration / Permissions / Appearance (placeholder) / Attributes / Templates (placeholder)

3. Configuration tab: Singular/Plural noun inputs. Slug read-only for standard objects.

4. Permissions tab: Workspace access dropdown (Read and write / Read only / No access) + team/member/automation overrides.

5. Attributes tab – THIS IS CRITICAL:
   - Search + Filter + "+ Create attribute" button
   - Create modal: Name, Slug (auto-generated), Type dropdown, Constraints (Unique/Required), Enrichable toggle
   - Attribute table: drag handle, icon, name, type, constraints badges, properties badges (System/Enriched/Auto-Enriched)
   - ⋮ menu: Edit, Enable/Disable auto-enrichment, Delete (not for system)
   - Bulk enrichment: "Enable all" / "Disable all" + "X of Y active"

Drag-and-drop reorder updates sort_order column.

--- SELF-CHECK ---
When implementation is complete, run these checks and report results:

1. Run `npm run build` – must pass with 0 errors.
2. Verify objects page lists Companies, People, Deals with counts.
3. Verify create custom object modal works.
4. Verify object detail page has 5 tabs.
5. Verify attributes tab: list, create, edit, delete, drag reorder, enrichment toggles.
6. Test: Create custom object → appears in list. Add attribute → appears in table.

Report as:
## Phase 5 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] Objects page lists Companies, People, Deals with counts
- [ ] Objects table has correct columns (name, type badge, records, attributes)
- [ ] "+ New custom object" modal works (creates in DB)
- [ ] Object detail page has 5 tabs
- [ ] Configuration tab: editable names + read-only slug for standard objects
- [ ] Permissions tab: workspace/team/member access levels
- [ ] Attributes tab: lists all seeded attributes
- [ ] "+ Create attribute" modal with all field types available
- [ ] Attribute table: drag handle, icon, name, type, constraints, properties
- [ ] Attribute ⋮ menu: edit, enrichment toggle, delete (not for system)
- [ ] Bulk enrichment: "Enable all" / "Disable all" + count display
- [ ] Drag-and-drop reorder updates sort_order in DB
- [ ] System attributes cannot be deleted

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 6 – Records CRUD + Table View

### Claude Code Prompt

```
Read docs/DATA_MODEL.md sections 2.14 and 2.15 for the records + EAV schema.

Build the records system with table views:

1. Records list page at /[objectSlug] (e.g., /companies, /people, /deals):
   - Header: Object icon + plural name + record count
   - "+ New [Singular]" button
   - Table view with columns matching object attributes (loaded from object_attributes, sorted by sort_order)
   - Cell values from record_field_values (EAV pattern)
   - Table features: column resize, column reorder, sort (click header), filter bar ("+ Add filter"), search bar (fuzzy on display_name)

2. Create record: "+ New [Singular]" → inline row or modal with all attribute fields
   - Field type rendering: text→input, number/currency→number input, date→date picker, select→dropdown, multi_select→chips, status→colored badge, email/phone/url→validated input, checkbox→toggle, rating→stars, relationship→search+select, location→text, rich_text→textarea

3. Edit inline: Click cell → edit → auto-save (debounced 500ms) + saving indicator

4. Delete: Row checkboxes → "Delete selected" bulk action. Or ⋮ menu → Delete → confirmation.

5. Helper functions in src/lib/supabase/: getRecords, createRecord, updateFieldValue, deleteRecords

EAV pattern: records table = shell. record_field_values = field values (use value_text, value_number, value_date, value_boolean, value_json based on field_type).

--- SELF-CHECK ---
When implementation is complete, run these checks and report results:

1. Run `npm run build` – must pass with 0 errors.
2. Verify /companies, /people, /deals pages render.
3. Verify table columns loaded from object_attributes.
4. Verify CRUD helpers exist.
5. Test: Create record → verify in DB. Edit field → verify auto-save. Delete → verify cascade.

Report as:
## Phase 6 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] /companies, /people, /deals pages render with table view
- [ ] Table columns loaded dynamically from object_attributes
- [ ] Cell renderers match field types (text→input, select→dropdown, etc.)
- [ ] "+ New [Singular]" creates a new record
- [ ] Inline editing: click cell → edit → auto-saves (debounced)
- [ ] Sort: click column header toggles asc/desc
- [ ] Filter bar: can add filters by attribute + operator + value
- [ ] Search bar: fuzzy search on display_name
- [ ] Row checkboxes + "Delete selected" bulk action
- [ ] ⋮ row menu with Delete option + confirmation
- [ ] EAV helper functions: getRecords, createRecord, updateFieldValue, deleteRecords
- [ ] Record count shown in header

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 7 – Record Detail Page

### Claude Code Prompt

```
Build the record detail page:

1. Route: /[objectSlug]/[recordId]
2. Layout (Attio-inspired): Left panel (65%, fields) + Right panel (35%, activity/relationships)
3. Left panel: Header (display name + icon), fields in groups (primary always visible, details collapsible), click-to-edit, auto-save
4. Right panel tabs: Activity (timeline from activities table), Relationships (linked records + add), Notes (record-linked + create), Tasks (record-linked + create)
5. Breadcrumb: Companies > Acme GmbH
6. Action bar: ⋮ menu (Archive, Delete, Add to list)
7. Activity logging: field changes → insert into activities table with old/new values

--- SELF-CHECK ---
When implementation is complete, run these checks and report results:

1. Run `npm run build` – must pass with 0 errors.
2. Verify record detail page loads with fields + right panel tabs.
3. Verify click-to-edit + auto-save.
4. Verify activity timeline, relationships, notes, tasks tabs.
5. Verify breadcrumb and action bar.

Report as:
## Phase 7 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] Record detail page loads at /[objectSlug]/[recordId]
- [ ] Left panel: header with display name + object icon
- [ ] Left panel: all fields rendered with correct types + click-to-edit
- [ ] Right panel: Activity tab with timeline
- [ ] Right panel: Relationships tab with add + navigate
- [ ] Right panel: Notes tab with create + list
- [ ] Right panel: Tasks tab with create + checkbox
- [ ] Breadcrumb navigation: Object > Record Name
- [ ] Action bar ⋮ menu: Archive, Delete, Add to list
- [ ] Activity logging: field changes create activities entries
- [ ] Auto-save with toast confirmation

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 8 – Lists

### Claude Code Prompt

```
Read docs/SETTINGS_SPEC.md sections 3.6 and 3.6.1.

Build the Lists system:

1. Lists settings at /settings/workspace/lists: Table of lists + "+ New list" modal (parent object + name)
2. List detail settings at /settings/workspace/lists/[listId]: Configuration, Permissions, Attributes, Notifications tabs + "Go to list" button
3. List view at /lists/[listId]: Same table component as records, scoped to list entries. Shows object + list attributes.
4. Sidebar: Lists section loads dynamically from DB.
5. List membership: join table or filter_config. Records can belong to multiple lists. "+ Add to list" on records.

--- SELF-CHECK ---
Report as:
## Phase 8 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] Lists settings page: table with all lists + "+ New list" button
- [ ] Create list modal: parent object + name + create
- [ ] List detail settings: Configuration/Permissions/Attributes/Notifications tabs
- [ ] "Go to list" button navigates to /lists/[listId]
- [ ] List view page shows scoped records in table view
- [ ] Object attributes + list attributes both shown as columns
- [ ] Can add/remove records from list
- [ ] Sidebar lists section loads dynamically from DB
- [ ] Records can belong to multiple lists
- [ ] ⋮ menu: Settings, Delete

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 9 – Deal Pipeline (Kanban)

### Claude Code Prompt

```
Build the Kanban/pipeline view for Deals:

1. View toggle on Deals page: Table | Kanban
2. Kanban: Columns = deal stages from 'stage' options_json. Column header: stage name + color + count + total value. Cards: deal name, company, value, owner avatar, days in stage.
3. Drag-and-drop: cards between columns → update stage field → log in activities. Use @dnd-kit/core or similar.
4. Actions: "+ Add deal" per column, click card → detail page, quick edit value on card.
5. Pipeline summary bar: total value, per-stage counts, avg days in stage.

--- SELF-CHECK ---
Report as:
## Phase 9 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] Deals page has Table/Kanban view toggle
- [ ] Kanban columns match deal stages from options_json
- [ ] Column headers: stage name + color indicator + deal count + total value
- [ ] Cards: deal name + company + value + owner avatar + days in stage
- [ ] Drag-and-drop between columns changes stage
- [ ] Stage change logged in activities table
- [ ] "+ Add deal" button at bottom of each column
- [ ] Click card → navigates to deal detail page
- [ ] Pipeline summary bar: total value + per-stage counts
- [ ] Smooth drag animations

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 10 – Notes + Tasks

### Claude Code Prompt

```
Build standalone Notes and Tasks pages:

1. /notes: Grid/list of all workspace notes. Cards: title, preview, author, date, linked record. "+ New note" creates standalone note. Note editor with TipTap (bold, italic, lists, headings, links, @ mentions). Auto-save.
2. /tasks: Table of all workspace tasks. Columns: checkbox, title, assignee, due date, priority, linked record. Filters: My tasks, All, Overdue, By priority. "+ New task" inline. Click → expand/edit.
3. Install TipTap: @tiptap/react, @tiptap/starter-kit, @tiptap/extension-link, @tiptap/extension-mention, @tiptap/extension-placeholder. Create reusable RichTextEditor in src/components/shared/.
4. /home dashboard: "Good morning, [name]" + today's tasks + recent activity + upcoming meetings (placeholder) + Ask Neo widget (placeholder).

--- SELF-CHECK ---
Report as:
## Phase 10 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] Notes page: grid/list of all workspace notes
- [ ] Note cards: title + preview + author + date + linked record
- [ ] Note editor: TipTap with bold, italic, lists, headings, links
- [ ] @ mentions in notes trigger user picker
- [ ] Notes auto-save (debounced)
- [ ] Tasks page: table with checkbox/title/assignee/due date/priority
- [ ] Task filters: My tasks, All tasks, Overdue, By priority
- [ ] "+ New task" inline creation
- [ ] RichTextEditor component reusable in src/components/shared/
- [ ] Home dashboard: greeting + today's tasks + activity feed
- [ ] TipTap packages in package.json

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 11 – Ask Neo (AI Chat)

### Claude Code Prompt

```
Read docs/SETTINGS_SPEC.md section 2.6.

Build the AI assistant:

1. Floating button (bottom-right) → chat panel (slide-in right, 400px). Chat UI: message history + input + send. User messages right, AI left with Neo avatar. Model selector dropdown (favorites first).
2. OpenRouter: src/lib/ai/openrouter.ts. API: https://openrouter.ai/api/v1/chat/completions. Stream responses (SSE). System prompt about PE deal sourcing context. Env: OPENROUTER_API_KEY.
3. Context injection: on record pages, inject record data into system prompt.
4. Chat history: localStorage per workspace. Last 50 messages. "New chat" clears.
5. Model favorites from user_ai_settings. Provider logos in dropdown. Star/unstar.

--- SELF-CHECK ---
Report as:
## Phase 11 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] Floating chat button (bottom-right) present on all pages
- [ ] Chat panel slides in from right (400px)
- [ ] Chat UI: message history + input + send button
- [ ] User messages right-aligned, AI responses left-aligned with avatar
- [ ] OpenRouter API integration in src/lib/ai/openrouter.ts
- [ ] Streaming responses (SSE/ReadableStream)
- [ ] Model selector dropdown with favorites first
- [ ] Provider logos (16px) next to model names
- [ ] Context injection: record data in system prompt on record pages
- [ ] Chat history in localStorage (per workspace)
- [ ] "New chat" button clears history
- [ ] OPENROUTER_API_KEY in .env.local.example

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 12 – Email/Calendar (Unipile)

### Claude Code Prompt

```
Build email and calendar integration via Unipile:

1. Settings /settings/account/email-calendar: Replace placeholder. "+ Connect Account" → Unipile auth. Store connected_accounts. Status badges. Purpose dropdowns.
2. /emails: Fetch via Unipile API. Inbox: sender, subject, preview, date. Read view. Compose: To/Subject/Body + send. Thread view. Auto-link to records.
3. Calendar widget on /home: fetch events via Unipile. Today's + upcoming meetings. Link attendees to people records.
4. Record detail email tab: emails linked to this record.
5. Env: UNIPILE_API_KEY, UNIPILE_DSN.

--- SELF-CHECK ---
Report as:
## Phase 12 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] Unipile client library created
- [ ] Settings: Connect Account flow + connected accounts list + status badges
- [ ] Settings: Purpose assignment dropdowns
- [ ] Emails page: inbox view + read view + compose + send
- [ ] Emails auto-linked to records
- [ ] Calendar widget on home page
- [ ] Record detail: email tab
- [ ] UNIPILE_API_KEY + UNIPILE_DSN in .env.local.example

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 13 – Enrichment System

### Claude Code Prompt

```
Build the data enrichment engine:

1. src/lib/enrichment/enrichment-service.ts: orchestrates per-record. Checks enrichment_active per attribute. Calls OpenRouter with structured prompt.
2. Triggers: auto on record creation, manual "Enrich" button on detail page, bulk "Enrich selected" in table.
3. Companies: fill description, industry, employees, revenue, location, LinkedIn from name/domain.
4. People: fill job title, email, phone, LinkedIn, location from name+company.
5. Status: loading spinner per field, "Enriched" badge, activity log.
6. Rate limiting: queue, max concurrent, track in workspace_ai_usage.

--- SELF-CHECK ---
Report as:
## Phase 13 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] Enrichment service in src/lib/enrichment/
- [ ] Company enrichment fills missing fields via AI
- [ ] People enrichment fills missing fields via AI
- [ ] "Enrich" button on record detail page
- [ ] Bulk "Enrich selected" in table view
- [ ] Auto-enrich on record creation (if enabled)
- [ ] Respects per-attribute enrichment_active toggles
- [ ] Loading states during enrichment
- [ ] Activity log entries for enrichment
- [ ] Rate limiting / credits tracking

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 14 – Campaigns + Workflows (Basic)

### Claude Code Prompt

```
Build basic Campaigns and Workflows:

1. /settings/workspace/campaigns: List + "+ New campaign" (name + target list). Status badges. Basic step builder placeholder.
2. /settings/workspace/workflows: List + "+ New workflow" (name + trigger). Triggers: Record created, Field changed, Stage changed, Time-based. Actions: Send notification, Update field, Create task, Send email. Simple if/then. Live/Paused toggle.
3. Integration: stage change → check workflow triggers → execute actions.

--- SELF-CHECK ---
Report as:
## Phase 14 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] Campaigns page: list + create + status badges
- [ ] Workflows page: list + create + trigger/action config
- [ ] Workflow triggers: Record created, Field changed, Stage changed, Time-based
- [ ] Workflow actions: Send notification, Update field, Create task, Send email
- [ ] Workflow status toggle: Live / Paused / Draft
- [ ] Basic workflow execution on matching events

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## PHASE 15 – Polish + Advanced Features

### Claude Code Prompt

```
Polish the application:

1. Global search (⌘K): command palette, search records/pages/actions, keyboard nav.
2. @ Mentions: global user picker in all text fields, inserts @Name chip, triggers notification.
3. Favorites: star icon on records/lists, sidebar section, persist to DB.
4. Keyboard shortcuts: ⌘K, N (new record), E (edit), Esc (close).
5. Empty states: friendly icons + CTAs for empty pages.
6. Dark mode: Tailwind dark: classes throughout, respect theme preference.
7. Performance: virtual scrolling (tanstack/react-virtual), optimistic updates, loading skeletons, next/image.
8. Error handling: global error boundary, toast errors, retry logic, offline indicator.

--- SELF-CHECK ---
Report as:
## Phase 15 – Self-Check Report
- [ ] `npm run build` passes with 0 errors
- [ ] ⌘K command palette: search records + pages + actions
- [ ] @ mentions: user picker in all text fields
- [ ] Favorites: star toggle + sidebar section
- [ ] Keyboard shortcuts: ⌘K, N, E, Esc
- [ ] Empty states on all empty pages
- [ ] Dark mode: all components render correctly
- [ ] Loading skeletons on data-loading pages
- [ ] Virtual scrolling on large tables
- [ ] Global error boundary + toast errors
- [ ] Offline indicator

Mark each ✅ or ❌. If any ❌, fix them and re-check before reporting.
```

---

## Notes for Claude Code

### Between Phases
- Always run `npm run build` after each phase to catch type errors
- Test the UI manually in the browser
- Check Supabase dashboard for correct data
- If a phase is too large, break it into sub-tasks

### Common Issues
- **RLS blocking queries**: Check that the user has workspace membership
- **Type errors**: Regenerate types with `npx supabase gen types typescript`
- **Hydration mismatches**: Check for client/server rendering differences
- **Supabase connection**: Ensure .env.local has correct URL and keys

### When Stuck
- Re-read the relevant section of SETTINGS_SPEC.md or DATA_MODEL.md
- Check the Supabase logs for query errors
- Use `console.log` in server actions to debug data flow
