# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-05-25
- Primary product surfaces: `/login`, `/projects`, `/expenses`, `/settings`
- Evidence reviewed: `login.html`, `projects.html`, `expenses.html`, `settings.html`, `css/budgetflow.css`, `js/budgetflow.js`, user BudgetFlow brief

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
- Typography: Pretendard for UI and display, tabular numerics for money and counts
- Spacing/layout rhythm: dense but scannable, 8-16px gaps, 40px+ controls
- Shape/radius/elevation: 8-10px radius, thin borders, restrained shadow only on panels
- Motion: short feedback only for sync pulses and toast transitions
- Imagery/iconography: no decorative imagery; product data and states carry the interface

## Components
- Existing components to reuse: `.btn`, `.input`, `.select`, `.textarea`, `.label`, `.panel`, `.panel-pad`, `.panel-header`, `.card`, `.stat-card`, `.status`, `.badge`, `.grid`, `.section-block`, `.section-content`, `.helper-text`, `.priority-strip`, `.table-wrap`, `.review-pane`, `.bottom-tabs`
- New/changed components: reusable spacing tokens `--component-pad`, `--component-gap`, `--row-gap`; reusable row/card primitives `.project-row`, `.expense-card`, `.category-row`, `.keyword-row`, `.mapping-row`, `.export-row`; service points on desktop login; priority strips on project/expense pages; checklist list in settings
- Variants and states: processing, review, approved, rejected, missing, exported
- Token/component ownership: `css/budgetflow.css`

## Accessibility
- Target standard: practical WCAG AA contrast and keyboard access
- Keyboard/focus behavior: forms and expense rows must remain keyboard-operable
- Contrast/readability: status colors always paired with text labels
- Screen-reader semantics: route nav, form labels, and aria labels on major regions
- Reduced motion and sensory considerations: no required motion or auto-advancing content

## Responsive behavior
- Supported breakpoints/devices: desktop admin workspace, tablet single-column fallback, mobile 360px+
- Layout adaptations: login hides service intro on mobile; expenses swap table for cards; bottom tabs appear on mobile
- Touch/hover differences: mobile uses 50px login CTA and 64px bottom tabs

## Interaction states
- Loading: Slack sync pulse and last-updated text
- Empty: export area says no file generated yet
- Error: login validates email and password before route change
- Success: toasts confirm save, approve, reject, export, and login
- Disabled: not currently modeled; future export/download buttons should disable until preconditions pass
- Offline/slow network: not modeled in this prototype

## Content voice
- Tone: direct, operational, Korean admin product copy
- Terminology: 검토 필요, 승인 완료, 반려, 증빙 없음, 양식 확정, 엑셀 생성
- Microcopy rules: action labels must name the immediate result, not generic "확인" unless confirmation is the result

## Implementation constraints
- Framework/styling system: plain HTML/CSS/JS
- Design-token constraints: maintain current neutral/status token system in `css/budgetflow.css`
- Performance constraints: no heavy assets or decorative libraries
- Compatibility constraints: responsive HTML must render inside Open Design preview and mobile widths without horizontal scroll
- Test/screenshot expectations: syntax check JS and render `/login`, `/projects`, `/expenses`, `/settings` at desktop and mobile widths after substantial edits

## Open questions
- [ ] Whether final production login should show SSO providers after the demo phase / owner: product / impact: login IA
