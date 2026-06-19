## ADDED Requirements

### Requirement: Variable-driven dark surface colors

The system SHALL provide dark-mode surface and border colors for shared, variable-driven components (`.glass-card`, `.glass`, `body`, and Tailwind `@theme inline` utilities such as `bg-card` and `border`) through `html.dark` overrides of the existing CSS custom properties in `globals.css`. These components MUST NOT depend on carpet-bombing `!important` structural rules to obtain their dark background.

#### Scenario: Glass card renders dark without structural override

- **WHEN** dark mode is active and a `.glass-card` element is rendered
- **THEN** its background resolves to the dark `--card-bg` value (slate-900) via the `html.dark` variable override, with no `[class*="card"]` `!important` rule required

#### Scenario: Surface colors stay visually consistent with prior behavior

- **WHEN** the `html.dark` variable overrides are added while the structural rules still exist
- **THEN** the rendered dark-mode surface and border colors match the colors previously produced by `dark-theme.css`, so adding the variables causes zero visual change

### Requirement: Removal of wildcard structural background overrides

The system SHALL remove the wildcard substring structural background rules `html.dark [class*="card"]`, `[class*="Card"]`, `[class*="panel"]`, `[class*="Panel"]`, `[class*="section"]`, and `[class*="Section"]` from `dark-theme.css` once the corresponding surfaces obtain their dark background from variables or component-level `dark:` variants. Each removal SHALL be preceded by confirmation that no targeted surface regresses to a light background (先補後刪).

#### Scenario: Wildcard card/panel/section rules are gone

- **WHEN** the migration is complete and `dark-theme.css` is searched
- **THEN** it contains none of the six `[class*="card/Card/panel/Panel/section/Section"]` background rules

#### Scenario: No light-background regression after removal

- **WHEN** dark mode is active after the wildcard rules are removed and each listed page is swept (`/cases`, `/cases/[id]`, `/investment`, `/investment/sectors`, `/investment/[etf]`, `/investment/strategy`, `/investment/equity`, `/knowledge`, `/login`, `/calculator`, `/notes`)
- **THEN** every card, panel, and container retains a dark background with no white or light-background breakage

### Requirement: Inline and arbitrary colored components are never hijacked

The system SHALL preserve the colors of components that carry an inline or arbitrary background/text color in dark mode. The variable-driven approach and the remaining narrowed safety-net rules MUST NOT override a component's intentional inline color.

#### Scenario: Theme heatmap tiles keep their own colors

- **WHEN** dark mode is active and the `/investment/sectors` theme view is rendered
- **THEN** each theme tile displays its own inline theme color rather than being collapsed to a uniform dark gray, in both light and dark mode

### Requirement: Narrowed named safety-net for unhandled surfaces

The system SHALL retain `.bg-white`, `.bg-slate-50` through `.bg-slate-300`, and `.bg-gray-50` through `.bg-gray-300` (with their existing `:not([style*="background"])` exemption) as a named dark safety-net for surfaces that do not explicitly declare a dark background, while removing wildcard substring matches such as `[class*="bg-slate-50/"]`.

#### Scenario: Named utilities still provide dark fallback

- **WHEN** dark mode is active and an element uses `.bg-white` without an inline background and without an explicit `dark:` background
- **THEN** it still receives the dark safety-net background, while elements matched only by the removed wildcard substring no longer rely on it
