# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-05-25
- Primary product surfaces: `/login`, `/projects`, `/expenses`, `/settings`
- Evidence reviewed: `product-reference/DESIGN.md`, `product-reference/login.html`, `product-reference/projects.html`, `product-reference/expenses.html`, `product-reference/settings.html`, current Next app routes and components

## Brand
- Personality: quiet Korean SaaS admin tool, dense, calm, operations-first
- Trust signals: clear status language, visible review reasons, explicit export exclusions, restrained near-black primary actions
- Avoid: marketing hero pages, decorative gradients, fake metrics, nested cards, exposing internal auth architecture on the login screen

## Product goals
- Goals: reduce spreadsheet manual work, keep human review in risky AI decisions, generate institution-ready Excel files
- Non-goals: OCR-first positioning, Kakao support in MVP, automatic final approval
- Success signals: admins can identify the next risky item, approve or reject with context, and export only approved expenses

## Personas and jobs
- Primary personas: club or event finance admin, operating team demo reviewer
- User jobs: create project, map Slack channel, review risky expenses, confirm settings, generate Excel
- Key contexts of use: repeated desktop admin review, quick mobile status checks, internal product demonstration

## Information architecture
- Primary navigation: Projects, Expenses, Settings after login
- Core routes/screens: login-only entry, project overview, expense review workspace, export/settings control
- Content hierarchy: risk and next action first, supporting details second, background explanation last

## Design principles
- Principle 1: Login is only for logging in; no work signals, auth architecture explanation, or alternate browsing path.
- Principle 2: Put risk signals next to editable fields and final actions.
- Principle 3: Prefer recognition over recall with ordered priority strips and concrete CTA labels.
- Tradeoffs: desktop can carry service context; mobile should keep the first view focused on login or the current task.

## Visual language
- Color: neutral white/zinc base, near-black primary, emerald success, amber review, red missing evidence, blue processing, violet only secondary export state
- Typography: Korean UI sans stack with Pretendard preferred and Noto Sans KR bundled fallback; tabular numerics for money and counts
- Spacing/layout rhythm: dense but scannable, 8-16px gaps, 40px+ controls
- Shape/radius/elevation: 8-10px radius, thin borders, restrained shadow only on panels
- Motion: short feedback only for sync pulses and toast-like transitions
- Imagery/iconography: no decorative imagery; product data and states carry the interface

## Components
- Existing components to reuse: Button, form controls, FormField, SummaryCard, route layouts, React Query hooks
- New/changed components: BudgetFlow UI primitives for brand mark, panels, page headers, status badges, priority strips, progress bars, and section toolbars
- Variants and states: processing, review, approved, rejected, missing, exported
- Token/component ownership: `src/app/globals.css`, `src/components/budgetflow-ui.tsx`, route-level client components

## Accessibility
- Target standard: practical WCAG AA contrast and keyboard access
- Keyboard/focus behavior: forms, nav, filters, expense rows/cards, review actions remain keyboard-operable
- Contrast/readability: status colors are paired with text labels
- Screen-reader semantics: route nav, form labels, aria labels on major regions
- Reduced motion and sensory considerations: no required motion or auto-advancing content

## Responsive behavior
- Supported breakpoints/devices: desktop admin workspace, tablet single-column fallback, mobile 360px+
- Layout adaptations: login hides service intro on mobile; expenses use cards on mobile; bottom tabs appear on mobile
- Touch/hover differences: mobile uses larger bottom tabs and full-width primary CTAs where appropriate

## Interaction states
- Loading: query loading text and refresh spinner/pulse
- Empty: tables/lists state when selected filters produce no results; export area explains when no file exists
- Error: login and form validation inline; mutation errors close to the relevant action
- Success: status badges and generated export rows confirm result
- Disabled: pending buttons disable while mutations run
- Offline/slow network, if applicable: not modeled in this prototype

## Content voice
- Tone: direct, operational, Korean admin product copy
- Terminology: 검토 필요, 승인 완료, 반려, 증빙 없음, 양식 확정, 엑셀 생성
- Microcopy rules: action labels name the immediate result, not generic confirmation

## Implementation constraints
- Framework/styling system: Next.js App Router, React client components where hooks are required, Tailwind CSS v4, lucide-react icons
- Design-token constraints: maintain neutral/status token system and avoid broad new design-system dependencies
- Performance constraints: no heavy assets or decorative libraries
- Compatibility constraints: responsive pages must render without horizontal scroll at mobile widths
- Test/screenshot expectations: run lint, unit tests, production build, and smoke render important routes after substantial edits

## Open questions
- [ ] Whether final production login should show SSO providers after the demo phase / owner: product / impact: login IA
